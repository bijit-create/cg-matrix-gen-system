/**
 * All agent prompts — structured, sized for Vercel (each <1,500 chars).
 * Research basis: ASSESSMENT_DESIGN_RESEARCH.md + QA_RESEARCH.md
 */

export const Prompts = {
  // --- Phase 1 agents (small, focused) ---

  IntakeAgent: `Normalise raw input into a structured task brief. Detect missing fields, ambiguities, conflicts. Output: grade, subject, LO, skill, count, readiness_status. Do not interpret the LO pedagogically.`,

  ConstructAgent: `Define the assessment construct — the precise capability measured. What is valid evidence of mastery? What is out of scope? Separate construct from instruction and pedagogy. If LO bundles multiple constructs, split them.`,

  SubskillAgent: `Break the SKILL into 3-6 testable subskills. Focus on SKILL DESCRIPTION (what student DOES), not the LO.
Each subskill = a specific, observable ACTION. Start with action verbs: Identify, Classify, Compare, Apply, Analyse.
Span from simple (recall) to complex (analysis). Each subskill targets a DIFFERENT cognitive operation.`,

  // --- Content & Matrix agents ---

  ContentScopingAgent: `Extract testable knowledge points from chapter content for a specific subskill.
CRITICAL: Extract REAL FACTS — not topic headings.
BAD: "Types of food" (heading). GOOD: "Wheat, rice, maize are cereals from plants" (testable fact).
Each point = COMPLETE, TESTABLE statement with specific examples/names/numbers.
Mark: core/supporting/advanced. Grade: primary/middle/high. 3-8 points per subskill.`,

  CGMapperAgent: `Define a content-specific CG Matrix. Each cell = [Cognitive action] + [content] + [constraint].
Cells: R1(recall), U1(explain), U2(compare/classify), A2(apply to new), A3(multi-step), AN2(analyse patterns), AN3(analyse reasoning).
For each: one-line definition, count, status (active/not_required). Do NOT force-fill all cells.
A3/AN3: only if content supports multi-step/reasoning.`,

  MisconceptionAgent: `Select research-backed misconceptions. NEVER invent. Only use catalog_matches or research_findings.
Select 4-8 most relevant. Preserve original IDs and sources. Each must be specific and actionable.`,

  // --- Generation: TWO STAGES ---

  GenerationStage1: `Generate ONE assessment question. UK English. Indian context (₹, names: Riya, Aarav, Kabir, Priya).

OUTPUT: id, type, stem, answer, rationale, needs_image, + type-specific fields.

RULES:
- Generate ONLY from "selected_content". Use EXACT terminology from content.
- ONE problem per stem. Stem contains ALL info needed to answer.
- Use scenarios: "Riya measured..." not "Measure the..."
- NEVER: negative phrasing, "Which is true/false?", passive voice, textbook verbatim.
- Grade language: Primary(1-5)=max 15 words/sentence. Middle(6-8)=textbook terms OK. High(9-12)=technical OK.
- needs_image: true ONLY if a picture genuinely helps. Let content decide, not a quota.`,

  GenerationStage2: `Review and improve this generated question. You are a senior assessment reviewer.

CHECK AND FIX:
1. UK ENGLISH: colour, favourite, organise, analyse, behaviour, centre, defence, metre, recognise, practise. Fix any US spellings.
2. DISTRACTORS (Rodriguez Attractor Framework): Each wrong option must attract students with a SPECIFIC misconception. Add/improve "why_wrong" = exact reasoning error ("student confuses X with Y because..."). No absurd/joke options.
3. OPTIONS: All similar length/grammar. Correct NOT longer. No "all/none of the above". No absolute qualifiers.
4. GRADE FIT: Is vocabulary appropriate? Would a Grade N student understand every word?
5. DIAGNOSTIC VALUE: Does a wrong answer reveal a specific gap, or just "didn't know"?

Return the improved question in the same format. If already good, return unchanged.`,

  // --- QA (now handled by multiPerspective.ts, this is fallback) ---

  QAAgent: `Check this question for: (1) factual accuracy — is the answer correct? (2) cognitive match — does it test the intended CG cell level? (3) distractor quality — are wrong options plausible and diagnostic? (4) language — UK English, grade-appropriate, culturally relevant for Indian students?
Return: pass, issues, severity, score (0-100).`,
};

// --- Externalized dicts (previously inline in orchestrator.ts) ---

export const CellRules: Record<string, string> = {
  R1: 'R1 — Remember DOK1: Student IDENTIFIES/RECALLS/NAMES facts from memory. No explaining or comparing.',
  U1: 'U1 — Understand DOK1: Student EXPLAINS/INTERPRETS defining characteristics. No comparing multiple cases.',
  U2: 'U2 — Understand DOK2: Student COMPARES/CLASSIFIES using explicit criteria. No applying rules to new cases.',
  A2: 'A2 — Apply DOK2: Student APPLIES learned rules to NEW concrete examples. Present NOVEL scenarios.',
  A3: 'A3 — Apply DOK3: Student APPLIES rules across MULTIPLE STEPS. Non-routine problems.',
  AN2: 'AN2 — Analyse DOK2: Student ANALYSES/INFERS patterns in structured data.',
  AN3: 'AN3 — Analyse DOK3: Student DETECTS ERRORS/EVALUATES REASONING.',
};

export const TypeInstructions: Record<string, string> = {
  mcq: 'MCQ with 4 options (A,B,C,D). 1 correct. Wrong options need "why_wrong".',
  true_false: 'True/False question. Stem is a clear statement. 2 options: True and False. Set correct option. Add "why_wrong" explaining why the wrong answer is wrong. The statement must test a SPECIFIC fact — not vague or opinion-based.',
  fill_blank: 'Fill-in-the-blank. Put ##answer## in stem. Set answer field. (Math only)',
  one_word: 'One-word/short answer. Question with a single word or number answer. (Math only)',
  match: 'Match-the-following. "pairs" array: ["X → Y", ...]. Min 3 pairs.',
  arrange: 'Arrange-in-order. "items" array in correct sequence. Min 4 items.',
};

// Type rotation — subject-aware. Error analysis REMOVED from all subjects.
// FIB and one_word only for Math.
export const TypeRotation: Record<string, string[]> = {
  R1: ['mcq', 'true_false', 'mcq', 'match', 'true_false'],
  U1: ['mcq', 'true_false', 'mcq', 'true_false', 'mcq'],
  U2: ['mcq', 'match', 'arrange', 'mcq', 'true_false'],
  A2: ['mcq', 'arrange', 'mcq', 'match', 'mcq'],
  A3: ['mcq', 'arrange', 'mcq'],
  AN2: ['mcq', 'match', 'mcq', 'arrange'],
  AN3: ['mcq', 'mcq', 'arrange'],
};

// Math-specific rotation includes FIB and one_word
export const MathTypeRotation: Record<string, string[]> = {
  R1: ['mcq', 'fill_blank', 'one_word', 'true_false', 'mcq'],
  U1: ['mcq', 'fill_blank', 'true_false', 'one_word', 'mcq'],
  U2: ['mcq', 'match', 'fill_blank', 'arrange', 'one_word'],
  A2: ['mcq', 'fill_blank', 'one_word', 'match', 'mcq'],
  A3: ['mcq', 'fill_blank', 'one_word'],
  AN2: ['mcq', 'fill_blank', 'match', 'one_word'],
  AN3: ['mcq', 'fill_blank', 'mcq'],
};
