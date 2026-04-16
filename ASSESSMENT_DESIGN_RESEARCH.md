# Assessment Item Design — Evidence-Based Research

This document summarises the academic research used to design the question generation prompts in the CG-Matrix Gen System. Every prompt rule traces back to published research.

---

## 1. Item Writing Rules (Haladyna-Downing-Rodriguez, 2002)

**Source:** Haladyna, T.M., Downing, S.M., & Rodriguez, M.C. (2002). A review of multiple-choice item-writing guidelines for classroom assessment.

31 validated guidelines from 46 textbooks and 27+ research studies:

### Stem Rules
- Present a single, clearly formulated problem in the stem
- Include as much of the item in the stem as possible — keep options short
- Use positive phrasing — avoid "NOT", "EXCEPT", "LEAST" (these test reading, not content)
- Do NOT use "Which of the following is true/false?" — too vague

### Option Rules
- Use 3-4 options (research: 3 options optimal — Rodriguez, 2005 meta-analysis of 80 years of data)
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

### Rodriguez "Attractor" Framework (2014)
**Source:** Rodriguez, M.C. (2014). Construct equivalence of multiple-choice and constructed-response items.

- Reframe "distractors" as "attractors" — each wrong option must ATTRACT students with a specific misconception
- Every attractor must contain diagnostic information — choosing it reveals a specific reasoning error
- Attractors should be more frequently chosen by lower-ability students

### Distractor Sourcing Hierarchy (Gierl, Bulut, Guo & Zhang, 2017)
**Source:** Review of Distractor Development, AERA.

Three sources in priority order:
1. **Published misconception research** for the concept and grade band (highest validity)
2. **Empirical distractor data** — which wrong answers do students actually choose? Think-aloud protocols.
3. **Expert anticipation** — content specialists model common student reasoning errors

### Force Concept Inventory (FCI) Model (Hestenes et al., 1992)
Gold-standard method:
1. Administer open-ended questions first
2. Collect most common wrong answers
3. Use those as MC distractors

### Non-Functional Distractor (NFD) Detection
- A distractor chosen by <5% of students is non-functional
- NFDs should be replaced with misconception-based alternatives
- Goal: every distractor should be chosen by at least 5% of students, predominantly by lower-scoring ones

---

## 3. Cognitive Demand Frameworks

### Hess Cognitive Rigor Matrix
**Source:** Hess, K. (2009). Cognitive Rigor: Blending the Strengths of Bloom's Taxonomy and Webb's Depth of Knowledge. (ERIC ED517804)

Superimposes Webb's DOK (rows) with Bloom's revised taxonomy (columns):

| Webb's DOK | Remember | Understand | Apply | Analyse |
|---|---|---|---|---|
| DOK 1: Recall | R1 | — | — | — |
| DOK 2: Skill/Concept | — | U2 | A2 | AN2 |
| DOK 3: Strategic Thinking | — | — | A3 | AN3 |

Each cell represents a unique cognitive demand — not just difficulty.

### Webb's Depth of Knowledge (1997)
- **DOK 1:** Recall — facts, definitions, simple procedures
- **DOK 2:** Skill/Concept — requires mental processing beyond recall, comparing, classifying
- **DOK 3:** Strategic Thinking — requires reasoning, planning, multi-step
- **DOK 4:** Extended Thinking — investigation, complex reasoning (not used in MC items)

### Anderson-Krathwohl Revised Taxonomy (2001)
Two dimensions:
- **Knowledge:** Factual, Conceptual, Procedural, Metacognitive
- **Cognitive Process:** Remember, Understand, Apply, Analyse, Evaluate, Create

---

## 4. Content Selection

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

---

## 5. Readability & Grade Appropriateness

### Flesch-Kincaid Grade Level
- Formula: 0.39(words/sentences) + 11.8(syllables/words) − 15.59
- Outputs approximate US grade level
- Used to ensure items match target student reading level

### Indian Curriculum Standards (NCF 2023 / NEP 2020)
- **Foundational** (ages 3-8): concrete, everyday, sensory
- **Preparatory** (ages 8-11): structured, sequential, familiar contexts
- **Middle** (ages 11-14): abstract thinking begins, textbook terminology
- **Secondary** (ages 14-18): technical, analytical, disciplinary language

### ETS TextEvaluator Metrics
Analyses: cohesion, syntax, vocabulary difficulty, word unfamiliarity, academic vocabulary, lexical cohesion, argumentation, narrativity.
Words with Standard Frequency Index < 50 should be replaced with higher-frequency synonyms unless the vocabulary IS the construct being measured.

---

## 6. Quality Metrics (Post-Generation)

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

---

## 7. Number of Options (Meta-Analysis)

**Source:** Rodriguez, M.C. (2005). Three options are optimal for multiple-choice items: A meta-analysis of 80 years of research.

- 3 options is optimal for most assessment contexts
- 3-option items provide similar quality as 4-5 option items
- Benefits: better content validity (more items in same time), faster student response (36s vs 41s)
- We use 4 options for compatibility with existing question bank formats

---

## Key Sources

1. Haladyna, T.M. & Downing, S.M. (1989). A taxonomy of multiple-choice item-writing rules. Applied Measurement in Education, 2(1), 37-50.
2. Haladyna, T.M., Downing, S.M., & Rodriguez, M.C. (2002). A review of MC item-writing guidelines. Applied Measurement in Education, 15(3), 309-333.
3. Rodriguez, M.C. (2005). Three options are optimal. Educational and Psychological Measurement, 65(2), 3-30.
4. Gierl, M.J., Bulut, O., Guo, Q., & Zhang, X. (2017). Developing, analyzing, and using distractors. Review of Educational Research, 87(6), 1082-1116.
5. Hess, K. (2009). Cognitive Rigor: Blending Bloom's and Webb's DOK. ERIC ED517804.
6. Anderson, L.W. & Krathwohl, D.R. (2001). A Taxonomy for Learning, Teaching, and Assessing.
7. Hestenes, D., Wells, M., & Swackhamer, G. (1992). Force Concept Inventory. The Physics Teacher, 30, 141-158.
8. AERA, APA, NCME. (2014). Standards for Educational and Psychological Testing.
9. ETS. (2014). Standards for Quality and Fairness.
10. NCERT. Exemplar Problems — Design Principles.
11. NCF 2023 / NEP 2020 — Indian curriculum framework.
