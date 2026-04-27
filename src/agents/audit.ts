// Unified audit runner — consolidates every QA signal the app already computes
// (rule-based, multi-lens SME, numerical diversity, grade profile, scenario ratio,
// image ratio) into one typed AuditReport per question + a small set-level flag
// list. Consumed by the Bank / Audit view to render color-coded results and by
// the regenerate-with-feedback loop to turn flags into prompt constraints.
//
// No new logic is invented here. Every check is already in the codebase; this
// module normalizes their outputs into one shape and decides per-question
// overall severity = worst(pass|warn|fail).

import { runRuleBasedQA, checkNumericalDiversity } from './ruleBasedQA';
import type { QAFlag as RuleFlag } from './ruleBasedQA';
import { evaluateQuestionQuality } from './multiPerspective';
import { getImageRatioForGrade } from './prompts';

// ─── Public types ────────────────────────────────────────────────────

export type AuditSeverity = 'pass' | 'warn' | 'fail';

export type AuditCategory =
  | 'rule'                  // rule-based (formatting, content, distractor hygiene, quality)
  | 'factual'               // SME factual lens
  | 'pedagogical'           // SME pedagogical lens
  | 'language'              // SME language lens + localization (UK spelling)
  | 'terminology'           // SME 4th lens — chapter-aligned term check
  | 'grade'                 // matches grade-profile / concrete-lock
  | 'scenario'              // R1/U1 scenario-opener ban (per-question) + set ratio (set)
  | 'diversity'             // numerical diversity Jaccard (set)
  | 'image'                 // set-level image-ratio floor (set)
  | 'alignment'             // LO keyword overlap, duplicates
  | 'distractor_source'     // F1: every wrong option must trace to a misconception_id or typed reasoning_error
  | 'misconception_coverage'// F1: question must claim a misconception_id_targeted; set-level no duplicate per cell
  | 'rationale_hygiene'     // F1: rationale references the misconception, no author meta
  | 'answer_leak'           // F2: stem leaks the defining word(s) of the correct answer
  | 'image_material'        // F5: image-driven question hinges on a tactile/material property
  | 'edge_case_coverage';   // F4: set-level — too few items hit edge/boundary cases

export interface AuditFlag {
  category: AuditCategory;
  severity: AuditSeverity;
  message: string;
  /** Human-facing hint the regen prompt can use as an EXTRA CONSTRAINT. */
  fix?: string;
}

export interface AuditReport {
  questionId: string;
  severity: AuditSeverity;
  flags: AuditFlag[];
  /** SME overall 0-100 when available. */
  score?: number;
}

export interface AuditResult {
  perQuestion: AuditReport[];
  /** Set-level flags that don't bind to a single question
   * (scenario ratio, numerical diversity, image ratio floor). */
  setFlags: AuditFlag[];
}

export interface RunFullAuditOpts {
  lo: string;
  skill: string;
  metadata: any;
  /** GRADE_PROFILE from GradeScopeAgent. Drives `grade` category checks. */
  profile?: any;
  chapterContent?: string;
  boardProfile?: 'cbse' | 'state';
  /** Pass pre-computed SME results to skip the (expensive) parallel SME calls. */
  cachedSmeResults?: Record<string, any>;
  /** Progress ping so the UI can render "n/total" while auditing. */
  onProgress?: (done: number, total: number) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────

const SCENARIO_OPENER_RE =
  /^\s*(?:Riya|Kabir|Meera|Aarav|Aditi|Rohan|Priya|Sneha|A\s+student|A\s+teacher|A\s+doctor|A\s+farmer|Consider|Imagine|Suppose|In\s+a\s+|An?\s+\w+\s+is\s+|On\s+a\s+|During\s+a\s+)/i;

/** Symbolic-math heuristic — catches "P_1 + P_2 = T", "let x = ..." etc. */
const SYMBOLIC_STEM_RE = /\b[A-Z]_\d+|let\s+[a-z]\s*=|\b[a-z]\s*=\s*[\d.]+\s*[+\-×÷*/]/i;

const ruleCategoryToAudit = (c: RuleFlag['category']): AuditCategory => {
  if (c === 'localization') return 'language';
  if (c === 'alignment') return 'alignment';
  // F1/F2/F5 categories pass through to the audit unchanged.
  if (c === 'distractor_source') return 'distractor_source';
  if (c === 'misconception_coverage') return 'misconception_coverage';
  if (c === 'rationale_hygiene') return 'rationale_hygiene';
  if (c === 'answer_leak') return 'answer_leak';
  if (c === 'image_material') return 'image_material';
  return 'rule';
};

const ruleSeverityToAudit = (s: RuleFlag['severity']): AuditSeverity => {
  if (s === 'critical') return 'fail';
  if (s === 'major') return 'warn';
  return 'pass'; // minors don't surface as flags in the audit view
};

const worst = (severities: AuditSeverity[]): AuditSeverity =>
  severities.includes('fail') ? 'fail'
  : severities.includes('warn') ? 'warn'
  : 'pass';

// ─── Main runner ─────────────────────────────────────────────────────

export async function runFullAudit(
  questions: any[],
  opts: RunFullAuditOpts
): Promise<AuditResult> {
  if (!questions || questions.length === 0) {
    return { perQuestion: [], setFlags: [] };
  }

  const total = questions.length;
  opts.onProgress?.(0, total);

  // 1) Rule-based checks (instant, no API).
  const ruleResults = runRuleBasedQA(questions, opts.lo, opts.boardProfile || 'cbse');

  // 2) SME multi-lens — run in parallel unless cached results were provided.
  const smeResults: Array<any | null> = await Promise.all(
    questions.map(async (q, i) => {
      const qId = q.id || q.question_id;
      if (opts.cachedSmeResults && opts.cachedSmeResults[qId]) {
        return opts.cachedSmeResults[qId];
      }
      try {
        const r = await evaluateQuestionQuality(
          q,
          opts.metadata?.subjectCode || '',
          String(opts.metadata?.gradeCode || ''),
          opts.lo,
          opts.chapterContent,
        );
        opts.onProgress?.(i + 1, total);
        return r;
      } catch {
        opts.onProgress?.(i + 1, total);
        return null;
      }
    }),
  );

  // 3) Build per-question reports.
  const perQuestion: AuditReport[] = questions.map((q, i) => {
    const qId = q.id || q.question_id;
    const flags: AuditFlag[] = [];

    // Rule-based → audit flags (skip minors).
    const rr = ruleResults.find(r => r.question_id === qId);
    (rr?.flags || []).forEach((f: RuleFlag) => {
      const sev = ruleSeverityToAudit(f.severity);
      if (sev === 'pass') return;
      flags.push({
        category: ruleCategoryToAudit(f.category),
        severity: sev,
        message: f.message,
      });
    });

    // SME perspectives → audit flags.
    const sme = smeResults[i];
    if (sme && Array.isArray(sme.perspectives)) {
      sme.perspectives.forEach((p: any) => {
        const lens = String(p.lens || '').toLowerCase();
        const cat: AuditCategory =
          lens.includes('factual') ? 'factual'
          : lens.includes('pedagog') ? 'pedagogical'
          : lens.includes('language') ? 'language'
          : lens.includes('terminolog') ? 'terminology'
          : 'rule';
        const score = typeof p.score === 'number' ? p.score : (p.pass ? 80 : 40);
        const sev: AuditSeverity = score < 30 ? 'fail' : score < 60 ? 'warn' : 'pass';
        if (sev === 'pass') return;
        (p.issues || []).forEach((raw: string) => {
          // Perspectives already prefix issues with [Lens]; strip for display.
          const msg = String(raw).replace(/^\[[^\]]+\]\s*/, '');
          flags.push({ category: cat, severity: sev, message: msg });
        });
      });
    }

    // Per-question scenario check (R1/U1 only).
    const cell = q.cell || q.cg_cell;
    if ((cell === 'R1' || cell === 'U1') && SCENARIO_OPENER_RE.test(q.stem || '')) {
      flags.push({
        category: 'scenario',
        severity: 'warn',
        message: 'Stem opens with a scenario; R1/U1 should be direct questions.',
        fix: 'Rewrite as a direct question or one-sentence statement. Do not use character names or "Consider/Imagine/Suppose".',
      });
    }

    // Grade — concrete_lock violation (symbolic stem when the profile locked concrete).
    if (opts.profile?.concrete_lock && SYMBOLIC_STEM_RE.test(q.stem || '')) {
      flags.push({
        category: 'grade',
        severity: 'fail',
        message: 'concrete_lock is active but the stem uses symbolic/variable form.',
        fix: 'Rewrite with concrete numbers in a real-world context. No P_1, x, "let X = ...".',
      });
    }

    // Grade — stem-cap words.
    const cap = opts.profile?.stem_cap_words;
    if (typeof cap === 'number' && cap > 0) {
      const wc = String(q.stem || '').trim().split(/\s+/).filter(Boolean).length;
      if (wc > cap + 5) {
        flags.push({
          category: 'grade',
          severity: 'warn',
          message: `Stem is ${wc} words; grade profile caps at ${cap}.`,
          fix: `Trim stem to ≤ ${cap} words.`,
        });
      }
    }

    // Grade — out-of-scope concept name appears in stem.
    if (Array.isArray(opts.profile?.out_of_scope)) {
      const stemLower = String(q.stem || '').toLowerCase();
      (opts.profile.out_of_scope as string[]).forEach(term => {
        const t = String(term).toLowerCase().trim();
        if (t.length >= 4 && stemLower.includes(t)) {
          flags.push({
            category: 'grade',
            severity: 'fail',
            message: `Out-of-scope concept in stem: "${term}".`,
            fix: `Remove "${term}" and stay within the grade profile's in_scope topics.`,
          });
        }
      });
    }

    return {
      questionId: qId,
      severity: worst(flags.map(f => f.severity)),
      flags,
      score: sme?.overallScore,
    };
  });

  // 4) Set-level flags — numerical diversity, scenario ratio, image ratio.
  const setFlags: AuditFlag[] = [];

  try {
    const diag = checkNumericalDiversity(questions);
    if (diag.length > 0) {
      setFlags.push({
        category: 'diversity',
        severity: 'warn',
        message: `Numerical-diversity check: ${diag.join(' | ')}`,
      });
    }
  } catch { /* optional */ }

  const scenarioCount = questions.filter(q => SCENARIO_OPENER_RE.test(q.stem || '')).length;
  const scenarioPct = (scenarioCount / total) * 100;
  if (scenarioPct > 40) {
    setFlags.push({
      category: 'scenario',
      severity: 'warn',
      message: `Scenario-opener ratio ${scenarioPct.toFixed(0)}% exceeds 40% target.`,
    });
  }

  const imagesFlagged = questions.filter(q => q.needs_image).length;
  const imagePct = (imagesFlagged / total) * 100;
  const target = getImageRatioForGrade(opts.metadata?.gradeCode);
  if (imagePct < target.minPct) {
    setFlags.push({
      category: 'image',
      severity: 'warn',
      message: `Visual ratio ${imagePct.toFixed(0)}% below target ${target.minPct}% for this grade.`,
      fix: 'Regenerate some text-only questions with needs_image=true, or flip visualisable ones.',
    });
  }

  // F1 (set-level): no two questions in the SAME cell may target the same
  // misconception_id. Cross-cell duplicates are allowed because they probe
  // different cognitive levels of the same misconception.
  const perCellMisconceptions = new Map<string, Map<string, string[]>>();
  for (const q of questions) {
    const cell = q.cell || q.cg_cell;
    const id = typeof q.misconception_id_targeted === 'string' ? q.misconception_id_targeted.trim() : '';
    if (!cell || !id) continue;
    if (!perCellMisconceptions.has(cell)) perCellMisconceptions.set(cell, new Map());
    const cellMap = perCellMisconceptions.get(cell)!;
    if (!cellMap.has(id)) cellMap.set(id, []);
    cellMap.get(id)!.push(q.id || q.question_id);
  }
  perCellMisconceptions.forEach((idMap, cell) => {
    idMap.forEach((qIds, id) => {
      if (qIds.length > 1) {
        setFlags.push({
          category: 'misconception_coverage',
          severity: 'warn',
          message: `Cell ${cell} has ${qIds.length} questions targeting the same misconception "${id}" (${qIds.join(', ')}). One probe per misconception per cell.`,
          fix: 'Regenerate the duplicates so each picks a different misconception_id from the approved list.',
        });
      }
    });
  });

  // F4 (set-level): edge-case coverage. Warn if fewer than 20% of items
  // reference a content point flagged as edge-case during ContentScoping.
  // We use q.edge_case_flag (set by the orchestrator at generation time)
  // as the signal. Skip the check entirely when no question carries the
  // flag — that means the upstream pipeline didn't surface any edge cases
  // (likely a domain with no documented boundaries) and the warn would
  // otherwise fire spuriously.
  const anyFlagged = questions.some(q => q.edge_case_flag === true);
  if (anyFlagged) {
    const edgeHits = questions.filter(q => q.edge_case_flag === true).length;
    const pct = (edgeHits / total) * 100;
    if (pct < 20) {
      setFlags.push({
        category: 'edge_case_coverage',
        severity: 'warn',
        message: `Only ${pct.toFixed(0)}% of items hit an edge/boundary case (target ≥20%).`,
        fix: 'Regenerate ~20-30% of items to use the edge-case content points (e.g., banana / sugarcane / bamboo for plant taxonomy).',
      });
    }
  }

  return { perQuestion, setFlags };
}

// ─── Regenerate-with-feedback helper ─────────────────────────────────

/**
 * Synthesize a concise "EXTRA CONSTRAINT" block from an AuditReport for a
 * single question. Caps to the top 5 flags so the prompt stays tight.
 */
export function auditFlagsToExtraNote(report: AuditReport | undefined): string {
  if (!report || report.flags.length === 0) return '';
  const byPriority: AuditSeverity[] = ['fail', 'warn', 'pass'];
  const sorted = [...report.flags].sort(
    (a, b) => byPriority.indexOf(a.severity) - byPriority.indexOf(b.severity),
  );
  const top = sorted.slice(0, 5);
  const lines = top.map(f => {
    const fix = f.fix ? ` → ${f.fix}` : '';
    return `- ${f.category}: ${f.message}${fix}`;
  });
  return `AUDIT FINDINGS — fix ALL of these in the regenerated question:\n${lines.join('\n')}`;
}
