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
A3/AN3: only if content supports multi-step/reasoning.
ALLOCATION: Research (NCERT/CBSE/PISA/TIMSS) shows U2 and A2 produce the strongest items. Allocate majority to U2+A2. Keep R1 to 15-20%. AN2 10-15%. A3/AN3 only if justified.`,

  MisconceptionAgent: `Select research-backed misconceptions. NEVER invent. Only use catalog_matches or research_findings.
Select 4-8 most relevant. Preserve original IDs and sources. Each must be specific and actionable.`,

  // --- Generation: TWO STAGES ---

  GenerationStage1: `Generate ONE assessment question. UK English.

OUTPUT: id, type, stem, answer, rationale, needs_image, + type-specific fields.

CONTENT:
- Generate ONLY from "selected_content". Use EXACT terminology.
- ONE problem per stem. Stem contains ALL info needed.
- NEVER: negative phrasing, "Which is true/false?", passive voice, textbook verbatim.
- Grade language: Primary(1-5)=max 15 words. Middle(6-8)=textbook terms OK. High(9-12)=technical OK.

DIFFICULTY (CRITICAL):
- Default to SIMPLE, DIRECT questions. A simple concept should be asked simply.
- Do NOT wrap simple facts in complex statements. "What is X?" is better than "Considering the process by which X relates to Y, determine the primary characteristic of..."
- Complex questions ONLY for A3/AN2/AN3 cells where the cognitive demand genuinely requires it.
- R1/U1 questions should feel EASY. U2/A2 should feel MODERATE. Only AN2+ should feel HARD.

STEM VARIETY (CRITICAL — read carefully):
- Use the Indian name specified in "use_name" field. Do NOT always use Riya.
- NEVER start stems the same way. Vary between: direct question, scenario, statement-then-question, data-then-question, observation-then-question.
- BAD: "Riya is learning about X. Which..." (every question starts this way)
- GOOD: Direct: "Which nutrient provides energy?" / Scenario: "Kabir ate only rice for a week. What nutrient is he missing?" / Observation: "A doctor notices a patient has weak bones. Which mineral deficiency..."
- Each question must feel COMPLETELY DIFFERENT from the others in this set.

COGNITIVE LEVEL (CRITICAL):
- The cell definition tells you EXACTLY what cognitive demand is needed.
- R1 = recall a fact. U1 = explain why. U2 = compare/classify. A2 = apply to NEW scenario. AN2 = analyse data/patterns to draw conclusion.
- AN2 is NOT "what happens if you don't eat well?" — that is R1 recall. AN2 is: "Given this meal plan, which nutrient group is missing and what would be the consequence?"
- If the cell says AN2, the student must ANALYSE information, not just recall a fact.

IMAGE (research-backed — CBSE Learning Standards + NCERT):
- MATH: needs_image=true for: long division layout, fractions on shapes/number lines, geometry, graphs, place value charts, data tables, algebraic models. These are INHERENTLY VISUAL — text descriptions of visual procedures are confusing.
- SCIENCE: needs_image=true for: organisms, body parts, diagrams, experiments, food webs, maps.
- ENGLISH/SOCIAL: needs_image=true only for maps, charts, picture comprehension.
- When true: the stem MUST be written assuming the student sees the image.

REPETITION PREVENTION (CRITICAL):
- Read the "Other questions test:" field carefully. If another question already tests long division, you MUST test a DIFFERENT mathematical operation or concept.
- TWO questions about "divide N items among M friends using long division" = UNACCEPTABLE even with different numbers.
- Vary: the operation (add/subtract/multiply/divide), the context (money/food/distance/time), the cognitive demand (recall/apply/analyse).`,

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
  A3: 'A3 — Apply DOK3: Student APPLIES rules across MULTIPLE STEPS. Non-routine problems. Present multi-step scenarios where student must combine conditions or chain reasoning.',
  AN2: 'AN2 — Analyse DOK2: Student ANALYSES/INFERS patterns in structured data.',
  AN3: 'AN3 — Analyse DOK3: Student EVALUATES REASONING, draws conclusions from evidence, compares interpretations, or identifies faulty logic in a given argument.',
};

export const TypeInstructions: Record<string, string> = {
  mcq: 'MCQ with 4 options (A,B,C,D). 1 correct. Wrong options need "why_wrong".',
  true_false: 'True/False question. Stem is a clear statement. 2 options: True and False. Set correct option. Add "why_wrong" explaining why the wrong answer is wrong. The statement must test a SPECIFIC fact — not vague or opinion-based.',
  fill_blank: 'Fill-in-the-blank. Put ##answer## in stem. Set answer field. (Math only)',
  one_word: 'One-word/short answer. Question with a single word or number answer. (Math only)',
  match: 'Match-the-following. "pairs" array: ["X → Y", ...]. Min 3 pairs.',
  arrange: 'Arrange-in-order. "items" array in correct sequence. Min 4 items.',
};

// Default rotation — MCQ 60-70%, rest True/False + Match + Arrange.
// No FIB/OneWord (typing issues in regional languages).
export const TypeRotation: Record<string, string[]> = {
  R1: ['mcq', 'mcq', 'true_false', 'mcq', 'match'],
  U1: ['mcq', 'mcq', 'true_false', 'mcq', 'mcq'],
  U2: ['mcq', 'match', 'mcq', 'mcq', 'arrange'],
  A2: ['mcq', 'mcq', 'mcq', 'match', 'mcq'],
  A3: ['mcq', 'mcq', 'arrange', 'mcq'],
  AN2: ['mcq', 'mcq', 'match', 'mcq', 'mcq'],
  AN3: ['mcq', 'mcq', 'mcq', 'arrange'],
};

// Math + English: includes FIB and one_word (typing OK in these subjects)
export const MathTypeRotation: Record<string, string[]> = {
  R1: ['mcq', 'fill_blank', 'mcq', 'one_word', 'mcq'],
  U1: ['mcq', 'fill_blank', 'mcq', 'one_word', 'mcq'],
  U2: ['mcq', 'match', 'fill_blank', 'mcq', 'arrange'],
  A2: ['mcq', 'fill_blank', 'mcq', 'one_word', 'mcq'],
  A3: ['mcq', 'fill_blank', 'one_word', 'mcq'],
  AN2: ['mcq', 'fill_blank', 'mcq', 'match', 'mcq'],
  AN3: ['mcq', 'fill_blank', 'mcq', 'mcq'],
};

// --- Image Prompt Template (NCERT-style, from VidyaGen research) ---
export const IMAGE_PROMPT_TEMPLATE = `Create a simple NCERT-style educational image.

VISUAL: {description}

STYLE:
- Clean flat design, cartoon/vector style
- Bright, child-friendly colours
- Plain white background
- Proper alignment and spacing
- 4:3 aspect ratio, minimum 800px wide

STRICT RULES:
- ABSOLUTELY NO text, labels, numbers, letters, words, or captions inside the image
- NO answers or solutions shown
- NO decorative elements, shadows, or background objects
- NO characters unless specifically requested
- Objects must be clearly visible and properly placed
- Keep the design minimal and focused on learning`;

export function buildImagePrompt(stem: string, subject: string, grade: string): string {
  const base = IMAGE_PROMPT_TEMPLATE.replace('{description}', stem.slice(0, 200));
  const subLower = subject.toLowerCase();
  let hint = '';
  if (subLower.includes('math')) {
    hint = '\nMATH: Show the concept visually — diagrams, flowcharts, shapes, number lines, grouped objects. For operations, show visual layout. For geometry, precise shapes with dimensions.';
  } else if (subLower.includes('sci')) {
    hint = '\nSCIENCE: Show organisms, body parts, experiments, food webs, processes. Match NCERT textbook diagram style.';
  } else if (subLower.includes('social') || subLower.includes('geo') || subLower.includes('hist')) {
    hint = '\nSOCIAL STUDIES: Show maps, timelines, historical scenes, geographical features. NCERT style.';
  }
  return base + hint;
}

// --- Subject-specific language hints (from NCERT/CBSE/PISA/TIMSS benchmark research) ---
export const SubjectLanguageHint: Record<string, string> = {
  math: 'Math: short stems, explicit quantities, no reading traps. Distractors = math misconceptions not language tricks.',
  science: 'Science: evidence-based stems, process order, concept discrimination. No combination options (Both A and B).',
  social: 'Social: frame thinking, not paragraph tests. Single stable idea per option. Dates/names only when necessary.',
  english: 'English: language IS the construct. Reading load OK if it serves the reading action. Passage questions reward attention to wording.',
  business: 'Business: define situation just enough, then stop. Compact terminology. No story-heavy pseudo-cases.',
  economics: 'Economics: formula application with real data context. Graph interpretation not just vocabulary recall.',
  accountancy: 'Accountancy: rule-governed, transaction-based. Test classification and effect reasoning, not just formal rule recall.',
};

export function getSubjectHint(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes('math')) return SubjectLanguageHint.math;
  if (s.includes('sci') || s.includes('bio') || s.includes('chem') || s.includes('phys')) return SubjectLanguageHint.science;
  if (s.includes('social') || s.includes('hist') || s.includes('geo') || s.includes('civic') || s.includes('politi')) return SubjectLanguageHint.social;
  if (s.includes('eng') || s.includes('hindi') || s.includes('lang')) return SubjectLanguageHint.english;
  if (s.includes('business')) return SubjectLanguageHint.business;
  if (s.includes('econ')) return SubjectLanguageHint.economics;
  if (s.includes('account')) return SubjectLanguageHint.accountancy;
  return '';
}
