// Deterministic question formatter
// Takes raw "question atoms" from Gemini and formats them into specific question types
// No API calls — instant transformation

export interface QuestionAtom {
  id: string;
  cell: string;
  stem: string;
  correct: string;
  wrong: { text: string; why: string }[];
  knowledge_point: string;
  rationale: string;
  needs_image: boolean;
}

export interface FormattedQuestion {
  id: string;
  cell: string;
  type: string;
  stem: string;
  correct_answer: string;
  rationale: string;
  needs_image: boolean;
  knowledge_point: string;
  // Type-specific
  options?: { label: string; text: string; correct: boolean; why_wrong?: string }[];
  steps?: { text: string; correct: boolean; fix?: string }[];
  match_pairs?: { left: string; right: string }[];
  arrange_items?: string[];
  // Original atom for re-formatting
  _atom: QuestionAtom;
}

// Format a question atom into MCQ
function toMCQ(atom: QuestionAtom): FormattedQuestion {
  const options = [
    { label: 'A', text: atom.wrong[0]?.text || '', correct: false, why_wrong: atom.wrong[0]?.why || '' },
    { label: 'B', text: atom.wrong[1]?.text || '', correct: false, why_wrong: atom.wrong[1]?.why || '' },
    { label: 'C', text: atom.correct, correct: true },
    { label: 'D', text: atom.wrong[2]?.text || atom.wrong[0]?.text || '', correct: false, why_wrong: atom.wrong[2]?.why || atom.wrong[0]?.why || '' },
  ];
  // Shuffle options (Fisher-Yates) but keep labels A-D
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tempText = options[i].text;
    const tempCorrect = options[i].correct;
    const tempWhy = options[i].why_wrong;
    options[i].text = options[j].text;
    options[i].correct = options[j].correct;
    options[i].why_wrong = options[j].why_wrong;
    options[j].text = tempText;
    options[j].correct = tempCorrect;
    options[j].why_wrong = tempWhy;
  }
  return {
    ...base(atom, 'mcq'),
    options,
  };
}

// Format as Fill in the Blank
function toFillBlank(atom: QuestionAtom): FormattedQuestion {
  // Replace the answer in the stem with ##answer## if present, otherwise append
  let fbStem = atom.stem;
  const answer = atom.correct.toLowerCase();
  const stemLower = fbStem.toLowerCase();
  if (stemLower.includes(answer)) {
    const idx = stemLower.indexOf(answer);
    fbStem = fbStem.slice(0, idx) + '##' + atom.correct + '##' + fbStem.slice(idx + answer.length);
  } else {
    fbStem = fbStem.replace(/[.?]$/, '') + ' _____. (Answer: ##' + atom.correct + '##)';
  }
  return {
    ...base(atom, 'fill_blank'),
    stem: fbStem,
  };
}

// Format as Error Analysis
function toErrorAnalysis(atom: QuestionAtom): FormattedQuestion {
  const steps: { text: string; correct: boolean; fix?: string }[] = [];
  // Step 1: correct premise
  steps.push({ text: atom.stem.split('.')[0] + '.', correct: true });
  // Step 2: correct intermediate
  steps.push({ text: `The answer is ${atom.correct}.`, correct: true });
  // Step 3: wrong step based on first distractor
  if (atom.wrong[0]) {
    steps.push({
      text: `Therefore, the answer is ${atom.wrong[0].text}.`,
      correct: false,
      fix: `The correct answer is ${atom.correct}. ${atom.wrong[0].why}`
    });
  }
  const eaStem = `A student solved the following problem. Identify the incorrect step.\n\nQuestion: ${atom.stem}`;
  return {
    ...base(atom, 'error_analysis'),
    stem: eaStem,
    steps,
  };
}

// Format as Match the Following
function toMatch(atom: QuestionAtom): FormattedQuestion {
  const pairs: { left: string; right: string }[] = [];
  pairs.push({ left: atom.stem.split(' ').slice(0, 3).join(' ') + '...', right: atom.correct });
  atom.wrong.forEach(w => {
    pairs.push({ left: w.text, right: w.why.split('.')[0] || 'Incorrect' });
  });
  return {
    ...base(atom, 'match'),
    stem: `Match the following items correctly:`,
    match_pairs: pairs,
  };
}

// Format as Arrange
function toArrange(atom: QuestionAtom): FormattedQuestion {
  const items = [atom.correct, ...atom.wrong.map(w => w.text)].filter(Boolean);
  return {
    ...base(atom, 'arrange'),
    stem: `Arrange the following in the correct order:`,
    arrange_items: items,
  };
}

function base(atom: QuestionAtom, type: string): FormattedQuestion {
  return {
    id: atom.id,
    cell: atom.cell,
    type,
    stem: atom.stem,
    correct_answer: atom.correct,
    rationale: atom.rationale,
    needs_image: atom.needs_image,
    knowledge_point: atom.knowledge_point,
    _atom: atom,
  };
}

// Main formatter — convert atom to any type
export function formatQuestion(atom: QuestionAtom, type: string): FormattedQuestion {
  switch (type) {
    case 'mcq': return toMCQ(atom);
    case 'fill_blank': return toFillBlank(atom);
    case 'error_analysis': return toErrorAnalysis(atom);
    case 'match': return toMatch(atom);
    case 'arrange': return toArrange(atom);
    default: return toMCQ(atom);
  }
}

// Suggest best type for a cell
export function suggestType(cell: string, index: number): string {
  const typeMap: Record<string, string[]> = {
    R1: ['mcq', 'fill_blank', 'mcq'],
    U1: ['mcq', 'fill_blank', 'mcq'],
    U2: ['mcq', 'match', 'arrange'],
    A2: ['mcq', 'error_analysis', 'mcq'],
    A3: ['error_analysis', 'mcq', 'error_analysis'],
    AN2: ['mcq', 'error_analysis', 'mcq'],
    AN3: ['error_analysis', 'error_analysis', 'mcq'],
  };
  const types = typeMap[cell] || ['mcq', 'fill_blank', 'mcq'];
  return types[index % types.length];
}
