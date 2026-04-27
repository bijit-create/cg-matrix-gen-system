# How the CG-Matrix Gen System Works

## The Core Idea

The more control you give the system, the better questions you get. The more content you feed it, the more precise and curriculum-aligned the questions become. **Generation is misconception-driven, not topic-driven** — every question must claim what student error it probes, and every wrong option must trace to a named misconception.

---

## Two Modes

**Quick Generate** — Fast. Skill + LO, optionally upload content, click Generate. You get questions in 2–3 minutes. No approvals, no gates. Good for first drafts and practice worksheets. The output lands in the **Bank** the moment it completes.

**Full Pipeline** — You control every step. You review what the system extracts, approve what goes in, adjust the distribution, and check every question before it lands in the Bank. Takes 10–15 minutes. Built for production-quality question banks.

Both flows end the same way: questions land in the Bank → you click **Run Audit** → color-coded findings appear → you regenerate failing items with the audit feedback fed back into the prompt → export.

---

## What Happens in the Full Pipeline

### Step 1: Subskills

The system breaks your skill into 3–6 smaller testable actions.

**Why you review this:** You decide which subskills get tested.

### Step 2: Content Scope (Knowledge Points)

The system reads your uploaded chapter/PDF and extracts every fact that could become a question. Each knowledge point is tagged `core`, `supporting`, `advanced`, or `edge-case`.

**Edge cases** are documented boundary cases that resist clean classification — banana / sugarcane / bamboo for plant taxonomy; zero / improper / mixed / negative for fractions; equilibrium / balanced-but-moving for forces. The system identifies these from chapter content + domain knowledge of common student boundary confusions. **At least 20% of generated items consume edge-case content** so the bank doesn't only test canonical examples.

**Why you review this:** Deselect anything out of grade scope. Only approved points become questions. **More material = more precise questions.**

### Step 3: Hess (CG) Matrix

Grid that decides how many questions go at each cognitive level, with operational definitions:

- **R1 — Recall:** A student who only memorised definitions can answer. Capped at ~15-20% of the bank.
- **U1 — Understand:** Definition alone is insufficient — must explain WHY/HOW.
- **U2 — Compare/Classify:** Stem must contain ≥2 cases, a feature that fits multiple categories, or a borderline case.
- **A2 — Apply:** Stem places the rule in a NOVEL context OR contains a misleading cue (height suggests tree but texture says herb). **Must fail the keyword-match-solvability test.**
- **A3 — Multi-step apply:** Solution chains ≥2 distinct rules.
- **AN2 — Pattern inference:** Stem presents data; student infers a pattern.
- **AN3 — Evaluate reasoning:** Stem presents a (often deliberately wrong) student claim; learner judges the reasoning.

### Step 4: Misconception Sourcing

The system pulls misconceptions from `student_misconceptions_catalog.json` matched against your topic + content. When the catalog is thin, it grounds a search seeded with **subject-tiered authoritative sources**:

- **Indian-context (highest priority for CBSE / ICSE / state boards):** HBCSE / TIFR (Ramadas, Chunawala, Haydock, Deshmukh, Subramaniam, Vijapurkar), epiSTEME conference proceedings, Eklavya HSTP, NCERT exemplars, Azim Premji *At Right Angles*.
- **Physics:** PhysPort.org (FCI, FMCE, TUG-K, BEMA, CSEM), MOSART (Sadler/Harvard), AAAS Project 2061 Energy Assessment.
- **Chemistry:** Taber *Chemical Misconceptions* (RSC), AAAS Project 2061, Mulford & Robinson Chemical Concepts Inventory, Treagust two-tier methodology.
- **Biology:** CINS (Anderson 2002), CANS, GCA, Driver et al. *Making Sense of Secondary Science*, Deshmukh (2012), Haydock evolution work.
- **Earth/Space:** MOSART, Vosniadou & Brewer mental-models, Padalkar & Ramadas indigenous astronomy.
- **Mathematics:** CSMS / Hart (1981) *Children's Understanding of Mathematics: 11–16*, Eedi NeurIPS 2020 dataset, Stacey & Steinle Decimal Comparison Test, van Hiele levels, Subramaniam HBCSE primary math.
- **CS:** SCS1, BDSI, MG-CSCI.
- **Economics:** Test of Economic Literacy (Walstad).
- **Cross-cutting:** Pfundt & Duit STCSE bibliography, DIAGNOSER (Minstrell facets).

Each catalog entry is a record with `misconception_id`, `misconception_text`, `incorrect_reasoning`, and `related_subskills`.

### Step 5: Question Generation (Cell by Cell)

Questions are generated one cell at a time. Each slot in a cell is **pre-assigned a target `misconception_id`** by round-robin from the approved list, so parallel generation produces coverage without sequential gating. Per slot the generator must:

1. **Claim a `misconception_id_targeted`** — pick from the numbered list provided OR set `""` and pick a typed reasoning_error from the fixed list (`over-generalisation`, `over-specification`, `size-based-classification`, `culinary-vs-botanical-confusion`, `feature-conflation`, `category-overlap-misjudged`, `rule-application-error`, `unit-or-notation-error`, `sign-or-direction-error`, `procedural-skip`, `definition-recall-only`). **Inventing new misconceptions is forbidden.**
2. **Source every distractor.** Each wrong option carries `why_wrong` (required), plus `misconception_id` from the approved list OR a typed `reasoning_error`. Filler distractors (no source) fail the audit.
3. **Avoid answer leak.** The stem must not contain the defining word(s) of the correct answer or a near-synonym. If the answer is "creeper" (defined as "weak stem along the ground"), the stem can't say "weak stem along the ground" — it must describe a specific named plant or a behaviour from which the category must be inferred.
4. **Write a clean rationale.** Rationale references the misconception that wrong-option-pickers held; uses only facts from stem/options/chapter; contains no author meta-commentary ("higher grades", "though that's an exception").

Each question goes through Stage 1 (creative, temp 0.4) and Stage 2 (evaluative review, temp 0.1). Stage 2 explicitly preserves the misconception fields and re-runs the answer-leak / rationale-hygiene / Bloom-honesty checks.

### Step 6: Move to Bank

Approved questions land in the Bank. Auto-image-gen fires for any item with `needs_image=true` so the audit screen has the visuals to inspect.

---

## The Bank: Audit and Regenerate

### Run Audit

One click runs every check across the set. Each question gets a severity (`pass | warn | fail`) which is the worst of its flag severities; the AuditView renders color-coded cards (green/gold/red left border) and a summary with per-category pass-rate bars.

### Audit categories

Every flag is tagged with one of these (single source of truth in [`src/agents/audit.ts`](src/agents/audit.ts)):

| Category | What it checks |
|---|---|
| `rule` | Formatting, content, distractor hygiene, quality (Haladyna-Downing-Rodriguez rules) |
| `factual` | SME factual lens — answer correctness, units, multiple-correct |
| `pedagogical` | SME pedagogical lens — Bloom honesty, keyword-match-solvability, distractor diagnosticity |
| `language` | UK English, vocabulary appropriate to grade, no bias |
| `terminology` | Chapter-aligned terms (no NCERT-substitute synonyms) |
| `grade` | Out-of-scope concept names; concrete-lock for concrete skills |
| `scenario` | R1/U1 stems must be direct (no scenario opener); set-level scenario ratio ≤40% |
| `diversity` | Numerical-diversity Jaccard across stems |
| `image` | Set-level image-ratio floor by grade |
| `alignment` | LO keyword overlap; exact-duplicate stems |
| `distractor_source` | **F1.** Every wrong option must have `why_wrong` AND either a `misconception_id` or a typed `reasoning_error` |
| `misconception_coverage` | **F1.** Every question must claim a `misconception_id_targeted`; no two questions in the same cell may target the same id |
| `rationale_hygiene` | **F1.** Rationale references the misconception held by wrong-option-pickers; no author meta-commentary |
| `answer_leak` | **F2.** ≥60% of significant tokens of the correct answer appear in the stem (paraphrase test, not comprehension) |
| `image_material` | **F5.** `needs_image=true` AND stem hinges on a tactile/material keyword (tender/woody/soft/hard/etc.) — images can't carry tactile properties |
| `edge_case_coverage` | **F4.** Set-level — fewer than 20% of items hit an edge/boundary case (skipped when no edge-case content surfaced) |

### Regenerate with audit feedback

Click **Regenerate with feedback** on any audited card. The audit's flags get synthesized into a concise EXTRA-CONSTRAINT block that's appended to the regen prompt:

```
AUDIT FINDINGS — fix ALL of these in the regenerated question:
- answer_leak: Stem reproduces 4/5 significant tokens of the correct answer
- distractor_source: Distractor B has no misconception_id or reasoning_error
- pedagogical: Functionally R1 despite A2 label — student can solve by keyword match
```

The model regenerates with these constraints baked in. After regen, that single question is re-audited and the card colour updates live.

**Bulk:** "Regenerate all fails" / "Regenerate all warns" iterate the same loop serially.

---

## The Difference Between Pipeline and Quick Generate

| | Quick Generate | Full Pipeline |
|---|---|---|
| Input | Skill + LO + optional content | Same |
| Subskill decomposition | Automatic, no review | You select |
| Content scoping | Skipped — uses raw content | You approve each knowledge point + edge-case flag |
| Hess Matrix | Auto-allocated | You adjust per-cell counts |
| Misconception sourcing | Catalog + grounded search | Same, with subject-tiered seed list |
| Question review | All at once | Cell by cell with reject/switch/approve |
| Lands in Bank | Yes | Yes (after Gate 4) |
| Audit + regen-with-feedback | Yes | Yes |
| Time | 2–3 minutes | 10–15 minutes |
| Best for | Drafts, practice | Production banks, assessments |

---

## Why Content Matters

| What You Provide | What You Get |
|---|---|
| Just skill + LO | Generic questions; may not match your textbook |
| Skill + LO + chapter PDF | Questions grounded in YOUR textbook content; uses exact terminology, examples, data |
| Skill + LO + chapter + worksheet + YouTube | Highly specific questions; content scope shows exactly what was extracted from each source |

**More material = more edge cases identified = more precise questions = stronger misconception coverage.**

The system cannot invent what it doesn't have. It generates **FROM your content, not ABOUT your topic.**

---

## Image Discipline

Images can show **form**: height, branching pattern, growth direction, leaf shape, # of stems, posture, relative size.
Images **cannot** reliably show **material properties**: tender vs woody, soft vs hard, smooth vs rough, glossy vs matte. A child looking at a stylised illustration cannot perceive whether a stem is "tender" — that is a tactile property, not a visual one.

If a question's correct answer depends on the student perceiving a material property, the system either moves the cue into named-plant context (mint, pumpkin, mango tree) or sets `needs_image=false`. The audit's `image_material` check enforces this.

---

## Authoritative reference

The full sourcing roadmap with primary citations, theoretical-framework taxonomy, and Indian-context cross-references lives in:

- [ASSESSMENT_DESIGN_RESEARCH.md](ASSESSMENT_DESIGN_RESEARCH.md) — the seven Stage F rules + research basis
- [QA_RESEARCH.md](QA_RESEARCH.md) — Layer 1 rule-based + Layer 2 SME multi-perspective + Layer 3 misconception/answer-leak/Bloom checks
- [BENCHMARK_RESEARCH.md](BENCHMARK_RESEARCH.md) — convergent benchmark bank from NCERT / CBSE / TIMSS / PISA / NAEP
