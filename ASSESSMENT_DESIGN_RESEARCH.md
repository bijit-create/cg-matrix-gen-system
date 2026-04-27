# Assessment Item Design — Evidence-Based Research

This document summarises the academic research used to design the question generation prompts in the CG-Matrix Gen System. Every prompt rule traces back to published research.

---

## 0. Stage F: Misconception-Driven Generation (the seven rules)

These seven rules govern generation in the current system. Each addresses a documented systemic failure mode in topic-driven item generation.

### Rule 1 — No answer leak in the stem
The stem must not contain the defining word(s) of the correct answer or a near-synonym. If the answer is a category (creeper / herb / shrub / climber), the stem cannot include the textbook-definition phrase that gives that category away — otherwise the item collapses to vocabulary matching.

- **Bad:** "A plant has a soft tender green stem. What type of plant is this?" (answer: herb — the definition IS the stem)
- **Good:** "Mint plants are commonly grown in kitchen gardens at knee height. What type of plant is mint?" (forces application to a specific named plant)

**Enforced by:** GenerationStage1 prompt explicit ANSWER LEAK block; `checkAnswerLeak()` in [`ruleBasedQA.ts`](src/agents/ruleBasedQA.ts) flags when ≥60% of significant tokens of the answer appear in the stem.

### Rule 2 — Coverage matrix driven by misconceptions × cognitive levels
The system maintains explicit per-cell misconception coverage. Each slot in a cell is round-robin-assigned a different `misconception_id` from the approved list, and the audit's `misconception_coverage` set-level check warns if two questions in the same cell target the same misconception.

**Why it matters:** Topic-driven generation produces redundant probes (~5 distinct conceptual probes across 15 items). Misconception-driven generation forces every distractor and every edge case to earn its place.

### Rule 3 — Every distractor traces to a named misconception
Every wrong option must carry both `why_wrong` (required) AND either a `misconception_id` from the approved list OR a typed `reasoning_error` from the fixed list (`over-generalisation`, `over-specification`, `size-based-classification`, `culinary-vs-botanical-confusion`, `feature-conflation`, `category-overlap-misjudged`, `rule-application-error`, `unit-or-notation-error`, `sign-or-direction-error`, `procedural-skip`, `definition-recall-only`).

**Enforced by:** GenerationSchema makes `why_wrong` required; per-option `misconception_id` and `reasoning_error` schema fields; `checkDistractorSource()` audit fails any wrong option that traces to neither.

### Rule 4 — Bloom-level honesty
Cognitive levels are defined operationally, not by label. CellRules state for each level what the student must be doing that they couldn't do with definitions alone. The keyword-match-solvability test: if a student who only memorised definitions could answer by matching a stem word to a definition, the item is functionally R1 — regardless of its label.

**Enforced by:** [`prompts.ts` CellRules](src/agents/prompts.ts) operational tests; multiPerspective.ts pedagogical lens explicit keyword-match-solvability probe.

### Rule 5 — ~20–30% of items hit edge/boundary cases
ContentScopingAgent flags knowledge points as `edge-case` when they're documented boundary cases for the domain (banana / sugarcane / bamboo for plant taxonomy; zero / improper / mixed / negative for fractions; equilibrium / balanced-but-moving for forces). The orchestrator distributes ≥20% of slots per cell to edge-case content when available; the audit's `edge_case_coverage` set-level check warns when below threshold.

**Why it matters:** Without edge-case discipline, generation only confirms canonical-example recognition. Edge cases are where misconceptions live (Hatzinikita & Koulaidis on plant categorisation, Tunnicliffe & Reiss on children's plant taxonomies).

### Rule 6 — Rationale hygiene
Rationale must (a) reference the misconception that wrong-option-pickers held, (b) use only facts from stem/options/chapter, (c) contain no author meta-commentary ("higher grades", "though that's an exception", "note to teacher").

**Enforced by:** `checkRationaleHygiene()` in ruleBasedQA.ts checks for meta-commentary phrases AND verifies the rationale references either the misconception text or a `why_wrong` reasoning.

### Rule 7 — Image discipline (form, not material)
Images can show **form** (height, branching, posture, leaf shape, # of stems, orientation). Images **cannot** reliably show **material properties** (tender vs woody, soft vs hard, smooth vs rough). If correctness depends on the student perceiving a material property from an image, move the cue into named-plant context or set `needs_image=false`.

**Enforced by:** IMAGE_DESC RULE 5 in GenerationStage1 (rewritten to ban tactile classification cues); `checkImageMaterial()` warns when `needs_image=true` and the stem hinges on tender/woody/soft/hard/smooth/rough/etc.

---

## 1. Item Writing Rules (Haladyna-Downing-Rodriguez, 2002)

**Source:** Haladyna, T.M., Downing, S.M., & Rodriguez, M.C. (2002). A review of multiple-choice item-writing guidelines for classroom assessment. *Applied Measurement in Education* 15(3), 309-333.

31 validated guidelines from 46 textbooks and 27+ research studies.

### Stem Rules
- Present a single, clearly formulated problem in the stem
- Include as much of the item in the stem as possible — keep options short
- Use positive phrasing — avoid "NOT", "EXCEPT", "LEAST" (these test reading, not content)
- Do NOT use "Which of the following is true/false?" — too vague

### Option Rules
- Use 3-4 options (research: 3 options optimal — Rodriguez 2005 meta-analysis of 80 years of data)
- Make all options plausible — non-functional distractors (<5% selection) waste space
- Make options similar in length, grammatical structure, and complexity
- The correct answer should NOT be systematically longer than distractors
- Place options in logical order (alphabetical, numerical, chronological)
- NEVER use "All of the above" or "None of the above"
- NEVER use absolute qualifiers ("always", "never", "all", "none")
- Avoid overlapping options

### Content Rules
- Each item tests ONE cognitive demand — don't mix recall and application
- Items must be independent — answering one should not depend on another
- Avoid verbatim textbook language — test understanding, not memorisation
- Use novel contexts to test application (not seen in the textbook)

---

## 2. Distractor Design (Evidence-Based)

### Rodriguez Attractor Framework (2014)
**Source:** Rodriguez, M.C. (2014). Construct equivalence of multiple-choice and constructed-response items.

- Reframe "distractors" as "attractors" — each wrong option must ATTRACT students with a specific misconception
- Every attractor must contain diagnostic information — choosing it reveals a specific reasoning error
- Attractors should be more frequently chosen by lower-ability students

### Distractor Sourcing Hierarchy (Gierl, Bulut, Guo & Zhang, 2017)
**Source:** *Review of Educational Research* 87(6), 1082-1116.

Three sources in priority order:
1. **Published misconception research** for the concept and grade band (highest validity) — see Section 8 below for the canonical Indian-context + cross-domain source list
2. **Empirical distractor data** — which wrong answers do students actually choose? Think-aloud protocols.
3. **Expert anticipation** — content specialists model common student reasoning errors

### Force Concept Inventory (FCI) Model (Hestenes et al., 1992)
Gold-standard method:
1. Administer open-ended questions first
2. Collect most common wrong answers
3. Use those as MC distractors

### Eedi Diagnostic-Question Methodology
**Source:** Wang, Lamb, Saveliev et al. (2020). *NeurIPS 2020 Education Challenge*. arXiv:2007.12061.

17M+ student responses to multiple-choice math diagnostic items where each distractor is labelled with a specific misconception. Currently the **largest publicly accessible misconception-tagged item dataset** — natural model for the Stage F per-distractor `misconception_id` design.

### Non-Functional Distractor (NFD) Detection
- A distractor chosen by <5% of students is non-functional
- NFDs should be replaced with misconception-based alternatives
- Goal: every distractor should be chosen by at least 5% of students, predominantly by lower-scoring ones

---

## 3. Cognitive Demand Frameworks

### Hess Cognitive Rigor Matrix
**Source:** Hess, K. (2009). Cognitive Rigor: Blending the Strengths of Bloom's Taxonomy and Webb's Depth of Knowledge. (ERIC ED517804)

Superimposes Webb's DOK (rows) with Bloom's revised taxonomy (columns). Each cell represents a unique cognitive demand — not just difficulty.

### Webb's Depth of Knowledge (1997)
- **DOK 1:** Recall — facts, definitions, simple procedures
- **DOK 2:** Skill/Concept — requires mental processing beyond recall, comparing, classifying
- **DOK 3:** Strategic Thinking — requires reasoning, planning, multi-step
- **DOK 4:** Extended Thinking — investigation, complex reasoning (not used in MC items)

### Anderson-Krathwohl Revised Taxonomy (2001)
Two dimensions:
- **Knowledge:** Factual, Conceptual, Procedural, Metacognitive
- **Cognitive Process:** Remember, Understand, Apply, Analyse, Evaluate, Create

### Stage F operational tests (per-cell)

| Cell | Operational test |
|---|---|
| R1 | A student who only memorised definitions can answer (this is legitimate at R1) |
| U1 | Definitions alone are NOT enough — must explain why/how |
| U2 | Stem contains ≥2 cases, a feature that fits multiple categories, OR a borderline case |
| A2 | Place rule in NOVEL context OR include a misleading cue (height suggests tree, texture says herb). **Must fail keyword-match-solvability** |
| A3 | Solution chains ≥2 distinct rules |
| AN2 | Stem presents data; student infers a pattern |
| AN3 | Stem presents a (often deliberately wrong) student claim; learner judges the reasoning |

---

## 4. Conceptual-Change Frameworks (for tagging misconceptions)

The Stage F distractor `reasoning_error` typed list and the per-question `misconception_reasoning_error` field draw on these frameworks. Tag each misconception entry with one when possible.

- **Knowledge-in-pieces / p-prims** — diSessa (1988, 1993): fragmented intuitive elements ("closer means stronger")
- **Mental models** — Vosniadou & Brewer (1992, 1994); Chi (2008): coherent naive models (flat-Earth, dual-Earth)
- **Ontological categories** — Chi (2005): heat as substance vs process; force as property vs interaction
- **Conceptual change** — Posner, Strike, Hewson, Gertzog (1982): dissatisfaction → intelligible / plausible / fruitful
- **Framework theory** — Vosniadou (1994, 2008): synthetic models combining naive theories with scientific input
- **Threshold concepts** — Meyer & Land (2003, 2006): transformative, irreversible, integrative, counterintuitive
- **Naive theories / folk biology** — Carey (1985); Inagaki & Hatano
- **Learning progressions** — NRC (2007) *Taking Science to School*; Smith, Wiser, Anderson, Krajcik (2006)
- **Facets of knowledge** — Minstrell (1992); DIAGNOSER (diagnoser.com): distractors mapped to numbered facets — closest precedent for the Stage F library design

---

## 5. Content Selection

### Content Sampling
- Assessment samples from a large universe of possible learning outcomes
- Cannot test everything — must sample strategically
- Items selected to infer broader competency
- Content selection must balance across difficulty and cognitive complexity

### Stimulus Selection Principles (ETS)
- **Unfamiliar but accessible**: content is new to students (not from their textbook) but language complexity and required background knowledge are within reach
- Ensures measurement of comprehension, not recall
- Stimuli (tables, charts, passages) must support measurement, not confound difficulty

### Item Specification Structure (Gierl's AIG Framework)
- **Radicals**: structural elements that affect difficulty and cognitive requirements
- **Incidentals**: surface features (names, numbers) that don't alter difficulty
- Example: changing "Riya" to "Aarav" is incidental; changing "recall" to "apply" is radical

### Edge-Case Discipline (Stage F Rule 5)
- ContentScopingAgent flags `edge-case` knowledge points alongside `core` / `supporting` / `advanced`
- Orchestrator distributes ≥20% of slots per cell to edge-case content when available
- Edges are model-driven from chapter content + domain knowledge; no hardcoded dictionary

---

## 6. Readability & Grade Appropriateness

### Flesch-Kincaid Grade Level
- Formula: 0.39(words/sentences) + 11.8(syllables/words) − 15.59
- Outputs approximate US grade level

### Indian Curriculum Standards (NCF 2023 / NEP 2020)
- **Foundational** (ages 3-8): concrete, everyday, sensory
- **Preparatory** (ages 8-11): structured, sequential, familiar contexts
- **Middle** (ages 11-14): abstract thinking begins, textbook terminology
- **Secondary** (ages 14-18): technical, analytical, disciplinary language

### Grade Scope Agent
The system runs a per-batch GradeScopeAgent that emits a structured profile (notation, number_range, vocabulary, familiar_contexts, in_scope, out_of_scope, stem_cap_words, concrete_lock) used by GenerationStage1. The audit's `grade` category flags out-of-scope concept names in stems.

---

## 7. Quality Metrics (Post-Generation)

### Item Analysis
| Metric | Target | Meaning |
|---|---|---|
| Difficulty (p-value) | 0.30-0.70 | Moderate — discriminates well |
| Discrimination (D) | ≥ 0.30 | Good — distinguishes high/low performers |
| Item-Total Correlation | Positive | Measures alignment with overall test |
| Distractor Selection | ≥ 5% each | All options functional |

### TIMSS/PISA Review Criteria
- Long, thorough development process
- National research coordinators verify appropriateness for education system
- Not based on any single country's curriculum
- International agreement on important content

### AERA/APA/NCME Standards (2014)
- Validity: does the test measure what it claims?
- Reliability: Cronbach's alpha ≥ 0.60
- Fairness: no discriminatory language or bias
- Accessibility: appropriate for diverse populations

### Treagust Two-Tier / Four-Tier Diagnostic Methodology
- Treagust (1988) *IJSE* 10(2):159 — student picks answer + reason; separates false positives from genuine understanding
- Four-tier extension (Caleon & Subramaniam 2010) adds confidence ratings — useful for downstream pilot validation of any item we ship

---

## 8. Authoritative Misconception Sources (subject-tiered)

The MisconceptionAgent grounded-search seed list rotates these by detected subject so the agent draws from peer-reviewed inventories rather than blog posts.

### Indian-context (priority for CBSE / ICSE / state boards)
- HBCSE / TIFR — Ramadas, Chunawala, Karen Haydock, Narendra Deshmukh, K. Subramaniam, Jyotsna Vijapurkar, Shamin Padalkar, Savita Ladage, Sapna Sharma
- epiSTEME conference proceedings 1–9 (HBCSE) — episteme9.hbcse.tifr.res.in
- Eklavya Hoshangabad Science Teaching Programme bibliography — eklavya.in
- NCERT exemplar problems + *Voices of Teachers and Teacher Educators*
- Azim Premji University: *At Right Angles*, *Learning Curve*

### Cross-domain inventories
- **Physics:** PhysPort.org/assessments — FCI (Hestenes 1992), FMCE (Thornton & Sokoloff 1998), TUG-K (Beichner 1994), BEMA, CSEM; AAAS Project 2061 Energy Assessment (Herrmann-Abell & DeBoer 2018); MOSART (Sadler, Harvard)
- **Chemistry:** Taber (2002, 2009) *Chemical Misconceptions* (RSC, 2 vols); Mulford & Robinson (2002) Chemical Concepts Inventory; Treagust two-tier methodology
- **Biology:** CINS — Anderson, Fisher, Norman (2002) *JRST* 39:952; CANS (Kalinowski et al. 2016); GCA (Smith, Wood, Knight 2008); Driver et al. (1994) *Making Sense of Secondary Science*; Deshmukh (2012); Haydock (2013, 2014)
- **Earth/Space:** MOSART; Vosniadou & Brewer (1992, 1994); Padalkar & Ramadas (2009)
- **Mathematics:** CSMS / Hart (1981) *Children's Understanding of Mathematics: 11–16*; Eedi NeurIPS dataset (arXiv:2007.12061); Stacey & Steinle Decimal Comparison Test; Booth & Koedinger algebra; van Hiele (1986); Subramaniam & Banerjee HBCSE; Calculus Concept Inventory (Epstein 2013)
- **CS:** SCS1 (Parker, Guzdial, Engleman 2016); BDSI (Porter et al. 2019, 2022); MG-CSCI (Rachmatullah et al. 2020) — middle school CS instrument
- **Economics:** Test of Economic Literacy (Walstad, Rebeck, Butters 2013); TEK (grades 8-9); BET (grades 5-6)
- **History/Civics:** Wineburg (2001); Seixas & Morton (2013); Stanford History Education Group "Beyond the Bubble"
- **Cross-cutting:** Pfundt & Duit STCSE bibliography (IPN Kiel) — 8000+ refs; AAAS Project 2061; DIAGNOSER

### Validation rubric (per library entry)
A defensible source meets ≥4 of:
1. Sample size N>500 or independent replications
2. Psychometric reporting (Cronbach's α, IRT difficulty/discrimination)
3. Distractor-level evidence (specific distractor chosen by ≥10% of sample)
4. Age range explicit
5. Geographic/linguistic context noted
6. Primary source cited, not aggregator-only
7. Peer-reviewed journal preferred (epiSTEME proceedings count for Indian context)

### WEIRD-sample caveat
Most CIs are validated on Western, Educated, Industrialised, Rich, Democratic samples (Henrich, Heine, Norenzayan 2010 *Nature*). For Indian deployment: pilot before deployment; translation is not validation; curriculum sequencing differs (Indian students see kinematics graphs in Class 9, evolution recently removed from Class 10).

---

## 9. Number of Options (Meta-Analysis)

**Source:** Rodriguez, M.C. (2005). Three options are optimal for multiple-choice items. *Educational and Psychological Measurement* 65(2), 3-30.

- 3 options is optimal for most assessment contexts
- 3-option items provide similar quality as 4-5 option items
- Benefits: better content validity, faster student response (36s vs 41s)
- We use 4 options for compatibility with existing question bank formats

---

## Key Sources

1. Haladyna, T.M. & Downing, S.M. (1989). A taxonomy of multiple-choice item-writing rules. *Applied Measurement in Education* 2(1), 37-50.
2. Haladyna, T.M., Downing, S.M., & Rodriguez, M.C. (2002). A review of MC item-writing guidelines. *Applied Measurement in Education* 15(3), 309-333.
3. Rodriguez, M.C. (2005). Three options are optimal. *Educational and Psychological Measurement* 65(2), 3-30.
4. Gierl, M.J., Bulut, O., Guo, Q., & Zhang, X. (2017). Developing, analyzing, and using distractors. *Review of Educational Research* 87(6), 1082-1116.
5. Hess, K. (2009). Cognitive Rigor: Blending Bloom's and Webb's DOK. ERIC ED517804.
6. Anderson, L.W. & Krathwohl, D.R. (2001). *A Taxonomy for Learning, Teaching, and Assessing*.
7. Hestenes, D., Wells, M., & Swackhamer, G. (1992). Force Concept Inventory. *The Physics Teacher* 30, 141-158.
8. Treagust, D.F. (1988). Development and use of diagnostic tests to evaluate students' misconceptions. *IJSE* 10(2), 159-169.
9. Wang, Z., Lamb, A., Saveliev, E. et al. (2020). Diagnostic Questions: The NeurIPS 2020 Education Challenge. arXiv:2007.12061.
10. Driver, R., Squires, A., Rushworth, P., Wood-Robinson, V. (1994). *Making Sense of Secondary Science: Research into Children's Ideas*. Routledge.
11. Anderson, D.L., Fisher, K.M., Norman, G.J. (2002). Conceptual Inventory of Natural Selection. *JRST* 39:952.
12. Hart, K.M. (Ed.) (1981). *Children's Understanding of Mathematics: 11–16*. Murray.
13. Pfundt, H. & Duit, R. STCSE Bibliography (IPN Kiel) — archiv.ipn.uni-kiel.de/stcse.
14. Deshmukh, N. (2012). *A Study of Students' Misconceptions in Biology at Secondary School Level*. University of Mumbai PhD.
15. Haydock, K. (2014). An Analysis of the Treatment of Evolution by Natural Selection in NCERT Textbooks. *Voices of Teachers and Teacher Educators* Vol 2.
16. AERA, APA, NCME. (2014). *Standards for Educational and Psychological Testing*.
17. ETS. (2014). *Standards for Quality and Fairness*.
18. NCERT. *Exemplar Problems — Design Principles*.
19. NCF 2023 / NEP 2020 — Indian curriculum framework.
20. Henrich, J., Heine, S., Norenzayan, A. (2010). The weirdest people in the world? *Nature* 466.
