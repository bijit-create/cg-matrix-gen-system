# QA System Research — Evidence-Based

## Sources
- ETS Standards for Quality and Fairness (2014)
- Haladyna-Downing Item Writing Guidelines (1989, 2002)
- Rodriguez Distractor Analysis (2005, 2014)
- Gierl et al. Distractor Development Review (2017)
- AERA/APA/NCME Standards (2014)
- NCF 2023 / NEP 2020

## Layer 1: Rule-Based (Code-Level, Instant)

### Formatting
- Capitalization: stem starts lowercase → flag
- Punctuation spacing: space before , . ? ! → flag
- Double spaces → flag
- FIB: single _ instead of _____ or ##answer## → flag

### Content & Phrasing
- Negative phrasing: not, never, except, incorrect, false → flag (Haladyna Rule 10)
- Positional references: above, below, following → flag (breaks in digital shuffle)
- Stem length: >150 chars → flag readability concern

### Quality Hygiene
- Dummy content: test, dummy, asdf, <3 chars → flag
- Inappropriate content: kill, murder, blood, shoot, gun, knife, death → flag
- Hint = question text, or hint < 5 chars → flag

### Distractor Quality
- Lazy options: all/none of the above, both a and b → flag (Haladyna Rule 24)
- Length variance: one option >2.5x average length → flag (gives away answer)
- Duplicate options → flag

### Localization
- US spellings: color, center, organize, analyze, behavior, flavor, meter, defense → flag with UK alternative
- Cultural: scan for Indian vs foreign names

### Alignment & Duplicacy
- Keyword overlap with LO: <5% Jaccard → flag alignment
- Exact duplicate stems → flag

## Layer 2: AI Multi-Perspective (3 lenses, parallel)

### Lens 1: Factual Accuracy
- Is the marked answer actually correct?
- Any factual errors in stem or options?
- Missing or incorrect units (math/science)?
- Could more than one option be correct?

### Lens 2: Pedagogical Quality
- Does question test intended CG cell cognitive level?
- Is question diagnostic (wrong answer reveals specific gap)?
- Are distractors plausible (based on real misconceptions)?
- Is stem clear, unambiguous, single-construct?
- Avoids: negative phrasing, "all of the above", verbatim textbook?

### Lens 3: Language & Accessibility
- UK English spelling correct?
- Vocabulary appropriate for stated grade?
- Sentence structure simple enough?
- Gender-neutral, culturally appropriate for Indian students?
- No bias (gender, cultural, socioeconomic, disability)?

### Combination
- Each lens: score 0-100
- Overall = average of 3 scores
- Pass if overall >= 60 AND no single lens < 30
- Issues tagged by lens: [Factual], [Pedagogical], [Language]

### Semantic Duplicacy (cross-question)
- Flag questions testing same concept in different words
- Compare stems for semantic similarity
- Flag if same knowledge point tested by multiple questions
