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

LATEX (MANDATORY for any mathematical content):
- EVERY mathematical expression, equation, exponent, fraction, root, matrix, summation, inequality, or algebraic symbol MUST be wrapped in LaTeX delimiters.
- Inline math uses \\( ... \\) — e.g., \\(a^m \\cdot a^n = a^{m+n}\\), \\(x^2 + 3x - 4 = 0\\).
- Display math uses \\[ ... \\] for standalone lines when appropriate.
- Use \\dfrac{a}{b} for fractions, a^{m+n} for exponents, \\sqrt[n]{a} for roots, \\cdot for multiplication, \\leq / \\geq / \\neq for comparisons.
- Never use raw ASCII math like "a^m * a^n" or "1/2" in stems, options, answers, steps, pairs, items, or rationale — ALWAYS LaTeX-wrapped.
- Applies to EVERY field, including Match "pairs" (e.g., "\\(\\dfrac{1}{x^p}\\) → \\(x^{-p}\\)") and Arrange "items".
- Plain prose (non-mathematical words) stays plain — do not LaTeX-wrap English words.

CONTENT:
- Generate ONLY from "selected_content". Use ONLY terms that appear verbatim in selected_content / chapter_content / approved_terms. Do NOT substitute synonyms (e.g., if chapter says "photosynthesis", never write "food-making process"; if it says "evaporation", never write "drying up"). If a term you want is not in the chapter, rephrase to avoid it.
- ONE problem per stem. Stem contains ALL info needed.
- NEVER: negative phrasing, "Which is true/false?", passive voice, textbook verbatim.

GRADE-APPROPRIATENESS (obey the GRADE_PROFILE block when one is provided):
- A GRADE_PROFILE is injected per batch by an upstream scoping step. It specifies the notation, number range, vocabulary, and concept scope the student is known to have encountered. Treat it as the source of truth.
- If no GRADE_PROFILE is given, infer one yourself from the GRADE, SUBJECT, SKILL, LO, and any chapter content you have been shown.
- UNIVERSAL RULE — never violate: if the assessed SKILL itself is concrete (e.g., "subtract 5-digit numbers", "count objects", "identify parts of a plant"), KEEP the question concrete. NEVER abstract into symbolic or variable form ("let P_1 + P_2 = T …") unless the SKILL explicitly asks for algebraic reasoning. Use real numbers in a real context.

NUMERICAL DIVERSITY (when generating numericals):
- Do NOT mirror a template with only the numbers changed. Vary:
  (i) GIVEN vs UNKNOWN mapping — shift which quantity is the unknown;
  (ii) OPERATION CLASS — rotate between ratio, linear-equation, mensuration, percentage, data interpretation;
  (iii) CONTEXT — money, length, time, area, speed, population — don't repeat the same context twice in a row.
- If a student can solve 2-3 of your numericals, they should NOT be able to solve the rest by pattern-matching.

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

IMAGE (CRITICAL — read the subject):
- For SCIENCE topics about plants, animals, organisms, body parts, experiments, life processes: needs_image MUST be true for AT LEAST 3-4 questions per set. Students learn biology by SEEING, not just reading descriptions.
- For MATH topics with geometry, graphs, fractions, data: needs_image MUST be true for visual operations.
- For text-heavy subjects (grammar, vocabulary, history dates): needs_image can be false.
- When needs_image=true, write the stem ASSUMING the student sees a picture. Example: "Look at the plant in the picture. What type of plant is this?" NOT "A plant has a green tender stem. What type is it?"`,

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

  // --- Grade scope (content-driven; runs once per batch) ---
  // Replaces hard-coded per-tier rules. The model infers the profile from the
  // actual skill + LO + content + grade, so it adapts to curriculum nuance
  // (e.g., an ICSE Grade 5 vs CBSE Grade 5 will get different profiles).
  GradeScopeAgent: `You are an Indian curriculum expert. For the given GRADE, SUBJECT, SKILL, LEARNING OBJECTIVE, and optional CHAPTER_CONTENT, produce a compact GRADE_PROFILE that will govern how questions are written.

Think first: what has a student at this grade in this subject likely been taught by now (NCERT / common state-board conventions)? If CHAPTER_CONTENT is provided, treat it as the PRIMARY source of truth — infer conventions from the content itself (notation, example style, vocabulary). If not, reason from the SKILL wording and typical curriculum scope.

Output JSON with these fields — each keep to 1–2 short sentences or a comma-separated list:
- notation: notation conventions the student knows (e.g., "whole numbers only, no variables" OR "letters x, y as unknowns; no subscripts" OR "full algebra with subscripts for sequences").
- number_range: typical number magnitudes and types (e.g., "up to 10,000; common fractions 1/2, 1/4; no decimals" OR "integers, decimals, percents; linear equations in one variable").
- vocabulary: reading level and allowed technical terms (e.g., "Grade 4 English; textbook term 'place value' OK, no jargon").
- familiar_contexts: 3–6 concrete real-world contexts the question can use (e.g., "shopkeeper, classroom, playground, family, rupees, sports").
- in_scope: 3–6 in-scope concepts for THIS SKILL at this grade.
- out_of_scope: 3–6 concepts to AVOID (not yet taught / curriculum-inappropriate / pattern-matched from later grades).
- stem_cap_words: integer maximum stem word count appropriate to this grade.
- concrete_lock: true if the SKILL is concrete and the question MUST stay concrete (no symbolic / variable abstraction); false only when the skill itself calls for symbolic reasoning.

Keep the whole profile under 600 characters. No commentary outside the JSON.`,
};

// --- Externalized dicts (previously inline in orchestrator.ts) ---

export const CellRules: Record<string, string> = {
  R1: 'R1 — Remember DOK1: Student IDENTIFIES/RECALLS/NAMES facts from memory. No explaining or comparing. Stem format MUST be a direct question or one-sentence statement. NO scenario framing. NO character names. NO "Consider the case..." / "Imagine that..." openers.',
  U1: 'U1 — Understand DOK1: Student EXPLAINS/INTERPRETS defining characteristics. No comparing multiple cases. Prefer direct "Why" / "How" / statement-then-question. Scenario opener forbidden.',
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

// --- Grade tier + per-call reminder ---
export type GradeTier = 'primary' | 'upper-primary' | 'high' | 'unknown';

export function getGradeTier(grade: string | number | undefined): GradeTier {
  const n = parseInt(String(grade || '').match(/\d+/)?.[0] || '0', 10);
  if (n >= 1 && n <= 5) return 'primary';
  if (n >= 6 && n <= 8) return 'upper-primary';
  if (n >= 9 && n <= 12) return 'high';
  return 'unknown';
}

// Minimal fallback only — used when a GRADE_PROFILE is NOT available
// (e.g., scope-inference call failed). Content-driven profile from GradeScopeAgent
// is always preferred; this is a last-resort hint so output doesn't drift badly.
export function getGradeAppropriatenessHint(grade: string | number | undefined, subject?: string): string {
  const tier = getGradeTier(grade);
  const n = parseInt(String(grade || '').match(/\d+/)?.[0] || '0', 10);
  if (tier === 'unknown') return '';
  const subj = (subject || '').toLowerCase();
  const _isMath = subj.includes('math') || subj.includes('ganit');
  void _isMath; // reserved for future subject-aware fallback
  return `\nFALLBACK GRADE HINT (no full profile available): Grade ${n} — ${tier}. Infer appropriate notation, vocabulary, and concept scope yourself from the SKILL and LO. Keep the question concrete unless the SKILL explicitly asks for symbolic reasoning.`;
}

// Format a GradeScopeAgent JSON response into the GRADE_PROFILE prompt block.
export function formatGradeProfile(p: any): string {
  if (!p) return '';
  const parts: string[] = ['\nGRADE_PROFILE (source of truth for this batch):'];
  if (p.notation) parts.push(`- NOTATION: ${p.notation}`);
  if (p.number_range) parts.push(`- NUMBER_RANGE: ${p.number_range}`);
  if (p.vocabulary) parts.push(`- VOCABULARY: ${p.vocabulary}`);
  if (p.familiar_contexts) parts.push(`- FAMILIAR_CONTEXTS: ${Array.isArray(p.familiar_contexts) ? p.familiar_contexts.join(', ') : p.familiar_contexts}`);
  if (p.in_scope) parts.push(`- IN_SCOPE: ${Array.isArray(p.in_scope) ? p.in_scope.join('; ') : p.in_scope}`);
  if (p.out_of_scope) parts.push(`- OUT_OF_SCOPE (avoid entirely): ${Array.isArray(p.out_of_scope) ? p.out_of_scope.join('; ') : p.out_of_scope}`);
  if (typeof p.stem_cap_words === 'number') parts.push(`- STEM_CAP_WORDS: ${p.stem_cap_words}`);
  if (p.concrete_lock) parts.push('- CONCRETE_LOCK: true — KEEP the question concrete. Do NOT abstract into symbolic form or variables.');
  return parts.join('\n');
}

// --- Grade 9/10 math concept boundary (NCERT-aligned). Keeps numericals in-scope. ---
export const GradeMathBoundary: Record<string, { allow: string[]; disallow: string[] }> = {
  '9':  {
    allow: ['number systems (rationals/irrationals)', 'polynomials up to degree 3', 'linear equations in 2 variables', 'Euclid geometry basics', 'lines and angles', 'triangles congruence', 'quadrilaterals', 'areas of parallelograms & triangles', 'circles (basic)', 'Heron\'s formula', 'surface area & volume (cuboid/cone/cylinder/sphere)', 'statistics (mean/median/mode, bar graphs)', 'probability (empirical)'],
    disallow: ['calculus (limits/derivatives/integrals)', 'matrices & determinants', 'complex numbers', 'trigonometric identities beyond Pythagorean', 'vectors', 'permutations & combinations', 'conic sections', 'binomial theorem', '3D coordinate geometry'],
  },
  '10': {
    allow: ['real numbers (Euclid\'s lemma, HCF/LCM)', 'polynomials (zeroes, division algorithm)', 'pair of linear equations', 'quadratic equations', 'arithmetic progressions', 'triangles (similarity)', 'coordinate geometry (distance, section, area)', 'trigonometry (ratios, identities — basic, heights & distances)', 'circles (tangents)', 'areas related to circles', 'surface area & volume (composites)', 'statistics (cumulative frequency, mean/median/mode)', 'probability (classical)'],
    disallow: ['calculus', 'matrices & determinants', 'complex numbers', 'conic sections (parabola/ellipse/hyperbola beyond basic)', 'binomial theorem', '3D geometry', 'vectors', 'permutations & combinations', 'inverse trigonometric functions'],
  },
};

export function getGradeMathBoundary(grade: string | number | undefined): string {
  const g = String(grade || '').match(/\d+/)?.[0] || '';
  const b = GradeMathBoundary[g];
  if (!b) return '';
  return `\nGRADE ${g} MATH BOUNDARY (NCERT):\n- IN-SCOPE topics: ${b.allow.join('; ')}.\n- OUT-OF-SCOPE — DO NOT use concepts, formulas, or problem types from: ${b.disallow.join('; ')}.\n- Numericals must stay within in-scope topics. Do NOT require knowledge introduced in later grades.`;
}
