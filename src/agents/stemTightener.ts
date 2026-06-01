// Deterministic de-framing guardrail.
//
// The generation prompts (CellRules.R1/U1, STEM ECONOMY) instruct the model NOT
// to wrap stems in fictional-student narrative — but the LLM ignores the soft
// rule and keeps producing "Meera is learning about… Which characteristic…".
// audit.ts only WARNS about this in the review UI; nothing strips it during
// generation. This module runs automatically right after Stage 2 and rewrites
// any stem that opens with person/meta-learning framing, while preserving every
// fact needed to answer.
//
// Scope note: this targets PERSON framing and "is studying / learns that"
// wrappers — NOT legitimate object scenarios ("A money plant grows…", "A plant
// has a soft stem…"). Those are valid A2/U2 framings and must pass through
// untouched, so the detector deliberately avoids audit.ts's broad
// `An?\s+\w+\s+is` clause.

import { generateAgentResponse } from './api';
import { GenerationSchema } from './schemas';

// Fictional-student names the generator rotates through (orchestrator.ts:660)
// plus a handful of other common Indian names it tends to invent.
const NAMES = [
  'Riya', 'Aarav', 'Kabir', 'Priya', 'Meera', 'Ananya', 'Rohan', 'Zara', 'Dev', 'Isha',
  'Sneha', 'Aditi', 'Divya', 'Sameer', 'Arjun', 'Kavya', 'Neha', 'Ravi', 'Anjali', 'Vikram',
];

/**
 * Matches a stem that OPENS with construct-irrelevant person framing:
 *  - a fictional name ("Meera is…", "Priya, who…", "Rohan observes…")
 *  - a meta-learning wrapper ("… is studying/learning about…", "She learns that…")
 *  - a generic person opener ("A student…", "A teacher…", "A girl named…")
 * Intentionally does NOT match object scenarios like "A money plant grows…".
 */
export const FRAMING_OPENER_RE = new RegExp(
  '^\\s*(?:' +
    // Named person at the very start, e.g. "Meera is", "Priya, who", "Rohan observes"
    `(?:${NAMES.join('|')})\\b` +
    '|' +
    // Generic person openers
    'An?\\s+(?:student|teacher|girl|boy|child|pupil|learner)\\b' +
    '|' +
    // "Consider / Imagine / Suppose" thought-experiment openers
    '(?:Consider|Imagine|Suppose)\\b' +
  ')',
  'i',
);

/**
 * Matches anywhere in the stem: the "is studying / learning about / learns that"
 * meta-framing the generator wraps around the real question. Catches cases where
 * the name isn't first (rare) but the wrapper is still present.
 */
const META_LEARNING_RE =
  /\b(?:is|was|are|were)\s+(?:studying|learning\s+about|reading\s+about|being\s+taught)\b|\b(?:learns?|learnt|learned|is\s+taught|reads?)\s+that\b|\bin\s+(?:his|her|their)\s+(?:class|lesson|textbook|exam|test)\b/i;

/** True when the stem carries removable narrative framing. */
export function needsDeframing(stem: string): boolean {
  const s = stem || '';
  return FRAMING_OPENER_RE.test(s) || META_LEARNING_RE.test(s);
}

const DEFRAME_PROMPT = `You are tightening ONE assessment question's stem. The stem has been wrapped in construct-irrelevant narrative framing that adds reading load without changing the answer. Remove the framing; keep the assessment intact.

REMOVE:
- Any fictional person's name and any "<Name> is studying / learning about / reading…", "She/He learns that…", "In her class…", "for his exam…" wrapper.
- "Consider…", "Imagine…", "Suppose…" thought-experiment openers that don't change the answer.
- Places, dates, or timeframes that are not required to answer.

KEEP (do NOT drop):
- EVERY fact the student needs to answer — definitions, data, named instances, conflicting cues, the actual question.
- The question's difficulty and cognitive level. Do not simplify the task, only strip the wrapper.

DO NOT CHANGE: the options, the correct answer, the rationale, the type, the id, the cell, or any other field. Only rewrite the "stem".

EXCEPTION — claim-evaluation items (typically AN3): if the student's TASK is to judge a person's claim or reasoning (e.g. "A student claims X because Y. Is the reasoning correct?"), the claim IS the content — KEEP it. Just drop any extra preamble or name that isn't part of the claim. An impersonal "A student claims…" is fine.

Return the FULL question JSON, unchanged except for the tightened stem. If the stem already has no removable framing, return it unchanged.`;

/**
 * Rewrites a question's stem to strip narrative framing. Reuses the 'AI SME QA'
 * agent (temp 0.1) for a focused, low-creativity edit. Never throws — on any
 * failure it returns the original question so the guardrail can't break a run.
 */
export async function deframeStem(question: any, grade?: string | number): Promise<any> {
  try {
    const prompt = `${DEFRAME_PROMPT}
Grade: ${grade ?? 'unknown'}. Cell: ${question.cell || question.cg_cell || 'unknown'}.
Question to tighten: ${JSON.stringify(question).slice(0, 1800)}`;

    const tightened = await generateAgentResponse(
      'AI SME QA',
      prompt,
      JSON.stringify({ id: question.id, type: question.type, cell: question.cell }),
      GenerationSchema,
    );

    // Guard: only accept a non-empty stem; preserve all original fields the
    // rewrite may have dropped or blanked.
    if (tightened && typeof tightened.stem === 'string' && tightened.stem.trim().length > 0) {
      return { ...question, ...tightened, stem: tightened.stem };
    }
    return question;
  } catch {
    return question;
  }
}
