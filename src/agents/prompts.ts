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
Mark: core/supporting/advanced. Grade: primary/middle/high. 3-8 points per subskill.

EDGE CASES (REQUIRED — populate the 'flag' field):
- Set flag="edge-case" on knowledge points that are documented BOUNDARY CASES — instances that resist clean classification, that students commonly mis-categorise, or that cross the textbook taxonomy. Examples by domain:
  - Plant taxonomy: banana (woody-looking herb), sugarcane (grass = herb in NCERT), bamboo (woody but a grass), tomato (semi-woody at base), pumpkin (creeper that sometimes climbs).
  - Fractions / decimals: zero, improper > 1, mixed numbers, negative fractions.
  - Forces / motion: equilibrium with multiple forces, balanced-but-moving, friction direction in static cases.
  - Measurement / units: quantities at unit boundaries, non-SI conventions, prefix scaling.
  - Grammar: irregular plurals, mass nouns vs count nouns, transitive vs intransitive ambiguity.
- For other domains, surface the boundary cases YOUR knowledge of the curriculum identifies — NEVER invent. If the chapter or your domain knowledge does not name a boundary case, leave flag="" for that point.
- Aim for 20-30% of extracted knowledge points to be flagged as edge cases when the domain has documented edges. The downstream generator will use these to ensure the question bank doesn't only test canonical examples.
- Other allowed flag values: "core", "advanced", or "" (empty).`,

  CGMapperAgent: `Define a content-specific CG Matrix. Each cell = [Cognitive action] + [content] + [constraint].
Cells: R1(recall), U1(explain), U2(compare/classify), A2(apply to new), A3(multi-step), AN2(analyse patterns), AN3(analyse reasoning).
For each: one-line definition, count, status (active/not_required). Do NOT force-fill all cells.
A3/AN3: only if content supports multi-step/reasoning.
ALLOCATION: Research (NCERT/CBSE/PISA/TIMSS) shows U2 and A2 produce the strongest items. Allocate majority to U2+A2. Keep R1 to 15-20%. AN2 10-15%. A3/AN3 only if justified.`,

  MisconceptionAgent: `Select research-backed misconceptions. NEVER invent. Only use catalog_matches or research_findings.
Select 4-8 most relevant. Preserve original IDs and sources. Each must be specific and actionable.
Authoritative sources to prioritise (in this order for Indian curricula): HBCSE / epiSTEME (Subramaniam, Chunawala, Haydock), Eklavya HSTP, NCERT exemplars, MOSART (Sadler), AAAS Project 2061, PhysPort (FCI etc.), CINS/CANS (Anderson), CSMS (Hart, Küchemann), Pfundt & Duit bibliography, Treagust two-tier diagnostics, Eedi NeurIPS dataset, Test of Economic Literacy (Walstad). The 'incorrect_reasoning' field must capture the student's actual flawed thinking ("a student who picks this is reasoning that …"), and 'related_subskills' must point at the subskill IDs this misconception threatens.`,

  // --- Generation: TWO STAGES ---

  GenerationStage1: `Generate ONE assessment question. UK English.

OUTPUT: id, type, stem, answer, rationale, needs_image, image_desc, misconception_id_targeted, misconception_reasoning_error, + type-specific fields. Each MCQ option carries label, text, correct, why_wrong (REQUIRED), plus misconception_id and reasoning_error for wrong options.

MISCONCEPTION TARGETING (CRITICAL — every question must claim what student error it probes):
- A "Misconceptions" block (numbered list with IDs) is provided below. Treat it as the menu of allowed student errors for this batch.
- Choose ONE misconception_id from that list whose error this question is designed to catch — set it as misconception_id_targeted. Echo the underlying reasoning error in plain English in misconception_reasoning_error.
- If NONE of the listed misconceptions fit this specific question, set misconception_id_targeted="" AND set misconception_reasoning_error to a short typed phrase from this list ONLY: 'over-generalisation', 'over-specification', 'size-based-classification', 'culinary-vs-botanical-confusion', 'feature-conflation', 'category-overlap-misjudged', 'rule-application-error', 'unit-or-notation-error', 'sign-or-direction-error', 'procedural-skip', 'definition-recall-only'. NEVER invent a new misconception.
- For MCQ / true_false: every WRONG option's why_wrong must explain the error in student-facing terms, AND its misconception_id field must reference a misconception_id from the list (preferred) or be left empty when reasoning_error is set to one of the typed phrases above. The correct option does not need misconception_id / reasoning_error.
- DO NOT reuse the same misconception_id_targeted as a question already listed in "Other questions test:" within the same cell. The cell-level coverage matrix forbids duplicates.

DISTRACTOR SOURCING:
- Every wrong option must trace to a NAMED misconception_id from the list above OR a typed reasoning_error. If you cannot name the error, the distractor is filler — replace it.
- Each distractor's why_wrong must read as a prediction of student thinking ("A student picking this is reasoning that …"), not a tautology ("This is wrong because the answer is X").

RATIONALE HYGIENE:
- The rationale explains why the correct answer is correct using ONLY facts present in the stem, the options, or chapter_content/approved_terms.
- It must NAME the misconception(s) that wrong-option-pickers held — reference them by what the student likely believed, not by the misconception_id itself ("A student who classifies by height alone would pick X — but the criterion is stem texture, not height.").
- NEVER include curriculum-design notes, author meta-commentary, "though that's an exception often discussed in higher grades", or content the prompt did not set up.

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

ANSWER LEAK (CRITICAL — non-negotiable):
- The stem MUST NOT contain the defining word(s) of the correct answer, a morphological variant, OR the textbook DEFINITION-PHRASE of the correct answer.

THREE FORMS OF LEAK TO AVOID:

  (1) WORD LEAK — the answer word or its root appears in the stem.
    BAD: "...where a small outgrowth, or **bud**, develops..." answer: "**Budding**" (root "bud" is in the stem).
    BAD: "What is the **vegetative** part used for **propagation**?" answer: "Vegetative propagation".
    FIX: pick a different framing that doesn't name the root — describe the organism's behaviour or use a specific named example.

  (2) DEFINITION-PHRASE LEAK — the stem reproduces the textbook-style definition of the answer.
    BAD: "A plant has a soft tender green stem. What type of plant is this?" answer: herb (the definition IS the stem).
    BAD: "A plant has a weak stem that spreads along the ground. What type is it?" answer: creeper.
    BAD: "A scientist places a single-celled organism in a sugar solution; small bulb-like outgrowths develop and detach. Which method does this represent?" answer: budding (this IS the budding definition).
    FIX: replace the definition with a SPECIFIC named instance (mint, money plant, watermelon) the student must classify. Or use a CONFLICTING cue (a feature that fits TWO categories) so the student must apply the criterion.

  (3) WRONG-CATEGORY-SWAP DISTRACTORS — if every wrong option is just "the other category" with no misconception encoded, the item is a vocabulary recogniser. Wrong options must trace to a NAMED student misconception (e.g., "spores = seeds confusion", "size-based classification", "teleological framing") not just "the wrong label".

THE "COVER-THE-STEM" SELF-CHECK:
- After drafting, mentally cover the stem and read just the four options. If the correct answer is identifiable from option content alone, the stem isn't doing work — rewrite it.
- After drafting, ask: "Could a student who only memorised the textbook definitions answer this without reading the stem carefully?" If yes, the item is functionally R1 — rewrite to require reasoning from a specific instance.

GOOD examples that pass all three checks:
- "Mint plants are commonly grown in kitchen gardens at knee height. What type of plant is mint?" (specific named plant; student must classify via the criterion).
- "A money plant uses a wooden support to grow upwards along a wall. What type of plant is it?" (observable behaviour; student must reason).
- "Sameer keeps bread in damp conditions for a week. White cottony patches grow, and a fresh slice placed nearby develops the same patches a few days later. Which mode of asexual reproduction explains how the new patches appeared?" (scenario-based; student must INFER the mechanism — note: this stem does NOT name "spore", "release", or "dispersal").

This rule applies across ALL types — MCQ, true_false, fill_blank, match, arrange.

GRADE-APPROPRIATENESS (obey the GRADE_PROFILE block when one is provided):
- A GRADE_PROFILE is injected per batch by an upstream scoping step. It specifies the notation, number range, vocabulary, and concept scope the student is known to have encountered. Treat it as the source of truth.
- If no GRADE_PROFILE is given, infer one yourself from the GRADE, SUBJECT, SKILL, LO, and any chapter content you have been shown.
- UNIVERSAL RULE — never violate: if the assessed SKILL itself is concrete (e.g., "subtract 5-digit numbers", "count objects", "identify parts of a plant"), KEEP the question concrete. NEVER abstract into symbolic or variable form ("let P_1 + P_2 = T …") unless the SKILL explicitly asks for algebraic reasoning. Use real numbers in a real context.

TABULAR DATA (when the stem shows rows and columns):
- Do NOT paste a markdown table inline in the stem (no "Day | P | Q | Total --- | --- | --- | --- 1 | 2.35 …"). That renders as unreadable prose.
- Instead: (a) set needs_image=true, (b) describe the table in image_desc, and (c) still include the minimum numeric values the student needs in the stem prose (e.g., "On Days 1–3 the totals were 3.45, 3.70, 3.95 kg …") so the question is answerable if the image fails to render.
- If you must keep the table in text, use ONE cell per newline (not pipes on one wrapped line) so downstream renderers can detect and re-flow it into an HTML table.

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

IMAGE (CRITICAL — read carefully):
- Set needs_image=true ONLY when a visual genuinely helps the student answer (most science / geometry / data / map questions). For pure language, abstract reasoning, or vocabulary: needs_image=false.
- For text-heavy subjects (grammar, vocabulary, history dates): needs_image is usually false.
- When needs_image=true, write the stem ASSUMING the student sees a picture. Example: "Look at the plant in the picture. What type of plant is this?" NOT "A plant has a green tender stem. What type is it?"

IMAGE_DESC (REQUIRED when needs_image=true; otherwise empty string):
The image_desc field tells the image generator EXACTLY what subject to draw. Follow these rules with no exceptions:

  RULE 1 — Depict the CORRECT ANSWER, not the question scene.
    BAD (literal scene of question text):
      Question: "Divya observes a tall woody plant. Is it herb / shrub / TREE?"  Answer: shrub.
      image_desc: "A girl named Divya looking at a tree."   ← WRONG (drew the wrong answer because 'tree' was in the question)
    GOOD (depicts the answer):
      image_desc: "A single shrub: a multi-stemmed bushy plant about chest-high, with several woody branches splitting near the ground, leaves, and small flowers. Stems are brown and woody. Plain white background."

  RULE 2 — Be a noun-phrase description, not a directive.
    Write what should appear in the frame: subjects, key features, proportions. Do NOT include "create an image of...", "draw a picture showing..." — the generator handles that wrapper.

  RULE 3 — Comparison plates only when the question is comparative.
    If the question asks the student to identify ONE thing: show ONE thing.
    If the question asks "which of these three is X" and the student must compare: show all three side-by-side.

  RULE 4 — Labels are CONDITIONAL.
    Add labels ONLY if the question requires the student to read them (e.g., "which part is labelled X?", "what is the value at point P?").
    If the question is "what type of plant is this?", do NOT label "stem", "leaf", "root" — those labels give away or distract from the actual question. Set labels="" in that case.
    When labels ARE needed, write them in quotes inside image_desc, with correct spelling, e.g.: labels: "Stem", "Leaf", "Root", "Flower" (never "Flear", never misspelled).

  RULE 5 — Show FORM, not material properties.
    Images can RELIABLY show: height, branching pattern, growth direction, leaf shape, # of stems, posture, relative size, colour of large objects.
    Images CANNOT reliably show: material properties (tender vs woody, soft vs hard), tactile texture (smooth vs rough), reflectivity (glossy vs matte). A child looking at a stylised illustration cannot perceive whether a stem is "tender" — that is a tactile property, not a visual one.
    If the question's CORRECT ANSWER depends on the student perceiving a material property, EITHER move the cue into named-plant context in the stem ("a mint plant", "a tomato plant") OR set needs_image=false.
    Use form-based proportions in image_desc:
      Herb: ~knee-high, single thin stem, soft leaves, no bark visible (do NOT write "tender" — the image cannot carry texture).
      Shrub: chest-high, MULTIPLE stems splitting near the ground, branches spreading sideways.
      Tree: tall (well above human), ONE thick trunk, branches high up forming a canopy.
      Creeper: thin stem laid FLAT along the ground (orientation, not texture).
      Climber: thin stem WRAPPING UP a vertical support (orientation + behaviour, not texture).
    State proportions and posture explicitly. Do NOT lean on "tender" / "woody" / "soft" / "hard" as classification cues — they're invisible in vector illustration.

  RULE 6 — No humans unless the question is about a person.
    Default: no people in the frame.
    Exception: if the question explicitly involves a child / teacher / shopkeeper performing an action, include ONE neutral cartoon figure from a back / three-quarter view.

  RULE 7 — Length budget: 30–80 words. Concise, dense, specific.

  GOOD EXAMPLES (form-only — note no tactile descriptors as classification cues):
    Q: "Mint is grown in kitchen gardens at knee height. What type of plant is mint?" (answer: herb)
    image_desc: "A single mint plant about knee-high: one thin green stem rising straight up from brown soil, with paired oval green leaves. Plant is short — the top of the plant reaches roughly knee height of an implied human scale. No bark on the stem. Clean vector textbook style. Plain white background. No labels."

    Q: "A pumpkin plant grows along the ground in a kitchen garden. What type of plant is it?" (answer: creeper)
    image_desc: "A single pumpkin creeper: thin green stem laid flat horizontally along brown soil, broad lobed green leaves at intervals along the stem, one small yellow flower and one small green pumpkin fruit. The plant has NO upright posture — it lies entirely along the ground. Clean vector textbook style. Plain white background. No labels."

    Q: "Compare a mint plant, a rose bush and a mango tree. Which has a single thick trunk?" (answer: mango tree)
    image_desc: "Three plants side-by-side on a plain white background at consistent scale: (1) a knee-high mint with a single thin upright stem; (2) a chest-high rose bush with multiple stems splitting near the ground; (3) a tall mango tree with ONE thick brown trunk and a wide leafy canopy high above. Each plant is drawn at the correct relative height. Labels under each plant in clean sans-serif caps: 'MINT', 'ROSE BUSH', 'MANGO TREE'."`,

  GenerationStage2: `Review and improve this generated question. Senior assessment reviewer.

CHECK AND FIX:
1. UK ENGLISH: colour, favourite, organise, analyse, centre, defence. Fix US spellings.
2. DISTRACTORS: Each wrong option must target a SPECIFIC misconception. "why_wrong" is REQUIRED. Each wrong option must also have either a misconception_id (from the list provided to the generator) or a typed reasoning_error. If a distractor has neither, rewrite it.
3. OPTIONS: Similar length/grammar. Correct NOT longer. No "all/none of the above".
4. GRADE FIT: Would a Grade N student understand every word?
5. COGNITIVE DEPTH: Does this question test THINKING or just RECALL? If the cell is U2 or higher but the question is just "What is X?" — rewrite to require comparison, reasoning, or conflict resolution. KEYWORD-MATCH TEST: if a student who only memorised definitions could answer the question by matching a word in the stem to a definition, the question is functionally R1 — rewrite for the labelled cell.
6. TRUE/FALSE: If type is true_false and the statement is an obvious definition — rewrite to be a partial truth, misconception, or conflict statement that requires thinking.
7. REPETITION: If this tests the SAME skill as the "Other questions" list — flag and suggest a different angle.
8. ANSWER LEAK (three forms):
   (a) WORD/ROOT LEAK — does the stem contain the answer or a morphological variant (e.g., "bud" in stem when answer is "Budding")? If yes, rewrite.
   (b) DEFINITION-PHRASE LEAK — does the stem reproduce the textbook definition of the answer (e.g., "small outgrowth detaches and grows" when answer is "Budding")? If yes, replace the definition with a specific named instance or scenario.
   (c) WRONG-CATEGORY-SWAP DISTRACTORS — is every wrong option just "the other category" with no misconception encoded? If yes, rewrite each distractor to trace to a NAMED student error.
   COVER-THE-STEM TEST: cover the stem; can the answer be identified from option text alone? If yes, the stem is decorative.
9. RATIONALE HYGIENE: The rationale must reference the misconception that wrong-option-pickers held, must use only facts from stem/options/chapter, and must contain NO author meta-commentary ("higher grades", "though that's an exception", "note to teacher").
10. PRESERVE FIELDS: Keep misconception_id_targeted, misconception_reasoning_error, and per-option misconception_id / reasoning_error. Do not blank them out.

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
  R1: `R1 — Remember (DOK1). Student RETRIEVES/NAMES a fact from memory.
OPERATIONAL TEST: A student who has only memorised the definitions can answer this. That is the legitimate use of R1.
Stem format MUST be a direct question or one-sentence statement. NO scenario framing. NO character names. NO "Consider the case..." / "Imagine that..." openers. CAP at ~15-20% of the bank — research shows U2/A2 produce the strongest items.`,

  U1: `U1 — Understand (DOK1). Student EXPLAINS / INTERPRETS / GIVES REASON.
OPERATIONAL TEST: Memorising the definition alone is NOT enough — the student must explain why or how, or interpret a textbook-style statement.
Prefer direct "Why" / "How" framing or statement-then-question. Scenario opener forbidden.`,

  U2: `U2 — Understand / Compare-Classify (DOK2). Student weighs TWO+ cases or features.
OPERATIONAL TEST: The stem must contain at least one of: (a) two cases the student must compare on a stated criterion, (b) a feature that fits MULTIPLE categories so the student picks the one that fits BEST, or (c) a borderline case that requires applying the criterion. If the stem has only one case and one defining feature, the item is U1, not U2 — rewrite.
Surface form: "A has X but B has Y — which …", "Which feature distinguishes …".`,

  A2: `A2 — Apply (DOK2). Student APPLIES a learned rule to a NEW concrete example or to a case where surface features mislead.
OPERATIONAL TEST: A student who only matches keywords (stem→definition) MUST FAIL this item. The stem must either (a) place the rule in a context the student has not seen verbatim in the textbook, or (b) describe a case where one cue would mislead and the student must apply the criterion (e.g., a tall non-woody plant — height suggests tree, but stem texture says herb).
If the stem can be solved by reading a textbook definition off the stem, the item is functionally R1 — rewrite.`,

  A3: `A3 — Apply (DOK3). Student APPLIES rules across MULTIPLE STEPS or combines conditions.
OPERATIONAL TEST: The solution requires chaining ≥2 distinct rules or combining ≥2 conditions. A single rule applied once = A2, not A3.
Present non-routine problems where the student must sequence reasoning.`,

  AN2: `AN2 — Analyse / Pattern Inference (DOK2). Student INFERS a pattern from data or evidence.
OPERATIONAL TEST: The stem must present DATA (table, graph, observed values, listed cases) and ask the student to identify what is consistent, what is missing, or what trend applies. Prose-only "what type of plant" items are not AN2.`,

  AN3: `AN3 — Analyse / Evaluate Reasoning (DOK3). Student JUDGES an argument or claim.
OPERATIONAL TEST: The stem must present a CLAIM (often by a fictional student, often deliberately wrong) and ask the student to evaluate the reasoning, identify the flaw, or compare two interpretations.
Surface form: "Riya claims X because Y. Is her reasoning correct?" / "Two students disagree …".`,
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

// --- Image Prompt Template (NCERT-style, optimised for OpenAI gpt-image-2) ---
// gpt-image-2 follows instructions tightly and respects negative constraints
// well. The template focuses on (a) one clear visual subject, (b) a hard
// no-text rule (so the image can't accidentally reveal the answer), and
// (c) a clean classroom-textbook aesthetic that matches the surrounding
// question card.
// Follows OpenAI's recommended ordering for gpt-image-2:
// Background → Subject → Key Details → Constraints. Avoids negative-prompt
// phrasing ("do not draw…") because gpt-image-2 doesn't honour those
// reliably; uses positive framing instead. {description} should be the
// question's image_desc field — a noun-phrase description of the answer
// subject — not the raw stem.
export const IMAGE_PROMPT_TEMPLATE = `BACKGROUND
Plain solid white background, #FFFFFF only. Treat the canvas as a single classroom textbook page. The frame is calm, uncluttered, with generous safe margins.

SUBJECT
{description}

KEY DETAILS
- Style: clean flat vector illustration, NCERT / Indian school textbook aesthetic.
- Linework: crisp, even line weight; solid fills over textures or hatching.
- Palette: bright but restrained — natural greens / earthy browns / sky blues for biology; primary colours for physics / chemistry diagrams; pastel tints for backgrounds inside subjects (not the canvas). No neon, no gradient washes.
- Composition: 4:3 aspect ratio, single focused subject occupying 60–80% of the frame, centred with even white space around it.
- Proportions and biology must be accurate at a textbook level: a tree is taller than a shrub is taller than a herb; a heart has four chambers; a triangle's interior angles sum to 180°.
- Typography (only when SUBJECT calls for labels): clean sans-serif, sentence case OR all caps as the SUBJECT specifies. Set every label EXACTLY as written in the SUBJECT description (verbatim spelling — copy each label character-for-character; do not paraphrase or re-letter). Use thin leader lines from label to part where applicable.

CONSTRAINTS
- Only the subject described above is rendered; the frame contains nothing extra.
- All visible text matches the SUBJECT description verbatim, with correct spelling.
- The frame contains zero answer hints — no ticks, stars, circles, arrows pointing at "the right one", and no option lettering (A / B / C / D) inside the image.
- People appear only when the SUBJECT explicitly says so; when present, drawn as a neutral cartoon figure from a back or three-quarter view, no recognisable real-person faces.
- The background remains pure white from edge to edge.

OUTPUT
A teacher should be able to print this on plain paper at half-page size and a 10-year-old should recognise the subject in under two seconds.`;

export function buildImagePrompt(stem: string, subject: string, _grade: string): string {
  const base = IMAGE_PROMPT_TEMPLATE.replace('{description}', stem.slice(0, 600));
  const subLower = (subject || '').toLowerCase();
  let hint = '';
  if (subLower.includes('math')) {
    hint = `

MATH-SPECIFIC: Show the concept visually — geometric shapes with EXACT proportions, number lines with numeric tick marks, fraction bars / circles, grouped objects for counting, place-value blocks, coordinate grids with axis labels (x / y) and tick numerals. Label vertices (A, B, C), sides (a, b, c), and angles where the question requires the student to refer to them. Show given quantities (lengths, angles, weights) but NEVER the unknown / the answer.`;
  } else if (subLower.includes('phys')) {
    hint = `

PHYSICS-SPECIFIC: Clean schematic style — vector arrows for forces / velocity / fields with text labels (e.g., "F", "v", "g") next to each arrow. Circuit diagrams use standard symbols with component labels (R, V, A). Free-body diagrams show labelled blocks with directional force arrows. Ray diagrams label the object, image, lens / mirror, and focal points (F, 2F).`;
  } else if (subLower.includes('chem')) {
    hint = `

CHEMISTRY-SPECIFIC: Ball-and-stick or skeletal molecular illustrations with atom symbols on coloured spheres (C / H / O / N). Lab apparatus drawn cleanly: beakers, flasks, test tubes, retort stands, with content labels where useful. Reactions can show before/after states or colour change. Show formulas only when the question is ABOUT the formula.`;
  } else if (subLower.includes('bio') || subLower.includes('sci')) {
    hint = `

BIOLOGY / SCIENCE-SPECIFIC: NCERT textbook diagram style. Show organisms, body parts, cells, food webs, life-cycle stages, experimental setups. Label anatomical parts with thin leader lines and clean sans-serif text ("nucleus", "chloroplast", "petal", "stamen") UNLESS the question is asking the student to identify those exact parts — in that case omit the labels for the parts being tested. Anatomy must be biologically accurate at a textbook level.`;
  } else if (subLower.includes('social') || subLower.includes('geo') || subLower.includes('hist')) {
    hint = `

SOCIAL STUDIES-SPECIFIC: Maps include country / state / feature names where the question expects the student to read them, omitted where the student is asked to identify them. Compass roses and scale bars when relevant. Historical scenes use neutral period-appropriate clothing and props; no recognisable specific individuals. Timelines have horizontal axes with date labels at clean intervals.`;
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

// Grade-tier → visual-question ratio (bijit's spec).
//   Primary   1-5  : min 50%, max 60% of the set should be image-based
//   Upper     6-8  : 30-40%
//   High      9-12 : 10-20% (can exceed on visual-heavy topics)
export function getImageRatioForGrade(grade: string | number | undefined): { minPct: number; maxPct: number } {
  const tier = getGradeTier(grade);
  if (tier === 'primary') return { minPct: 50, maxPct: 60 };
  if (tier === 'upper-primary') return { minPct: 30, maxPct: 40 };
  if (tier === 'high') return { minPct: 10, maxPct: 20 };
  return { minPct: 20, maxPct: 35 }; // unknown grade — conservative default
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
