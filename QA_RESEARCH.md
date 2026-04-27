# QA System Research — Evidence-Based

## Sources
- ETS Standards for Quality and Fairness (2014)
- Haladyna-Downing Item Writing Guidelines (1989, 2002)
- Rodriguez Distractor Analysis (2005, 2014)
- Gierl et al. Distractor Development Review (2017)
- AERA / APA / NCME Standards (2014)
- Treagust two-tier diagnostic methodology (1988)
- Eedi NeurIPS 2020 misconception-tagged distractor dataset (Wang, Lamb et al.)
- HBCSE / epiSTEME / NCERT (Indian-context misconceptions)
- NCF 2023 / NEP 2020

---

## Architecture

The audit runs in three layers, all aggregated into one typed `AuditReport` per question (single source of truth in [`src/agents/audit.ts`](src/agents/audit.ts)). Each flag carries `category`, `severity`, `message`, optional `fix` hint. Per-question severity = worst of its flag severities.

```
Question → Layer 1 (rule-based, instant) → Layer 2 (SME multi-perspective)
        → Layer 3 (Stage F: misconception threading + answer leak + image cue)
        → Set-level checks → AuditReport
```

The complete `AuditCategory` enum and display labels are in `audit.ts`. Adding a new category there propagates automatically to AuditSummary's category bars and AuditCard's per-flag pills.

---

## Layer 1: Rule-Based (Code-Level, Instant)

Implemented in [`src/agents/ruleBasedQA.ts`](src/agents/ruleBasedQA.ts). Runs against every question with no API calls.

### Formatting (`category: rule`)
- Capitalisation: stem starts lowercase → flag (minor)
- Punctuation spacing: space before , . ? ! → flag (minor)
- Double spaces → flag (minor)
- FIB: single `_` instead of `_____` or `##answer##` → flag (major)
- Stem length >150 chars → flag (minor)

### Content & Phrasing (`category: rule`)
- Negative phrasing: not, never, except, incorrect, false → flag (Haladyna Rule 10)
- Positional references: above, below, following → flag (breaks digital shuffle)
- Vague stems (no concrete data) → flag

### Quality Hygiene (`category: rule`)
- Dummy content: test, dummy, asdf, <3 chars → flag
- Inappropriate content: kill, murder, blood, shoot, gun, knife, death → flag
- Hint = question text, or hint < 5 chars → flag

### Distractor Quality (`category: distractor` / Haladyna)
- Lazy options: all/none of the above, both A and B → flag (Haladyna Rule 24)
- Length variance: one option >2.5× average → flag (gives away answer)
- Duplicate options → flag
- Combination options ("Both A and B", "I and III") → flag (test-wiseness, not cognition)
- Absolute qualifiers ("always", "never", "all", "none") in options → flag (Haladyna Rule 11)

### Localisation (`category: language`)
- US spellings: color, center, organize, analyze, behavior, flavor, meter, defense → flag with UK alternative

### Alignment & Duplicacy (`category: alignment`)
- Keyword overlap with LO: <5% Jaccard → flag
- Exact duplicate stems → flag (critical)

### Stage F additions in Layer 1

#### `category: distractor_source` (Stage F1)
`checkDistractorSource()` — for each wrong option:
- `why_wrong` is REQUIRED (promoted from optional in GenerationSchema). Missing → flag (major).
- Must carry either a `misconception_id` (from the approved list passed to the generator) OR a typed `reasoning_error` from the fixed taxonomy. If both are missing, the distractor is filler → flag (major).

#### `category: misconception_coverage` (Stage F1, per-question)
`checkMisconceptionCoverage()` — every question must declare either `misconception_id_targeted` (non-empty) OR a non-empty `misconception_reasoning_error`. If both are blank → flag (major). The intent: every item must claim what student error it probes.

#### `category: rationale_hygiene` (Stage F1)
`checkRationaleHygiene()` — checks the rationale for:
- **Author meta-commentary leaks** ("higher grades", "though that's an exception", "note to teacher", "pedagogically speaking") → flag (major)
- **Misconception reference** — rationale should mention either the misconception text/id OR overlap with one of the wrong options' `why_wrong` reasonings. Missing → flag (minor)

#### `category: answer_leak` (Stage F2)
`checkAnswerLeak()` — tokenises the correct answer (and the correct option text when present) and compares against stem tokens, dropping stop-words and short tokens:
- Single-word answer that appears verbatim in the stem → flag (major)
- Multi-token answer where ≥60% of significant tokens appear in the stem → flag (major)

This catches both literal leaks ("creeper" in stem when answer is creeper) and definition-paraphrase leaks ("weak stem along the ground" when answer is creeper).

#### `category: image_material` (Stage F5)
`checkImageMaterial()` — when `needs_image=true`, scans the stem for tactile / material-property keywords (`tender|woody|soft|hard|flexible|brittle|smooth|rough|shiny|matte|glossy|tough|spongy`). Match → flag (minor): images can show form (height, branching, posture) but not material properties; the question's correctness can't depend on the student perceiving texture from a vector illustration.

---

## Layer 2: AI Multi-Perspective (SME lenses, parallel)

Implemented in [`src/agents/multiPerspective.ts`](src/agents/multiPerspective.ts). Each question goes through 3-4 parallel lenses; each lens returns `{ pass, score (0-100), issues[] }`.

### Lens 1: Factual (`category: factual`)
- Is the marked answer actually correct?
- Any factual errors in stem or options?
- Missing or incorrect units (math/science)?
- Could more than one option be considered correct?

### Lens 2: Pedagogical (`category: pedagogical`) — extended in Stage F3
- Does the question test the intended cognitive level (its CG cell)?
- **Keyword-match-solvability test (Stage F3, CRITICAL):** if a student who only memorised textbook definitions could answer by matching a stem word to a definition (with no real reasoning), the item is functionally R1 — regardless of label. For U2/A2/A3 cells, flag as critical pedagogical failure.
- **Answer-leak check:** does the stem already contain the defining word(s) of the correct answer or a near-synonym?
- **Distractor sourcing:** each wrong option must trace to a specific student misconception or named reasoning error. Generic "the other categories" foils flagged.
- Is the question diagnostic — does a wrong answer reveal a specific gap?
- Is the stem clear and unambiguous?
- Avoids: negative phrasing, "all of the above", verbatim textbook copying

### Lens 3: Language (`category: language`)
- UK English (colour, organise, centre, analyse)
- Vocabulary appropriate for stated grade
- Sentence structure simple enough
- Gender-neutral, culturally appropriate for Indian students
- No bias (gender, cultural, socioeconomic, disability)

### Lens 4: Terminology (`category: terminology`) — when chapter content present
- Lists noun/technical terms in stem or options NOT present verbatim in chapter content AND that are non-NCERT synonyms for chapter terms (e.g., "food-making process" instead of "photosynthesis")
- Doesn't flag common vocabulary; only domain-specific substitutions
- Drives chapter-aligned generation

### Combination
- Each lens: score 0-100
- Overall = average of valid lens scores
- Pass if overall ≥60 AND no single lens <30
- Critical fail if any single lens <30

---

## Layer 3: Set-Level Checks

Run once over the whole bank in `runFullAudit`. Surface as `setFlags` (separate from per-question flags) and render as a strip in the AuditSummary.

### `category: scenario` — Scenario opener ratio
- R1/U1 stems must NOT open with a scenario or named character (per-question flag)
- Set-level: warn if scenario openers exceed 40% of the set

### `category: diversity` — Numerical diversity
- Jaccard similarity on content-word sets (digits dropped) across numerical stems
- Flags pattern-locked numerical batches

### `category: image` — Image ratio floor
- Set-level image-need ratio compared against grade-specific target (`getImageRatioForGrade`)
- Below floor → warn; suggests regenerating some text-only items with `needs_image=true`

### `category: misconception_coverage` (Stage F1, set-level)
- Builds a per-cell map of `misconception_id_targeted` → list of question IDs
- If any cell has >1 question targeting the same misconception → warn ("Cell A2 has 2 questions targeting `MISC_HEIGHT_CLASSIFICATION`")
- Cross-cell duplicates allowed (different cognitive levels of the same misconception)

### `category: edge_case_coverage` (Stage F4, set-level)
- Counts questions with `edge_case_flag=true` (set by orchestrator at generation time)
- If ≥1 question carries the flag (i.e., edge cases were available) AND the percentage is <20% → warn
- Skipped entirely when no question carries the flag (no edges in this domain — would otherwise fire spuriously)

---

## Audit-to-Regen Loop

The audit drives the regenerate-with-feedback flow. `auditFlagsToExtraNote()` synthesises the top 5 flags into a concise EXTRA-CONSTRAINT block that gets appended to the regen prompt:

```
AUDIT FINDINGS — fix ALL of these in the regenerated question:
- answer_leak: Stem reproduces 4/5 significant tokens of the correct answer
- distractor_source: Distractor B has no misconception_id or reasoning_error
- pedagogical: Functionally R1 despite A2 label — student can solve by keyword match
```

The model regenerates with these constraints baked in. After regen, that single question is re-audited and the card colour updates live.

**Bulk:** "Regenerate all fails" / "Regenerate all warns" iterate the same loop serially, with progress shown in the AuditSummary.

---

## Quality Metrics (when student response data is available)

Once items are deployed and student responses come back, classical psychometrics from AERA/APA/NCME (2014) Standards apply:

| Metric | Target | Meaning |
|---|---|---|
| Difficulty (p-value) | 0.30-0.70 | Moderate — discriminates well |
| Discrimination (D) | ≥ 0.30 | Distinguishes high/low performers |
| Distractor selection | ≥ 5% each | All options functional |
| Reliability (Cronbach's α) | ≥ 0.60 | Internal consistency |

These metrics aren't part of the pre-deployment audit (no response data), but they're the validation chain Stage F items will be evaluated against once the bank is in production. The misconception-tagged distractor design is what makes post-hoc distractor-level analysis interpretable: each distractor's selection rate maps to a specific named misconception, not a generic "wrong answer".
