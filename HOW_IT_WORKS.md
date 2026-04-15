# How the CG-Matrix Gen System Works

## The Core Idea

The more control you give the system, the better questions you get. The more content you feed it, the more precise and curriculum-aligned the questions become.

---

## Two Modes

**⚡ Quick Generate** — Fast. You give the skill and LO, optionally upload content, click Generate. You get questions in 2-3 minutes. No approvals, no gates. Good for first drafts and practice worksheets.

**🔬 Full Pipeline** — You control every step. You review what the system extracts, approve what goes in, adjust the distribution, and check every question before export. Takes 10-15 minutes. Built for production-quality question banks.

---

## What Happens in the Full Pipeline

### Step 1: Subskills

The system breaks your skill into 3-6 smaller testable actions.

**Example:**
- Skill: "Classify food items as plant-based or animal-based"
- Subskills generated:
  1. Identify common plant-based food items
  2. Identify common animal-based food items
  3. Classify a given food item by its origin
  4. Compare plant-based and animal-based food sources
  5. Analyse a meal to identify its components

**Why you review this:** You might want only 3 of these. You might want to add one the system missed. You decide what gets tested.

---

### Step 2: Content Scope (Knowledge Points)

The system reads your uploaded chapter/PDF and extracts every fact that could become a question.

**Example (from an uploaded food chapter):**
- "Wheat is a cereal from plants" — core
- "Milk comes from cows and buffaloes" — core
- "Honey is produced by bees" — core
- "Proteins are made of amino acids" — advanced (flagged)

**Why you review this:** The uploaded chapter may contain content that is too advanced or out of scope for this grade. You deselect those. Only approved points can become questions. This is what prevents Grade 6 students getting questions about "vascular bundle arrangement in dicot stems" just because the PDF happened to mention it.

**This is where content matters most.** If you upload a 20-page chapter PDF, the system extracts 40-60 testable knowledge points from it. If you upload nothing, the system has to guess — and guesses are generic. The more material you provide, the more specific and curriculum-aligned your questions will be.

---

### Step 3: Hess Matrix (CG Matrix)

The system builds a grid that decides how many questions go at each cognitive level.

| | DOK 1 (Recall) | DOK 2 (Skill) | DOK 3 (Reasoning) |
|---|---|---|---|
| **Remember** | R1: 3 | — | — |
| **Understand** | U1: 2 | U2: 4 | — |
| **Apply** | — | A2: 4 | A3: 0 |
| **Analyse** | — | AN2: 2 | AN3: 0 |

Each cell has a specific definition for YOUR content:
- R1: "Recall the name of a food item and whether it is plant or animal based"
- A2: "Apply classification rules to a new food item the student hasn't seen in the textbook"
- AN2: "Analyse a set of food items to find the pattern or the incorrectly classified item"

**Why you review this:** You can increase AN2 if you want harder questions. You can reduce R1 if you don't want too many easy recall questions. You control the difficulty distribution.

---

### Step 4: Question Generation (Cell by Cell)

Questions are generated one cell at a time. You review each cell's questions before moving to the next. You can reject, switch types (MCQ → Error Analysis → Match), or approve and continue.

---

### Step 5: Final Review & Export

All questions shown together. You can still reject or refine. Then export as Excel with all metadata.

---

## The Difference Between Pipeline and Quick Generate

| | Quick Generate | Full Pipeline |
|---|---|---|
| **Input** | Skill + LO + optional content | Same |
| **Subskill decomposition** | Automatic, no review | You select which subskills to test |
| **Content scoping** | Skipped — uses raw content | You approve each knowledge point |
| **Hess Matrix** | Auto-allocated | You adjust per-cell counts and review definitions |
| **Misconception sourcing** | Skipped | Searched from research catalog + internet |
| **Question review** | All at once, no per-cell control | Cell by cell with reject/switch/approve |
| **QA check** | None | Rule-based + AI semantic review |
| **Time** | 2-3 minutes | 10-15 minutes |
| **Best for** | Drafts, practice, exploration | Production question banks, assessments |

---

## Why Content Matters

| What You Provide | What You Get |
|---|---|
| **Just skill + LO** | Generic questions based on general knowledge. May not match your textbook. |
| **Skill + LO + chapter PDF** | Questions grounded in YOUR textbook content. Uses exact terminology, examples, and data from the chapter. |
| **Skill + LO + chapter PDF + YouTube link + worksheet** | Highly specific questions covering multiple perspectives. Content scope shows you exactly what was extracted from each source. |

The system cannot invent what it doesn't have. If you give it a chapter on "Food and Nutrition" from your specific textbook, questions will use the exact examples, definitions, and classification rules from that chapter — not generic internet knowledge.

**More material = more precise questions = less manual editing afterward.**

---

## Content in the System

### What Content Can You Provide

| Format | Accepted | What Gets Extracted |
|---|---|---|
| **PDF** (.pdf) | ✅ | Full text from all pages — paragraphs, headings, data, examples |
| **Word** (.docx) | ✅ | All paragraph text |
| **Excel** (.xlsx, .xls) | ✅ | All sheets, all rows — tables, data, structured content |
| **Pasted text** | ✅ | Whatever you paste — chapter excerpts, syllabus notes, lesson plans |
| **YouTube links** | ✅ (React app) | Video topic, key concepts, terminology, learning points extracted via AI |
| **Website URLs** | ✅ (React app) | Educational content extracted from the page via AI |
| **TSV row** | ✅ | Metadata — Subject, Grade, Skill Code, LO Code, Skill Description, LO Description |

---

### Where You Can Add Content

#### In Quick Generate

| Input Point | What to Add | Why |
|---|---|---|
| **TSV Paste** | Copy-paste one row from your skill mapping Excel sheet | Auto-fills Grade, Subject, Skill, LO, Skill Code — saves typing |
| **Learning Objective** | The LO description from your curriculum | Tells the system WHAT the student should learn |
| **Skill Description** | The specific skill being assessed | Tells the system WHAT the student should be able to DO |
| **Upload** (PDF/DOCX/Excel) | Chapter from textbook, worksheet, reference material | Gives the system the ACTUAL content to generate questions from |
| **Paste text** | Copy-paste chapter text, syllabus extract, lesson notes | Same as upload but for quick snippets |

#### In Full Pipeline (same as above, plus)

| Input Point | What to Add | Why |
|---|---|---|
| **Resource Search** | Search for PDFs, YouTube, websites during Gate 1 | Find additional reference material online |
| **Content Sources** | Add YouTube links, website URLs, multiple file uploads | Build a rich content base from multiple sources |

---

### Why Content Is Parsed — What It Does at Each Stage

#### Stage 1: Intake Agent

**Content used:** First 3,000 characters of your uploaded/pasted content.

**Why:** The Intake Agent reads your content to understand the topic, detect the grade level, identify the subject area, and normalise terminology. If you upload a Grade 7 Science chapter, the Intake Agent detects "Grade 7, Science, Life Sciences" even if you didn't specify it.

**Without content:** The Intake Agent only has the skill and LO text — a single sentence. It guesses the context.

---

#### Stage 2: Content Scoping (Full Pipeline only)

**Content used:** Full uploaded content, split per subskill. Each subskill gets the paragraphs from your content that are relevant to it (keyword-matched).

**Why:** This is the most important use of content. The Content Scoping Agent reads your chapter and extracts every single testable fact — "Wheat is a cereal," "Milk comes from cows," "Herbivores eat only plants." These become the knowledge points you approve. Only approved points can become questions.

**Without content:** The agent has nothing to extract from. It falls back to the skill description and generates generic knowledge points from its training data — not from your textbook.

**This is why uploading a chapter PDF changes everything.** With it, you get 40-60 specific, curriculum-aligned knowledge points. Without it, you get 8-10 generic ones.

---

#### Stage 3: Hess Matrix

**Content used:** The approved knowledge points (not raw content).

**Why:** The Hess Matrix agent looks at your approved knowledge points and decides which cognitive levels they support. If your content has lots of classification rules, it allocates more A2 (Apply) questions. If your content has definitions and terminology, it allocates more R1 (Recall) questions. The matrix adapts to YOUR content.

**Without content:** The matrix is generic — a standard distribution that may not match what your chapter actually covers.

---

#### Stage 4: Question Generation

**Content used:** Per-cell selected knowledge points (3-8 points per cell) + exemplar questions from internet search.

**Why:** Each question is generated from a SPECIFIC knowledge point from your approved content. The question stem, correct answer, and wrong options all come from facts in your textbook.

**Without content:** Questions are based on general knowledge. They may be factually correct but won't match your textbook's examples, terminology, or scope. A question might use "femur" when your textbook only uses "thigh bone."

---

### The Difference Content Makes — Same Skill, With vs Without

**Skill:** "Identify different joints, bones, and muscles"

#### Without content (just skill + LO):

```
Q: Which is the longest bone in the human body?
A. Femur  B. Tibia  C. Humerus  D. Rib
```
Generic. Could come from any textbook. May use terminology your students haven't learned.

#### With content (chapter PDF uploaded):

```
Q: Aarav is reading Chapter 8 of his science book. He learns that
the bone in his thigh helps him stand and walk. What is this bone called?
A. Thigh bone (femur)  B. Shin bone  C. Upper arm bone  D. Rib bone
```
Uses the chapter's terminology. References the chapter. Uses the same examples the student has seen in class. The wrong options come from other bones mentioned in the same chapter.

---

### Summary

| What You Upload | What Changes |
|---|---|
| **Nothing** | Generic questions from AI's general knowledge. May not match your textbook. |
| **Chapter PDF** | Questions use YOUR textbook's facts, examples, terminology. Content scope shows exactly what was extracted. |
| **Chapter + worksheet** | Even more knowledge points. Questions cover perspectives from both sources. |
| **Chapter + YouTube + website** | Rich content base. Questions draw from multiple reference materials. System notes which source each knowledge point came from. |

**The system generates questions FROM your content, not ABOUT your topic.** The more you give it, the more precise and curriculum-aligned the output.
