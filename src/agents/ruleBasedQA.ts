/**
 * Rule-Based QA Engine — comprehensive heuristic checks
 * Based on: Haladyna-Downing (2002), ETS Standards (2014), Rodriguez (2005)
 *
 * Run INSTANTLY (no API calls) against every question.
 * User triggers this explicitly via "Run QA" button.
 */

export interface QAFlag {
  rule: string;
  category: 'formatting' | 'content' | 'quality' | 'distractor' | 'localization' | 'alignment'
    | 'distractor_source'      // Stage F1: every wrong option must trace to a misconception_id or typed reasoning_error
    | 'misconception_coverage' // Stage F1: question must claim a misconception_id_targeted
    | 'rationale_hygiene'      // Stage F1: rationale only uses facts from stem/options/chapter; references the misconception
    | 'answer_leak'            // Stage F2: stem must not contain defining word(s) of the correct answer
    | 'image_material';        // Stage F5: image cannot carry tactile/material-property classification weight
  severity: 'critical' | 'major' | 'minor';
  message: string;
  field: string;
}

export interface RuleQAResult {
  question_id: string;
  pass: boolean;
  flags: QAFlag[];
}

// === SHARED TEXT HELPERS ===
// Lifted to module scope (previously inline in checkAnswerLeak / checkNumericalDiversity)
// so the cross-question checks below reuse the SAME tokenisation and morphology.

// Drop trailing English suffixes to expose a word's root. Order matters — strip the
// longest suffixes first ("vegetative" → "vegetativ", not "vegetat").
const LEAK_SUFFIXES = ['ically','ation','ition','ative','tions','ities','ical','ment','ness','ful','ing','ied','ies','tion','sion','est','ed','en','es','er','ly','al','y','s'];
function rootWord(w: string): string {
  const lw = w.toLowerCase();
  for (const suf of LEAK_SUFFIXES) {
    if (lw.length - suf.length >= 3 && lw.endsWith(suf)) return lw.slice(0, lw.length - suf.length);
  }
  return lw;
}

const LEAK_STOP = new Set(['the','a','an','of','to','in','is','are','it','this','that','and','or','for','on','with','as','by','be','was','were','at','from','one','two','three']);
function tokeniseLeak(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w: string) => w.length > 3 && !LEAK_STOP.has(w));
}

const DIV_STOP = new Set(['the','a','an','of','is','are','was','were','be','to','in','on','at','and','or','if','then','for','with','by','as','from','this','that','it']);
function tokenizeDiv(s: string): Set<string> {
  return new Set(
    s.toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !DIV_STOP.has(w))
  );
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach(w => { if (b.has(w)) inter++; });
  return inter / (a.size + b.size - inter);
}

// === ASSERTION-REASON DETECTOR (shared) ===
// A&R items are emitted organically (not a declared `type`). Detect by the A/R text
// shape AND relationship-style options so a generic MCQ that merely says "true" won't
// match. Used to (a) carve A&R out of the distractor-source / answer-leak checks
// (its relationship options aren't misconception-traced distractors) and (b) drive
// the set-level answer-key-distribution check in audit.ts.
export function looksLikeAssertionReason(q: any): boolean {
  const stem = (q?.stem || '').toString();
  const hasAR = /\bassertion\b[\s\S]*\breason\b/i.test(stem) || /\bA\s*[:.)\-].*\bR\s*[:.)\-]/.test(stem);
  const opts = (Array.isArray(q?.options) ? q.options : [])
    .map((o: any) => (typeof o === 'string' ? o : o?.text || '').toLowerCase());
  const relOpt = opts.some((t: string) =>
    /both .*true/.test(t) || /correct explanation/.test(t) || /(assertion|reason).*(true|false)/.test(t));
  return hasAR && relOpt;
}

// === TERMINAL PUNCTUATION (interrogative stems must end with "?") ===
// Only the FINAL sentence is examined — context sentences legitimately end with
// ".". Imperative stems ("Choose…", "Arrange…", "Match…") and true/false
// statements don't open with an interrogative, so they are left alone, as are
// fill-blank stems (## / _____) whose blank may sit mid-sentence.
const INTERROGATIVE_OPENER_RE = /^(which|what|who|whose|whom|when|where|why|how|is|are|was|were|do|does|did|can|will|should)\b/i;
function interrogativeWithoutQuestionMark(stem: string): boolean {
  const s = (stem || '').trim();
  if (!s || s.endsWith('?') || s.includes('##') || s.includes('_____')) return false;
  const parts = s.split(/[.!?]+["')\]]*\s+/);
  const last = (parts[parts.length - 1] || '').trim();
  return INTERROGATIVE_OPENER_RE.test(last);
}
// Deterministic repair for the above — swap a trailing "." for "?" or append a
// missing "?". Returns the stem unchanged when no interrogative is detected.
export function fixTerminalPunctuation(stem: string): string {
  if (!interrogativeWithoutQuestionMark(stem)) return stem;
  const s = stem.trim();
  if (/[.!]+$/.test(s)) return s.replace(/[.!]+$/, '?');
  return s + '?';
}

// === FORMATTING & TYPOGRAPHY ===
function checkFormatting(stem: string, options: any[]): QAFlag[] {
  const flags: QAFlag[] = [];

  // Capitalization
  if (stem && /^[a-z]/.test(stem.trim())) {
    flags.push({ rule: 'capitalization', category: 'formatting', severity: 'minor', message: 'Question starts with a lowercase letter.', field: 'stem' });
  }

  // Punctuation spacing
  if (/\s[,\.\?\!;:]/.test(stem)) {
    flags.push({ rule: 'punctuation_spacing', category: 'formatting', severity: 'minor', message: 'Incorrect space before punctuation mark.', field: 'stem' });
  }

  // Double spaces
  if (/  /.test(stem)) {
    flags.push({ rule: 'double_space', category: 'formatting', severity: 'minor', message: 'Double space detected.', field: 'stem' });
  }

  // FIB: single underscore
  if (stem.includes('_') && !stem.includes('_____') && !stem.includes('##')) {
    flags.push({ rule: 'fib_format', category: 'formatting', severity: 'major', message: 'Use _____ (5+) or ##answer## for blanks, not single _.', field: 'stem' });
  }

  // Interrogative stem not ending with "?" — normally auto-repaired by
  // fixTerminalPunctuation during generation; this flags SME-edited stems.
  if (interrogativeWithoutQuestionMark(stem)) {
    flags.push({ rule: 'missing_question_mark', category: 'formatting', severity: 'minor', message: 'Interrogative stem does not end with a question mark.', field: 'stem' });
  }

  // Stem too long (>150 chars) — readability concern
  if (stem.length > 150) {
    flags.push({ rule: 'long_stem', category: 'formatting', severity: 'minor', message: `Stem is ${stem.length} chars. Consider simplifying (<150 recommended).`, field: 'stem' });
  }

  // Option formatting
  options.forEach((opt: any, i: number) => {
    const text = typeof opt === 'string' ? opt : opt.text || '';
    if (/  /.test(text)) {
      flags.push({ rule: 'double_space', category: 'formatting', severity: 'minor', message: 'Double space in option.', field: `option_${String.fromCharCode(65 + i)}` });
    }
  });

  return flags;
}

// === CONTENT & PHRASING ===
function checkContent(stem: string): QAFlag[] {
  const flags: QAFlag[] = [];

  // Negative phrasing [Haladyna Rule 10]
  if (/\b(not|never|except|incorrect|false|isn't|aren't|doesn't|don't|cannot|won't)\b/i.test(stem)) {
    flags.push({ rule: 'negative_phrasing', category: 'content', severity: 'major', message: 'Negative phrasing detected (Haladyna Rule 10). Consider rephrasing positively.', field: 'stem' });
  }

  // Positional references (break in digital shuffle)
  if (/\b(above|below|following|shown below|as shown|in the figure|in the diagram)\b/i.test(stem)) {
    flags.push({ rule: 'positional_reference', category: 'content', severity: 'major', message: 'Positional reference (above/below/following) breaks in shuffled digital assessments.', field: 'stem' });
  }

  // "Which of the following is true/false" [Haladyna Rule 5]
  if (/which of the following (is|are)\s+(true|false|correct|incorrect)/i.test(stem)) {
    flags.push({ rule: 'vague_stem', category: 'content', severity: 'major', message: '"Which of the following is true/false?" is too vague (Haladyna Rule 5). Ask a specific question.', field: 'stem' });
  }

  // Filler phrasing — the state-board register (now the default for all
  // boards) bans empty connective padding like "ensure the essential first
  // step". Each listed phrase deletes cleanly without losing meaning.
  const fillerMatch = stem.match(/\b(in the context of|with respect to|in order to|it is (?:important|essential) to|the essential first step|first and foremost)\b/i);
  if (fillerMatch) {
    flags.push({ rule: 'filler_phrase', category: 'content', severity: 'major', message: `Filler phrasing ("${fillerMatch[0]}") — write the stem short and direct, state-board style.`, field: 'stem' });
  }

  // Open-ended importance/role/significance stem — invites an essay, not a selection.
  // Requires BOTH a "why…" opener AND an importance adjective before the "?", so
  // "Why is a tomato classified as a fruit?" does NOT fire (legitimate U1 framing).
  const openImportanceRe = /\b(why is|why are|why was|why does|why do)\b[^?]*\b(important|significant|necessary|essential|useful|matters?)\b/i;
  const openRoleRe = /\b(what is|what are|what's)\b[^?]*\b(importance|significance|role|purpose|value|benefit|need)\s+of\b/i;
  if (openImportanceRe.test(stem) || openRoleRe.test(stem)) {
    flags.push({ rule: 'open_importance_stem', category: 'content', severity: 'major', message: 'Open-ended importance/role stem invites an essay. Reframe to "Which statement best explains the importance/role of X?".', field: 'stem' });
  }

  return flags;
}

// === QUALITY CONTROL & HYGIENE ===
function checkQuality(stem: string, options: any[], profile: 'cbse' | 'state' = 'cbse'): QAFlag[] {
  const flags: QAFlag[] = [];

  // Dummy content
  if (/\b(test|dummy|asdf|lorem|ipsum|xxx|placeholder|sample)\b/i.test(stem)) {
    flags.push({ rule: 'dummy_content', category: 'quality', severity: 'critical', message: 'Placeholder/dummy content detected.', field: 'stem' });
  }

  // Too short
  if (stem.trim().length < 10) {
    flags.push({ rule: 'short_stem', category: 'quality', severity: 'critical', message: 'Stem too short (<10 characters).', field: 'stem' });
  }

  // Inappropriate content
  const inappropriate = /\b(kill|murder|blood|shoot|gun|knife|death|die|suicide|bomb|terror|weapon)\b/i;
  if (inappropriate.test(stem)) {
    flags.push({ rule: 'inappropriate', category: 'quality', severity: 'critical', message: 'Potentially inappropriate/violent content.', field: 'stem' });
  }
  options.forEach((opt: any, i: number) => {
    const text = typeof opt === 'string' ? opt : opt.text || '';
    if (inappropriate.test(text)) {
      flags.push({ rule: 'inappropriate', category: 'quality', severity: 'critical', message: 'Inappropriate content in option.', field: `option_${String.fromCharCode(65 + i)}` });
    }
  });

  // Stem word count. The state-board plain-language register (25-word cap,
  // major severity) now applies to ALL boards — SME feedback: CBSE output was
  // unnecessarily wordy compared to the state-board profile. The `profile`
  // parameter is kept for call-site compatibility but no longer varies the cap.
  const wordCount = stem.trim().split(/\s+/).length;
  const cap = 25;
  if (wordCount > cap) {
    flags.push({
      rule: 'high_language_load',
      category: 'quality',
      severity: 'major',
      message: `Stem is ${wordCount} words. Plain-language register: keep under ${cap} (split a long scenario into two short sentences).`,
      field: 'stem',
    });
  }

  return flags;
}

// === DISTRACTOR QUALITY [Haladyna Rules 18-24, Rodriguez 2005] ===
function checkDistractors(options: any[]): QAFlag[] {
  const flags: QAFlag[] = [];
  if (!options || options.length === 0) return flags;

  const texts = options.map((o: any) => (typeof o === 'string' ? o : o.text || '').toLowerCase().trim());

  // Lazy options [Haladyna Rule 24]
  const lazy = ['all of the above', 'none of the above', 'both a and b', 'all the above', 'none of above', 'both (a) and (b)'];
  texts.forEach((t, i) => {
    if (lazy.some(l => t.includes(l))) {
      flags.push({ rule: 'lazy_option', category: 'distractor', severity: 'major', message: `"${t}" is a lazy option (Haladyna Rule 24).`, field: `option_${String.fromCharCode(65 + i)}` });
    }
  });

  // Length variance — correct answer often longest [Haladyna Rule 22]
  const lengths = texts.map(t => t.length).filter(l => l > 0);
  if (lengths.length >= 3) {
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    lengths.forEach((len, i) => {
      if (len > avg * 2.5) {
        flags.push({ rule: 'length_variance', category: 'distractor', severity: 'minor', message: 'Option significantly longer than others — may give away answer.', field: `option_${String.fromCharCode(65 + i)}` });
      }
      if (len < avg * 0.3 && len > 0) {
        flags.push({ rule: 'length_variance', category: 'distractor', severity: 'minor', message: 'Option significantly shorter than others.', field: `option_${String.fromCharCode(65 + i)}` });
      }
    });
  }

  // Duplicate options (exact text)
  const seen = new Set<string>();
  texts.forEach((t, i) => {
    if (t && seen.has(t)) {
      flags.push({ rule: 'duplicate_option', category: 'distractor', severity: 'critical', message: 'Duplicate option detected.', field: `option_${String.fromCharCode(65 + i)}` });
    }
    if (t) seen.add(t);
  });

  // Compound-answer duplicates — same numeric/measurement value appearing in
  // multiple options even when the surrounding prose differs. Caught "Priya;
  // 16.975 metres" vs "Sameer: 16.975 metres" in the U2-7 screenshot — only
  // the name differed, so the question was impossible to answer on maths alone.
  // Extract canonical numeric/unit tokens ("16.975 metres", "10.805 kg", "3.5"),
  // and flag if any token appears in ≥2 options.
  const numericTokenRe = /-?\d+(?:[.,]\d+)?\s*(?:kg|g|mg|m\b|cm|mm|km|ml|l|litre|metres?|meters?|seconds?|minutes?|hours?|%|°c|°f)?/gi;
  const numberCounts: Record<string, number[]> = {};
  texts.forEach((t, i) => {
    const matches = (t.match(numericTokenRe) || []).map(s => s.replace(/\s+/g, ' ').trim().toLowerCase()).filter(Boolean);
    // only care about tokens long enough to be meaningful (skip lone "1" etc.)
    const meaningful = matches.filter(m => m.length >= 3 || /\d\D/.test(m));
    meaningful.forEach(m => {
      (numberCounts[m] ||= []).push(i);
    });
  });
  Object.entries(numberCounts).forEach(([token, optionIdxs]) => {
    if (optionIdxs.length >= 2) {
      optionIdxs.forEach(i => {
        flags.push({
          rule: 'compound_duplicate',
          category: 'distractor',
          severity: 'major',
          message: `Numeric/unit value "${token}" appears in ${optionIdxs.length} options. Differentiator cannot rely on a non-mathematical label alone.`,
          field: `option_${String.fromCharCode(65 + i)}`,
        });
      });
    }
  });

  // Combination options (research: adds test-wiseness, not cognition)
  texts.forEach((t, i) => {
    if (/\b(both\s+[a-d]\s+and\s+[a-d]|options?\s+[ivx]+\s+and\s+[ivx]+|[a-d]\s*,\s*[a-d]\s+and\s+[a-d]|all\s+of\s+these|i\s+and\s+ii|ii\s+and\s+iii)\b/i.test(t)) {
      flags.push({ rule: 'combination_option', category: 'distractor', severity: 'major', message: 'Combination option detected ("Both A and B", "I and III"). Research shows these add test-wiseness, not cognition.', field: `option_${String.fromCharCode(65 + i)}` });
    }
  });

  // Absolute qualifiers in options [Haladyna Rule 11]
  texts.forEach((t, i) => {
    if (/\b(always|never|all|none|every|must|impossible|certainly)\b/i.test(t)) {
      flags.push({ rule: 'absolute_qualifier', category: 'distractor', severity: 'minor', message: 'Absolute qualifier ("always/never/all/none") often signals wrong answer.', field: `option_${String.fromCharCode(65 + i)}` });
    }
  });

  return flags;
}

// === LOCALIZATION & SPELLING ===
function checkLocalization(stem: string, options: any[]): QAFlag[] {
  const flags: QAFlag[] = [];
  const fullText = stem + ' ' + options.map((o: any) => typeof o === 'string' ? o : o.text || '').join(' ');

  // US vs UK English
  const usToUk: Record<string, string> = {
    'color': 'colour', 'center': 'centre', 'organize': 'organise',
    'analyze': 'analyse', 'behavior': 'behaviour', 'flavor': 'flavour',
    'meter': 'metre', 'defense': 'defence', 'recognize': 'recognise',
    'realize': 'realise', 'customize': 'customise', 'favorite': 'favourite',
    'honor': 'honour', 'labor': 'labour', 'neighbor': 'neighbour',
    'mold': 'mould', 'catalog': 'catalogue', 'program': 'programme',
  };

  for (const [us, uk] of Object.entries(usToUk)) {
    if (new RegExp(`\\b${us}\\b`, 'i').test(fullText)) {
      flags.push({ rule: 'us_spelling', category: 'localization', severity: 'major', message: `US spelling "${us}" → use UK "${uk}".`, field: 'stem' });
    }
  }

  return flags;
}

// === ALIGNMENT & DUPLICACY ===
function checkAlignment(stem: string, lo: string, options?: any[]): QAFlag[] {
  const flags: QAFlag[] = [];
  if (!lo) return flags;

  const getKeywords = (text: string) => new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 4)
  );
  const allText = stem + ' ' + (options || []).map((o: any) => typeof o === 'string' ? o : o.text || '').join(' ');
  const qWords = getKeywords(allText);
  const loWords = getKeywords(lo);
  const hits = [...loWords].filter(w => qWords.has(w));

  if (hits.length === 0 && stem.length > 30 && loWords.size > 0) {
    flags.push({ rule: 'low_alignment', category: 'alignment', severity: 'minor', message: `No LO keywords found. Verify alignment with: "${lo.slice(0, 60)}..."`, field: 'stem' });
  }

  return flags;
}

// === STAGE F1 — DISTRACTOR SOURCING ===
// Every wrong option must trace to a misconception_id (from the approved list)
// or a typed reasoning_error. Filler distractors fail this check.
function checkDistractorSource(options: any[]): QAFlag[] {
  const flags: QAFlag[] = [];
  if (!Array.isArray(options) || options.length === 0) return flags;
  options.forEach((opt: any, i: number) => {
    if (typeof opt === 'string' || !opt) return;
    if (opt.correct) return;
    const hasMisconceptionId = typeof opt.misconception_id === 'string' && opt.misconception_id.trim().length > 0;
    const hasReasoningError = typeof opt.reasoning_error === 'string' && opt.reasoning_error.trim().length > 0;
    const hasWhyWrong = typeof opt.why_wrong === 'string' && opt.why_wrong.trim().length > 0;
    if (!hasWhyWrong) {
      flags.push({ rule: 'missing_why_wrong', category: 'distractor_source', severity: 'major',
        message: 'Wrong option has no why_wrong — distractor cannot be diagnostic without one.',
        field: `option_${String.fromCharCode(65 + i)}` });
    }
    if (!hasMisconceptionId && !hasReasoningError) {
      flags.push({ rule: 'untraced_distractor', category: 'distractor_source', severity: 'major',
        message: 'Distractor traces to no misconception_id and no typed reasoning_error — likely filler.',
        field: `option_${String.fromCharCode(65 + i)}` });
    }
  });
  return flags;
}

// === STAGE F1 — MISCONCEPTION COVERAGE (per question) ===
// Question must claim a misconception_id_targeted OR set it to "" with a
// non-empty reasoning_error. Empty both → flag.
function checkMisconceptionCoverage(q: any): QAFlag[] {
  const flags: QAFlag[] = [];
  const id = typeof q.misconception_id_targeted === 'string' ? q.misconception_id_targeted.trim() : '';
  const err = typeof q.misconception_reasoning_error === 'string' ? q.misconception_reasoning_error.trim() : '';
  if (!id && !err) {
    flags.push({ rule: 'no_misconception_claim', category: 'misconception_coverage', severity: 'major',
      message: 'Question does not declare a misconception_id_targeted or a reasoning_error — cannot verify what student error it probes.',
      field: 'misconception_id_targeted' });
  }
  return flags;
}

// === STAGE F1 — RATIONALE HYGIENE ===
// Rationale must (a) reference an idea present in stem/options/chapter,
// and (b) acknowledge the misconception the wrong-option-picker held.
// Heuristic: rationale should overlap with stem/options OR mention the
// misconception_reasoning_error / misconception_id_targeted text. It must NOT
// contain author meta-commentary phrases.
function checkRationaleHygiene(q: any): QAFlag[] {
  const flags: QAFlag[] = [];
  const rationale = typeof q.rationale === 'string' ? q.rationale : '';
  if (!rationale) return flags;
  const lower = rationale.toLowerCase();

  // Author meta-commentary leaks
  const metaPhrases = [
    'higher grades', 'higher class', 'beyond this grade', 'beyond the syllabus',
    'curriculum-design', 'as a curriculum', 'though that\'s an exception',
    'note to teacher', 'pedagogically speaking',
  ];
  for (const p of metaPhrases) {
    if (lower.includes(p)) {
      flags.push({ rule: 'author_meta_in_rationale', category: 'rationale_hygiene', severity: 'major',
        message: `Rationale contains author meta-commentary ("${p}") — student-facing only.`, field: 'rationale' });
      break;
    }
  }

  // No misconception reference
  const err = typeof q.misconception_reasoning_error === 'string' ? q.misconception_reasoning_error.toLowerCase() : '';
  const id = typeof q.misconception_id_targeted === 'string' ? q.misconception_id_targeted.toLowerCase() : '';
  const refsMisconception = (err && err.length > 5 && lower.includes(err.split(/\s+/).slice(0, 3).join(' ')))
    || (id && lower.includes(id));
  // OR: rationale touches one of the why_wrong reasonings
  const options = Array.isArray(q.options) ? q.options : [];
  const refsWhyWrong = options.some((opt: any) => {
    if (!opt || opt.correct) return false;
    const ww = typeof opt.why_wrong === 'string' ? opt.why_wrong.toLowerCase() : '';
    if (!ww || ww.length < 8) return false;
    const firstSig = ww.split(/[\s,.]/).filter((w: string) => w.length > 4).slice(0, 2).join(' ');
    return firstSig && lower.includes(firstSig);
  });
  if (rationale.length > 30 && !refsMisconception && !refsWhyWrong && options.some((o: any) => o && !o.correct && o.why_wrong)) {
    flags.push({ rule: 'rationale_no_misconception', category: 'rationale_hygiene', severity: 'minor',
      message: 'Rationale does not reference the misconception held by wrong-option-pickers.', field: 'rationale' });
  }

  return flags;
}

// === STAGE F2 — ANSWER LEAK ===
// The stem must not contain the defining word(s) of the correct answer or a
// morphological variant. Two checks:
//   (a) ROOT-WORD MATCH — strip common English suffixes from the answer ("Budding"
//       → "bud") and look for the root as a whole-word substring in the stem
//       (case-insensitive). This catches morphological leaks the previous
//       token-set check missed (e.g., stem says "or bud, develops" while the
//       answer is "Budding" — tokeniser dropped "bud" because length ≤3).
//   (b) MULTI-TOKEN PHRASE COVERAGE — for multi-word answers, flag when ≥60% of
//       significant answer tokens appear in the stem (catches "weak stem along
//       the ground" → "creeper"-style paraphrase tests).
function checkAnswerLeak(q: any): QAFlag[] {
  const flags: QAFlag[] = [];
  const stem = typeof q.stem === 'string' ? q.stem.toLowerCase() : '';
  if (!stem) return flags;

  const candidates: string[] = [];
  if (typeof q.answer === 'string' && q.answer.trim()) candidates.push(q.answer);
  const options = Array.isArray(q.options) ? q.options : [];
  const correct = options.find((o: any) => o && o.correct);
  if (correct && typeof correct.text === 'string' && correct.text.trim()) candidates.push(correct.text);

  const stemTokens = new Set(tokeniseLeak(stem));

  for (const c of candidates) {
    const ansTokens = tokeniseLeak(c);
    if (ansTokens.length < 1) continue;

    // (a) Root-word substring match — catches morphological leaks. We test
    // every significant answer token (not just single-word answers) so that
    // "Vegetative propagation" → roots ["vegetativ", "propagat"] both probed.
    let rootLeak: { word: string; root: string } | null = null;
    for (const t of ansTokens) {
      const r = rootWord(t);
      if (r.length < 3) continue;
      // Whole-word boundary match so "bud" doesn't false-match "budget".
      const re = new RegExp(`\\b${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*\\b`, 'i');
      if (re.test(stem)) { rootLeak = { word: t, root: r }; break; }
    }
    if (rootLeak) {
      flags.push({ rule: 'answer_root_in_stem', category: 'answer_leak', severity: 'major',
        message: `Stem contains a morphological variant of the answer "${rootLeak.word}" (root "${rootLeak.root}") — student can solve by matching the stem word to the option.`,
        field: 'stem' });
      break;
    }

    // (b) Multi-token answer phrase coverage. Threshold lowered to 0.5
    // (was 0.6) after the Grade-7 plant-reproduction batch — items like U2-4
    // ("This process is known as fragmentation. How does this method differ
    // from spore formation?") had a partial-token overlap that sat just
    // under the 60% bar but is plainly a leak. 50% = "majority of significant
    // tokens reproduced" is the right call: still doesn't fire on legitimate
    // comparison stems, fires on paraphrase tests.
    if (ansTokens.length >= 2) {
      const hits = ansTokens.filter((t: string) => stemTokens.has(t)).length;
      if (hits / ansTokens.length >= 0.5) {
        flags.push({ rule: 'answer_phrase_in_stem', category: 'answer_leak', severity: 'major',
          message: `Stem reproduces ${hits}/${ansTokens.length} significant tokens of the correct answer — likely paraphrase test, not comprehension.`,
          field: 'stem' });
        break;
      }
    }
  }

  return flags;
}

// === STAGE F5 — IMAGE MATERIAL-PROPERTY DEPENDENCY ===
// If needs_image=true AND the stem hinges on a tactile/material-property
// keyword (tender/woody/soft/hard/etc.), the image cannot reliably carry the
// classification cue. Move the cue into text or unset needs_image.
function checkImageMaterial(q: any): QAFlag[] {
  const flags: QAFlag[] = [];
  if (!q.needs_image) return flags;
  const stem = typeof q.stem === 'string' ? q.stem.toLowerCase() : '';
  if (!stem) return flags;
  const tactile = /\b(tender|woody|soft|hard|flexible|brittle|smooth|rough|shiny|matte|glossy|tough|spongy|brittle)\b/i;
  if (tactile.test(stem)) {
    flags.push({ rule: 'image_material_dependency', category: 'image_material', severity: 'minor',
      message: 'Stem uses a tactile/material-property keyword (e.g., tender/woody/soft) while needs_image=true — images cannot reliably show material properties; move the cue into named-plant context or unset needs_image.',
      field: 'stem' });
  }
  return flags;
}

// === MAIN RUNNER ===
export function runRuleBasedQA(questions: any[], lo: string, profile: 'cbse' | 'state' = 'cbse'): RuleQAResult[] {
  const results: RuleQAResult[] = [];
  const allStems = new Set<string>();

  for (const q of questions) {
    const stem = q.stem || '';
    const options = q.options || [];
    const flags: QAFlag[] = [];

    // A&R relationship options are not misconception-traced distractors and the
    // assertion text legitimately restates concepts, so the distractor-source and
    // answer-leak checks would fire spuriously — skip them for A&R items.
    const isAR = looksLikeAssertionReason(q);

    // Run ALL checks
    flags.push(...checkFormatting(stem, options));
    flags.push(...checkContent(stem));
    flags.push(...checkQuality(stem, options, profile));
    flags.push(...checkDistractors(options));
    if (!isAR) flags.push(...checkDistractorSource(options));
    flags.push(...checkMisconceptionCoverage(q));
    flags.push(...checkRationaleHygiene(q));
    if (!isAR) flags.push(...checkAnswerLeak(q));
    flags.push(...checkImageMaterial(q));
    flags.push(...checkLocalization(stem, options));
    flags.push(...checkAlignment(stem, lo, options));

    // Exact duplicate
    const norm = stem.toLowerCase().trim();
    if (norm && allStems.has(norm)) {
      flags.push({ rule: 'exact_duplicate', category: 'alignment', severity: 'critical', message: 'Exact duplicate question.', field: 'stem' });
    }
    if (norm) allStems.add(norm);

    const hasCritical = flags.some(f => f.severity === 'critical');
    const hasMajor = flags.some(f => f.severity === 'major');
    results.push({
      question_id: q.question_id || q.id,
      pass: !hasCritical && !hasMajor,
      flags
    });
  }

  return results;
}

// === NUMERICAL DIVERSITY (Divyansh — pattern-lock detection) ===
// Jaccard similarity on content-word sets (digits dropped) across numerical stems.
// Flags: pair-wise Jaccard > 0.6, or ≥ 3 stems sharing leading 6 tokens.
export function checkNumericalDiversity(questions: any[]): string[] {
  const findings: string[] = [];
  const nums = questions.filter(q => /\d/.test(q.stem || ''));
  if (nums.length < 3) return findings;

  const sets = nums.map(q => tokenizeDiv(q.stem));
  let highSimPairs = 0;
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const s = jaccard(sets[i], sets[j]);
      if (s > 0.6) {
        highSimPairs++;
        findings.push(`High similarity (Jaccard=${s.toFixed(2)}) between ${nums[i].id} and ${nums[j].id}.`);
      }
    }
  }
  if (highSimPairs === 0) findings.push(`diversity OK — ${nums.length} numericals, no pair above 0.6 Jaccard.`);

  // Leading-6-token repetition
  const leads: Record<string, string[]> = {};
  nums.forEach(q => {
    const key = (q.stem || '').toLowerCase().split(/\s+/).slice(0, 6).join(' ');
    if (!key) return;
    (leads[key] ||= []).push(q.id);
  });
  Object.entries(leads).forEach(([key, ids]) => {
    if (ids.length >= 3) findings.push(`${ids.length} numericals share opener "${key}..." — ${ids.join(', ')}.`);
  });

  return findings;
}

// === CONTENT DIVERSITY (concept overlap across ALL stems) ===
// Generalises checkNumericalDiversity to every question (not just numericals).
// Flags stem pairs whose content-word Jaccard is >= CONTENT_DIVERSITY_THRESHOLD —
// the same concept asked twice. Conservative threshold; advisory (set-level warn).
export const CONTENT_DIVERSITY_THRESHOLD = 0.6;
export function checkContentDiversity(questions: any[]): string[] {
  const findings: string[] = [];
  const items = questions.filter(q => (q.stem || '').trim().length > 0);
  if (items.length < 2) return findings;
  const sets = items.map(q => tokenizeDiv(q.stem));
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const s = jaccard(sets[i], sets[j]);
      if (s >= CONTENT_DIVERSITY_THRESHOLD) {
        findings.push(`High concept overlap (Jaccard=${s.toFixed(2)}) between ${items[i].id || items[i].question_id} and ${items[j].id || items[j].question_id}.`);
      }
    }
  }
  return findings;
}

// === RECIPROCAL ANSWER-REVEAL (cross-question) ===
// Flags a pair (i, j) when EACH question's correct answer is reproduced inside the
// OTHER question's stem — answering one hands you the other. Example: "Which rock
// forms when heat and pressure change existing rocks?" → metamorphic, paired with
// "What turns sedimentary rock into metamorphic rock?" → heat and pressure. Requires
// BOTH directions to fire, which keeps false positives near zero (a one-direction
// variant over-fires on shared vocabulary and overlaps single-question answer-leak).
const REVEAL_COVERAGE = 0.6;
function answerTokensOf(q: any): string[] {
  let ans = '';
  if (typeof q.answer === 'string' && q.answer.trim()) ans = q.answer;
  else {
    const opts = Array.isArray(q.options) ? q.options : [];
    const correct = opts.find((o: any) => o && o.correct);
    if (correct && typeof correct.text === 'string') ans = correct.text;
  }
  return tokeniseLeak(ans);
}
export function checkAnswerRevealPairs(questions: any[]): string[] {
  const findings: string[] = [];
  const items = questions.filter(q => (q.stem || '').trim().length > 0);
  if (items.length < 2) return findings;
  const stemSets = items.map(q => new Set(tokeniseLeak(q.stem)));
  const ansTokens = items.map(answerTokensOf);
  const covers = (stemSet: Set<string>, ans: string[]): boolean => {
    if (ans.length === 0) return false;
    const hits = ans.filter(t => stemSet.has(t)).length;
    return hits / ans.length >= REVEAL_COVERAGE;
  };
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (covers(stemSets[j], ansTokens[i]) && covers(stemSets[i], ansTokens[j])) {
        findings.push(`${items[i].id || items[i].question_id} and ${items[j].id || items[j].question_id} reveal each other's answers (each answer appears in the other's stem).`);
      }
    }
  }
  return findings;
}
