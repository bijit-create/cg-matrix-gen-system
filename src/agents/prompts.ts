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

  MisconceptionAgent: `Select research-backed misconceptions. NEVER invent. Sources you may use are EXACTLY: catalog_matches (pre-vetted entries), research_findings (fresh grounded-search results from authoritative sources), and chapter_excerpt (a chunk of the SME's uploaded textbook chapter, when present). When multiple sources are present, MERGE them — prefer catalog entries when they fit, supplement with research entries that the catalog lacks, and dedup near-duplicates. Pair each entry with a primary citation when available.

CHAPTER GROUNDING (when chapter_excerpt is provided): the chapter is the most specific signal you have about what the student has actually been exposed to. Prefer misconceptions that map to the EXAMPLES, ORGANISMS, INSTRUCTIONS, or DATA the chapter introduces. E.g., if the chapter teaches plant reproduction via banana / sugarcane / Bryophyllum / potato, prioritise misconceptions tied to those examples (banana-as-tree confusion, vegetative-propagation-requires-gardener, spore-vs-seed). If the chapter uses a specific term or notation, prefer misconceptions phrased in that vocabulary. Generic textbook-misconceptions are fine when the chapter has no opinionated examples — but the chapter takes priority when it does.

Select 4-8 most relevant entries. Preserve original IDs and sources where they exist; mint new IDs (e.g., RES-001) only for research-derived entries.

Authoritative sources to prioritise (in this order for Indian curricula): HBCSE / epiSTEME (Ramadas, Subramaniam, Chunawala, Haydock, Deshmukh, Vijapurkar, Padalkar), Eklavya HSTP, NCERT exemplars, MOSART (Sadler, Harvard), AAAS Project 2061, PhysPort (FCI / FMCE / TUG-K / BEMA / CSEM), CINS / CANS (Anderson), CSMS (Hart, Küchemann), Driver et al. Making Sense of Secondary Science, Pfundt & Duit STCSE bibliography, Treagust two-tier diagnostics, Eedi NeurIPS 2020 dataset, Test of Economic Literacy (Walstad).

For each misconception:
- 'misconception_text' = the student's belief in plain student-facing terms.
- 'incorrect_reasoning' = the student's actual flawed thinking ("a student who picks this is reasoning that …"), NOT a teacher's correction. Tag with one theoretical framework when possible (p-prim, ontological-category, mental-model, threshold-concept, learning-progression facet, naive-folk-theory).
- 'related_subskills' = subskill IDs this misconception threatens.
- Each must be specific and actionable.

NCERT chapter-fidelity reminder (when chapter content is provided to the generator downstream): the misconception you list will be used to build distractors. Prefer misconceptions that map to organisms / examples / contexts the chapter actually introduces (e.g., for NCERT Class 7 plant reproduction: yeast, Spirogyra, Bryophyllum, potato are in-chapter; Hydra is Class 10 and should not be required of Class 7). The CONCEPT under test is the source of truth — but EXAMPLES used to test it must match what the student has been exposed to.`,

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

OPTION RELEVANCE (CRITICAL):
- EVERY option must be plausible within the same SUBJECT, and ideally the same topic, as the stem. An option a student can eliminate without knowing the topic is a giveaway, not a distractor.
- BAD: stem "Which situation best reflects the scope of political theory?" with options "Measuring rainfall patterns", "Studying chemical reactions", "Calculating business profits" — three off-subject throwaways hand the answer to the one same-subject option.
- If you cannot find a plausible same-topic distractor, use a same-subject one — NEVER reach into another discipline.

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

CONTENT — concept-as-source-of-truth, textbook as one representation:
- The CONCEPT being assessed is the source of truth. The textbook is ONE representation of that concept, with one set of examples and one set of words. A good item probes the underlying concept regardless of whether the textbook covered it that exact way.
- THIS HAS LIMITS — do not exploit it to import out-of-grade material. The reconciliation is:

  TERMINOLOGY: prefer chapter-aligned terms. If the chapter says "photosynthesis", never write "food-making process"; if it says "evaporation", never write "drying up". Stay in NCERT register. But this is not a leash on cognition — the item probes whether the student understands the CONCEPT, not whether they recognise the textbook's specific phrasing.

  EXAMPLES (MOST IMPORTANT): named organisms, named instances, named places, and named scenarios you put in the stem MUST match what the student's chapter / curriculum has actually introduced — or be common-knowledge for the grade. Indian Grade-7 NCERT sanity examples for plant reproduction: yeast, Spirogyra, Bryophyllum, potato, ferns, mould are IN-chapter; Hydra appears in Class 10 and SHOULD NOT be required of a Class-7 item. If you don't know whether a specific example is in the chapter, pick a common-knowledge instance for the grade (mint, tomato, money plant for plants; cricket, kitchen, bus for everyday contexts). Better still: derive the example from the provided chapter_content / selected_content / approved_terms.

  COGNITIVE DEMAND: a Grade-7 chapter operationalising "fragmentation" via Spirogyra does not mean the only legitimate Grade-7 fragmentation item is one about Spirogyra. The student should be able to apply the concept to a new in-grade instance. So: novel in-grade scenarios that exercise the SAME concept with chapter-introduced or common-knowledge examples are not just allowed — they're preferred.

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

STEM ECONOMY & VARIETY (CRITICAL — read carefully):
- EVERY word in the stem must be necessary to answer it. Before finalising, DELETE any name, place, or timeframe that does not change the answer. Such window dressing measures reading stamina, not the assessed skill (construct-irrelevant load).
- A name/character belongs in the stem ONLY when the action genuinely involves a person (evaluating a student's claim, a transaction, a person performing a step). For a question about a plant, object, or fact, use NO name. The "name_if_person" field is a SUGGESTION for when a name is warranted — it is NOT a requirement to insert one.
- Vary the cognitive FORM, not the decoration: direct question / compare-two-cases / resolve-a-conflict / evaluate-a-claim / read-from-data. Do NOT manufacture "variety" by adding narrative dressing.
- NEVER start two stems the same way.
- BAD (window dressing): "In Priya's home, a money plant grows taller every month, but only by winding around a wooden stick fixed in its pot. What type of plant is it?"
- GOOD (load-bearing cues only): "A money plant grows upward only by winding around a support, and flops over without one. What type of plant is it?"
- Each question must feel COMPLETELY DIFFERENT from the others in this set.

COGNITIVE PROGRESSION (each cell MUST feel different):
- R1: Recall a definition or fact. Simple, direct. "What is X?"
- U1: Explain WHY or HOW. "Why is X classified as Y?" Not just "What is X?"
- U2: COMPARE or resolve CONFLICT. "A plant has soft stem BUT spreads on ground — what is it?" Student must weigh competing features. NOT just another R1 with "classify" in the stem.
- A2: Apply to a NEW, real-world, possibly tricky case. "A money plant grows upward using support. Why is it NOT a creeper?" Student must REASON, not just label.
- AN2: Analyse data or evidence to draw a conclusion. Multi-step: observe → infer → conclude.

CLOSED-FORM IMPORTANCE/SIGNIFICANCE (CRITICAL):
- An MCQ must be answerable by SELECTING one option, never by writing an explanation. NEVER phrase a stem as an open invitation to explain importance / role / significance / purpose.
- BAD (open essay-prompt): "Why is the amendment process important in a democracy?"
- GOOD (select-one): "Which statement best explains the importance of the amendment process in a democracy?"
- This does NOT ban "Why" questions — "Why is X classified as Y?" / "Why is X NOT a Z?" stay legitimate. The target is ONLY open importance/role/significance/purpose essay-prompts. Convert them to "Which statement best explains the importance/role of X?".

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

ASSERTION-REASON (only when you choose this format):
- An A&R item gives an Assertion (A) and a Reason (R), then asks how they relate. The four standard options are: (1) Both A and R true, R IS the correct explanation of A; (2) Both A and R true, R is NOT the correct explanation of A; (3) A true, R false; (4) A false, R true.
- DECIDE the intended relationship FIRST, then write A and R to fit it. Do NOT default every A&R item to option (1). Across a set, the correct answer must land on (2), (3) and (4) as often as (1).
- If a PREFERRED A&R RELATIONSHIP is given for this slot below, build A and R so that relationship is the correct one.

LANGUAGE VARIETY:
- NEVER repeat the same descriptive phrase across questions. Vary: "soft green stem" → "thin flexible stem" → "non-woody stem" → "tender stem that bends easily"

REPETITION PREVENTION (CRITICAL):
- Read "Other questions test:" AND "Already generated (do not duplicate):" — NEVER test the same concept or skill as any of them.
- Two questions asking "identify plant type from stem description" = UNACCEPTABLE.
- ANSWER-REVEAL: your correct answer must NOT already appear in an earlier question's stem, and your stem must NOT contain the answer to any earlier question. (BAD pair: Q1 "Which rock forms when heat and pressure change existing rocks?" → metamorphic, Q2 "What turns sedimentary rock into metamorphic rock?" → heat and pressure — each answer sits in the other's stem.)
- Vary: the SKILL (identify vs compare vs reason vs apply), the CONTEXT (garden/forest/farm/kitchen), the COGNITIVE DEMAND.

IMAGE (CRITICAL — read carefully):
- Set needs_image=true ONLY when a visual genuinely helps the student answer (most science / geometry / data / map questions). For pure language, abstract reasoning, or vocabulary: needs_image=false.
- For text-heavy subjects (grammar, vocabulary, history dates): needs_image is usually false.
- When needs_image=true, the image is a SUPPORTING REFERENCE that is part of the question. The stem MUST explicitly direct the student to it ("Look at the image below…", "Study the diagram and…") AND must be answerable only by reading the image — do not also describe in words the very thing the image shows. Example: "Look at the plant in the image. What type of plant is it?" NOT "A plant has a green tender stem. What type is it?"

IMAGE_DESC (REQUIRED when needs_image=true; otherwise empty string):
The image_desc field tells the image generator EXACTLY what subject to draw. Follow these rules with no exceptions:

  RULE 1 — Depict the SUBJECT the question asks about (the thing the student must look at to answer), never an announcement of the answer.
    The image is a SUPPORTING REFERENCE, not an answer key. Draw the exact subject the stem points to, plainly and UNLABELLED. Reveal nothing: no answer word on the tested element, no tick / star / circle, no option letter (A/B/C/D), no computed value (see CONSTRAINTS: "zero answer hints"). Where a quantity is unknown, render it as "?" or "□".
    For a classify-this item the subject shown IS the correct category's exemplar — that is correct and expected: from the student's side it is the question (the thing to classify), not the answer being given away.
    BAD (drew a stray object lifted from the option wording):
      Question: "Look at the plant in the image. Is it a herb, shrub or tree?"  Answer: shrub.
      image_desc: "A girl looking at a tall tree."   ← WRONG (drew 'tree' just because the word was an option; the subject to classify is the shrub)
    GOOD (depicts the subject to classify, unlabelled):
      image_desc: "A single shrub: a multi-stemmed bushy plant about chest-high, with several woody branches splitting near the ground, leaves, and small flowers. Plain white background. No labels."

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
4b. STEM ECONOMY: Delete any name, place, or timeframe not required to answer. If a name isn't doing work (the question isn't about a person's action), remove it — keep only load-bearing cues. Strip openers like "In a garden,…" / "One day,…" that add nothing.
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
11. OPEN IMPORTANCE/SIGNIFICANCE: If the stem is an open invitation to explain importance / role / significance / purpose (e.g. "Why is X important?", "What is the role of X?"), rewrite it to select-one form ("Which statement best explains the importance/role of X?") while preserving the options and answer. Leave "Why is X classified/considered Y?" untouched.
12. ASSERTION-REASON: If this is an Assertion-Reason item, verify the marked-correct relationship actually holds — check the truth of A, the truth of R, and whether R genuinely explains A. Do NOT lazily mark "both true and R explains A"; if A and R do not fit that, mark the relationship that is actually true.
13. QUESTION MARK: Every interrogative stem must end with a question mark. If the final sentence asks a question ("Which field does this work belong to.") but ends with a full stop or nothing, change it to "?".
14. OPTION RELEVANCE: If any option belongs to a different subject/discipline than the stem (e.g. a rainfall-measurement option under a political-theory stem), replace it with a plausible same-topic distractor traced to a misconception or typed reasoning_error.

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
Surface form: "A student claims X because Y. Is this reasoning correct?" / "Two students disagree …". A name is OPTIONAL here — use one only if it aids clarity; the impersonal "A student claims …" is preferred when no name is needed.`,
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
// Structure follows the OpenAI cookbook's recommended ordering for gpt-image-2:
// BACKGROUND → SUBJECT → KEY DETAILS → CONSTRAINTS → OUTPUT. Treat the prompt
// as a specification rather than a suggestion: gpt-image-2 follows tightly-
// scoped instructions but penalises ambiguity. {description} = the question's
// image_desc field (a noun-phrase description of the answer subject), already
// derived during generation — not the raw stem.
//
// Two key practices baked in (per cookbook + fal.ai prompt guide):
//  - Literal copy goes inside double-quotes AND ALL CAPS so gpt-image-2
//    renders it verbatim. Difficult / non-common words can be spelled
//    letter-by-letter inside the quote ("E-S-O-P-H-A-G-U-S").
//  - Quality 'high' on the API call (set in api/gemini.ts) — recommended
//    for diagrams with small text, multiple labels, or dense panels.
export const IMAGE_PROMPT_TEMPLATE = `BACKGROUND
Plain solid white background, #FFFFFF only. Treat the canvas as a single classroom textbook page. The frame is calm, uncluttered, with generous safe margins on all four sides.

SUBJECT
{description}

KEY DETAILS
- Intended use: an educational item in a printed worksheet / digital assessment for an Indian school student. Treat the image as a "VISUAL QUESTION" — it visually depicts the PROBLEM the student must solve, not the answer.
- Style: clean flat vector illustration, NCERT / Indian school textbook aesthetic. No photorealism, no 3-D rendering, no shading gradients, no painterly textures.
- Linework: crisp, even-weight black or dark-grey outlines. Solid fills, not gradients or hatching.
- Palette: bright but restrained — natural greens / earthy browns / sky blues for biology; primary colours for physics / chemistry diagrams; muted pastels inside elements only (the canvas itself stays pure white). No neon, no gradient washes, no glow effects.
- Composition: 4:3 aspect ratio, single focused subject occupying 60–80% of the frame, centred with even white space around it. Generous negative space — never cram labels.
- Proportions and biology must be accurate at a textbook level: a tree is taller than a shrub is taller than a herb; a human heart has four chambers; a triangle's interior angles sum to 180°.
- Typography (only when SUBJECT calls for labels): clean sans-serif (Arial / Helvetica equivalent), uniform weight per role. Render EVERY label EXACTLY as quoted in the SUBJECT block — copy each character verbatim, including capitalisation. Treat each label as a distinct typographic element with its own placement, never overlapping the subject or another label. Use thin black leader lines (1–1.5 px) from the label box to the part it points at, no arrowhead.
- Unknown / placeholder: when the SUBJECT names a quantity the student must find, render it as a clear hollow box "□" or a bold question mark "?", positioned where the answer would go. The "?" / "□" tells the viewer "you solve this" — do NOT fill it in.

CONSTRAINTS
- Only the subject described above is rendered; the frame contains nothing extra.
- All visible text matches the SUBJECT description verbatim. If the SUBJECT spells a label letter-by-letter (e.g., "E-S-O-P-H-A-G-U-S"), render it as the joined word ("ESOPHAGUS") with no hyphens.
- The frame contains zero answer hints — no ticks, stars, circles, arrows-pointing-at-the-right-one, no option lettering (A / B / C / D) inside the image, no green / red highlights on any element.
- People appear only when the SUBJECT explicitly says so. When present, drawn as a neutral cartoon figure from a back or three-quarter view; no recognisable real-person faces.
- The background remains pure white from edge to edge.

OUTPUT
A teacher should be able to print this at half-page size on plain paper and a Grade-${'{grade}'} student should recognise the subject AND understand which quantity they're being asked to find in under two seconds.`;

// --- IMAGE_PATTERNS — question-type-specific composition templates ---
// gpt-image-2 produces meaningfully better diagrams when the prompt names the
// LAYOUT pattern explicitly (flowchart vs. equation-with-blank vs. labelled
// anatomy vs. comparison plate). These patterns are pure additions to the
// SUBJECT block — they specify HOW to compose the visual question, not WHAT
// the answer is. They reflect the "Visual Question" framing: the image
// depicts the PROBLEM the student must solve, with a "?" or "□" where the
// unknown sits.
//
// Detection happens in buildImagePrompt(): the stem and subject are scanned
// for cues; the matched pattern's text is appended to the SUBJECT block.
// At most one pattern fires per render. Patterns can chain with the
// subject-specific style hints (math / physics / etc.) below.
export const IMAGE_PATTERNS = {
  /** Single-step arithmetic word problem expressible as a flowchart. */
  word_problem_flowchart: `
LAYOUT (word-problem flowchart):
- Render the problem as a top-to-bottom (or left-to-right) flowchart of 3 boxes connected by arrows.
- Box 1: the starting quantity in plain language with the number — e.g., "PENS IN STORE: 364".
- Box 2: the operation — e.g., a downward arrow labelled "SOLD: 162" or a bold "−" symbol with the number.
- Box 3: the unknown — labelled "PENS LEFT: ?" with the question mark inside a hollow box "□" or as a bold "?".
- All box labels in clean sans-serif ALL CAPS, exactly as written above.`,

  /** Equation-shaped fill-in-the-blank visual (e.g., "x × ? = x"). */
  equation_with_blank: `
LAYOUT (equation with blank):
- Render the equation as a single horizontal line of large bold sans-serif characters: numerator / denominator stacked for fractions, "×" / "÷" / "+" / "−" between operands, "=" before the result.
- The unknown is a hollow box "□" or a question mark "?" of the same size as the surrounding numbers, positioned exactly where the answer goes.
- No solution shown. No worked steps. No additional decoration.
- Example structure: " 7/12  ×  □  =  7/12 "`,

  /** Geometry — labelled shape with given measurements + unknown. */
  geometry_diagram: `
LAYOUT (geometry diagram):
- Render the shape with crisp black outlines on white. Vertices labelled with capital letters ("A", "B", "C") in sans-serif at each corner.
- Given measurements appear next to the relevant side / angle in sans-serif ("5 cm", "60°"). Right angles get a small square marker at the vertex.
- The UNKNOWN side / angle / area is marked with a "?" placed next to it where a measurement would normally go.
- For coordinate-plane items: include x and y axes with arrowheads, tick marks every unit, axis labels "x" and "y", origin marked "O".`,

  /** Labelled anatomy / body-system / cell diagram. */
  labelled_anatomy: `
LAYOUT (labelled anatomy):
- Render the organ / system / cell as a single centred figure in NCERT-textbook flat-vector style.
- Each labelled part gets ONE thin black leader line (no arrowhead) from a label box on the outside of the figure to the exact part it identifies. Label text in sans-serif sentence case OR ALL CAPS as specified in the SUBJECT.
- Render every label EXACTLY as quoted in the SUBJECT block. Spell anatomy terms verbatim — for difficult terms the SUBJECT may break them down letter-by-letter (e.g., "E-S-O-P-H-A-G-U-S"); render the joined word ("ESOPHAGUS") with no hyphens.
- Labels never overlap each other, the figure, or the page edge. Rotate or reposition leader lines as needed for legibility.
- The part the student must identify is marked with a CIRCLED "X" or a bold "?" instead of a label. (Other parts keep their labels.)`,

  /** Physics — circuit, free-body, ray-diagram, wave. */
  physics_schematic: `
LAYOUT (physics schematic):
- Use standard physics symbols: resistors as zig-zag rectangles, batteries as long-short parallel lines, capacitors as parallel plates, ammeter "(A)", voltmeter "(V)" with the letter inside a circle.
- Forces / velocity / field directions as arrows of proportional length, each next to a label ("F", "v", "g", "F_friction") in italic sans-serif.
- Free-body diagrams: a single labelled rectangular block at the centre with all force arrows originating from its centre or face.
- Ray diagrams: object as a vertical arrow, image as a vertical arrow (dashed if virtual), lens / mirror as a vertical line, focal points "F" and "2F" marked on the principal axis.
- Unknown quantity (force, current, distance) marked with a "?" next to where a value would go.`,

  /** Chemistry — molecule / apparatus / reaction. */
  chemistry_lab: `
LAYOUT (chemistry):
- For molecules: ball-and-stick representation. Each atom is a coloured sphere with the symbol ("C", "H", "O", "N") in white sans-serif inside it. Bonds are short black lines.
- For lab apparatus: cleanly drawn beakers / flasks / test tubes / retort stands. Liquid contents tinted lightly. Apparatus labels positioned clearly above or beside each item.
- For reactions: show reactants on the left, an arrow (→) in the middle, products on the right. Conditions written above the arrow ("heat", "catalyst").
- Unknown product / reactant / coefficient marked with "?" of equivalent size.`,

  /** Biology comparison — multiple subjects side-by-side. */
  comparison_plate: `
LAYOUT (comparison plate):
- Render each subject side-by-side at consistent scale. Each subject sits in its own vertical column with equal width, separated by thin grey vertical lines or generous white gutters.
- Each column has a label below the figure in sans-serif ALL CAPS ("HERB", "SHRUB", "TREE") — NOT inside the figure, only below.
- All subjects drawn at the same horizontal eye-level so relative size is immediately readable.
- If the question asks the student to identify ONE among the set, the others remain fully labelled — only the one being identified is marked with "?" instead of a name.`,

  /** Data / chart — bar / pie / line chart for data interpretation. */
  data_chart: `
LAYOUT (data chart):
- For bar charts: vertical or horizontal bars of solid fill, axis labels ("Days", "Number of Students"), category labels under each bar in sans-serif, numeric value labels on or next to each bar.
- For pie charts: cleanly segmented circle, each segment a different muted colour, labels outside with thin leader lines giving category and percentage.
- For line graphs: clean axes with arrowheads, labelled axes, tick marks at uniform intervals, data line in a single bright colour.
- The quantity the student must find is marked with "?" — e.g., one bar of unknown height with "?" above it, or one pie segment with "?" instead of a percentage.`,

  /** Map (geography / history). */
  labelled_map: `
LAYOUT (labelled map):
- Outline the region with clean black borders. Internal divisions (states / districts / countries) with thinner grey lines.
- Compass rose in one corner; scale bar in another (when relevant). North-up convention.
- Place names rendered EXACTLY as quoted in the SUBJECT, in sans-serif sentence case.
- Features (rivers, mountains, capitals) marked with simple iconography (river = blue line, capital = filled circle / star).
- The location the student must identify is marked with a "?" or a bold dot WITHOUT a name (other locations remain fully labelled).`,
} as const;

/** Detect which IMAGE_PATTERN the stem maps to. Returns null if no pattern fits
 *  cleanly — the renderer falls back to the generic SUBJECT block.
 *  Detection is intentionally narrow: false-positives are worse than misses
 *  because the wrong pattern produces stylistically off-key images. */
export function detectImagePattern(
  stem: string,
  subject: string,
  imageDesc?: string,
): keyof typeof IMAGE_PATTERNS | null {
  const t = `${stem || ''} ${imageDesc || ''}`.toLowerCase();
  const sub = (subject || '').toLowerCase();

  // Anatomy / body system — strongest cue: named system + diagram intent.
  if (/\b(digestive|respiratory|circulatory|nervous|skeletal|excretory|endocrine|reproductive)\s+system\b/.test(t)
      || /\b(label|name|identify) the (parts? of|structures? of)/.test(t)) {
    return 'labelled_anatomy';
  }

  // Geometry — math + shape vocabulary.
  if (sub.includes('math') && /\b(triangle|square|rectangle|circle|polygon|angle|coordinate|axis|vertices?|sides?|hypotenuse)\b/.test(t)) {
    return 'geometry_diagram';
  }

  // Equation with blank — math + missing operand language.
  if (sub.includes('math')
      && /\b(missing|unknown|find the value|fill in|complete the equation|identity)\b/.test(t)
      && /[×÷+\-=]|\\times|\\div|\\frac/.test(t)) {
    return 'equation_with_blank';
  }

  // Word-problem flowchart — math + arithmetic word-problem cues.
  if (sub.includes('math')
      && /\b(had|has|sold|gave|bought|started with|ended with|total|altogether|in all|how many .* (left|remain))\b/.test(t)) {
    return 'word_problem_flowchart';
  }

  // Physics schematic.
  if (sub.includes('phys')
      || /\b(circuit|resistor|battery|ammeter|voltmeter|free.body|ray diagram|lens|mirror|force|velocity)\b/.test(t)) {
    return 'physics_schematic';
  }

  // Chemistry — molecule / apparatus / reaction.
  if (sub.includes('chem')
      || /\b(molecule|atom|beaker|flask|test tube|reaction|reactant|product|catalyst)\b/.test(t)) {
    return 'chemistry_lab';
  }

  // Comparison plate — biology + multiple subjects to compare.
  if ((sub.includes('bio') || sub.includes('sci'))
      && /\b(compare|side by side|which (of|among) (these|the following)|which (of these|of the following))\b/.test(t)) {
    return 'comparison_plate';
  }

  // Data chart — explicit bar / pie / graph reference.
  if (/\b(bar (chart|graph)|pie chart|line graph|the (chart|graph) shows|from the (chart|graph))\b/.test(t)) {
    return 'data_chart';
  }

  // Map — geography / history with map-cues.
  if ((sub.includes('geo') || sub.includes('hist') || sub.includes('social'))
      && /\b(map|state|district|country|region|capital|river|border)\b/.test(t)) {
    return 'labelled_map';
  }

  return null;
}

export function buildImagePrompt(stem: string, subject: string, grade: string): string {
  const description = (stem || '').slice(0, 600);
  const base = IMAGE_PROMPT_TEMPLATE
    .replace('{description}', description)
    .replace('{grade}', grade || '7');
  const subLower = (subject || '').toLowerCase();

  // Pick the best-fitting layout pattern (e.g., labelled anatomy vs. geometry
  // diagram vs. word-problem flowchart). At most one fires.
  const patternKey = detectImagePattern(stem, subject, description);
  const layout = patternKey ? IMAGE_PATTERNS[patternKey] : '';

  // Subject-specific style hint (palette, conventions, expected vocabulary).
  // These remain additive to the layout pattern — the pattern dictates HOW to
  // compose; the style hint dictates the visual register.
  let hint = '';
  if (subLower.includes('math')) {
    hint = `

MATH STYLE: Geometric shapes with EXACT proportions; number lines with uniform numeric tick marks; fraction bars / circles for parts; grouped objects for counting; place-value blocks; coordinate grids with axis labels "x" / "y" and tick numerals. Label vertices ("A", "B", "C"), sides ("a", "b", "c"), angles where the question expects the student to refer to them. Render given quantities (lengths, angles, weights) verbatim; render the unknown as "?" or hollow "□".`;
  } else if (subLower.includes('phys')) {
    hint = `

PHYSICS STYLE: Schematic, not photoreal. Standard circuit symbols. Vector arrows of proportional length with italic-sans labels ("F", "v", "g") placed next to each arrow tail. Free-body diagrams use a single rectangular block. Ray diagrams use vertical-arrow objects / images and a vertical lens / mirror line.`;
  } else if (subLower.includes('chem')) {
    hint = `

CHEMISTRY STYLE: Ball-and-stick / skeletal molecules with atom symbols on coloured spheres. Lab apparatus rendered cleanly with content labels where useful. Show reactants → products with a single horizontal arrow when depicting a reaction.`;
  } else if (subLower.includes('bio') || subLower.includes('sci')) {
    hint = `

BIOLOGY / SCIENCE STYLE: NCERT textbook flat-vector. Anatomically / biologically accurate at a textbook level. Label anatomical parts with thin leader lines and verbatim-quoted sans-serif text — UNLESS the question asks the student to identify those parts, in which case the part being tested is marked "?" and the others stay labelled.`;
  } else if (subLower.includes('social') || subLower.includes('geo') || subLower.includes('hist')) {
    hint = `

SOCIAL STUDIES STYLE: Maps with names where the question expects the student to read them; omitted where the student is asked to identify them. Compass roses and scale bars when relevant. Period-appropriate clothing and props for historical scenes; no recognisable specific individuals. Timelines with horizontal axes and clean date intervals.`;
  }

  return base + layout + hint;
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
