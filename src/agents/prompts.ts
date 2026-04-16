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

COGNITIVE PROGRESSION (each cell MUST feel different):
- R1: Recall a definition or fact. Simple, direct. "What is X?"
- U1: Explain WHY or HOW. "Why is X classified as Y?" Not just "What is X?"
- U2: COMPARE or resolve CONFLICT. "A plant has soft stem BUT spreads on ground — what is it?" Student must weigh competing features. NOT just another R1 with "classify" in the stem.
- A2: Apply to a NEW, real-world, possibly tricky case. "A money plant grows upward using support. Why is it NOT a creeper?" Student must REASON, not just label.
- AN2: Analyse data or evidence to draw a conclusion. Multi-step: observe → infer → conclude.

QUESTION DESIGN PATTERNS (vary these — do NOT repeat the same pattern):
- IDENTIFICATION: "What type of plant is X?" (use sparingly — max 2 per set)
- REASONING: "Why is X NOT a Y?" or "What makes X different from Y?"
- CONFLICT: "X has feature A (suggests type P) but also feature B (suggests type Q). What is it?" — student resolves competing evidence
- MISCONCEPTION: Directly test a known confusion. "Meera says a watermelon plant is a climber because it has tendrils. Is she correct?"
- EDGE CASE: "A tomato plant has a thin stem but grows upright. Is it a herb or a shrub?"

TRUE/FALSE RULES:
- NEVER use obvious definitions ("Trees have thick stems" = too easy)
- USE: partial truths, common misconceptions, or statements that SOUND correct but aren't
- GOOD: "All plants with soft stems are herbs." (FALSE — creepers also have soft stems)
- GOOD: "A plant that grows along the ground must be a creeper." (FALSE — could be a spreading herb)
- The student must THINK, not just remember.

LANGUAGE VARIETY:
- NEVER repeat the same descriptive phrase across questions. Vary: "soft green stem" → "thin flexible stem" → "non-woody stem" → "tender stem that bends easily"

REPETITION PREVENTION (CRITICAL):
- Read "Other questions test:" — NEVER test the same concept or skill.
- Two questions asking "identify plant type from stem description" = UNACCEPTABLE.
- Vary: the SKILL (identify vs compare vs reason vs apply), the CONTEXT (garden/forest/farm/kitchen), the COGNITIVE DEMAND.

IMAGE: needs_image = true when stem or options REQUIRE a picture. Math: diagrams, geometry, graphs. Science: organisms, experiments, diagrams. Let content decide.`,

  GenerationStage2: `Review and improve this generated question. Senior assessment reviewer.

CHECK AND FIX:
1. UK ENGLISH: colour, favourite, organise, analyse, centre, defence. Fix US spellings.
2. DISTRACTORS: Each wrong option must target a SPECIFIC misconception. "why_wrong" = exact reasoning error. No absurd options.
3. OPTIONS: Similar length/grammar. Correct NOT longer. No "all/none of the above".
4. GRADE FIT: Would a Grade N student understand every word?
5. COGNITIVE DEPTH: Does this question test THINKING or just RECALL? If the cell is U2 or higher but the question is just "What is X?" — rewrite to require comparison, reasoning, or conflict resolution.
6. TRUE/FALSE: If type is true_false and the statement is an obvious definition — rewrite to be a partial truth, misconception, or conflict statement that requires thinking.
7. REPETITION: If this tests the SAME skill as the "Other questions" list — flag and suggest a different angle.

Return improved question. If already good, return unchanged.`,

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
  R1: ['mcq', 'mcq', 'true_false', 'mcq', 'match', 'arrange'],
  U1: ['mcq', 'mcq', 'true_false', 'mcq', 'arrange', 'mcq'],
  U2: ['mcq', 'match', 'mcq', 'arrange', 'mcq', 'true_false'],
  A2: ['mcq', 'mcq', 'arrange', 'mcq', 'match', 'mcq'],
  A3: ['mcq', 'arrange', 'mcq', 'true_false'],
  AN2: ['mcq', 'mcq', 'match', 'arrange', 'mcq', 'true_false'],
  AN3: ['mcq', 'arrange', 'mcq', 'true_false'],
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
