// Rule-Based / Heuristic QA Engine
// Runs programmatic checks against every question — no AI needed, instant.

export interface QAFlag {
  rule: string;
  category: 'formatting' | 'content' | 'quality' | 'distractor' | 'localization' | 'alignment';
  severity: 'critical' | 'major' | 'minor';
  message: string;
  field: string; // which field triggered it (stem, option_A, hint, etc.)
}

export interface RuleQAResult {
  question_id: string;
  pass: boolean;
  flags: QAFlag[];
}

// --- Formatting & Typography ---
function checkFormatting(stem: string, options: any[]): QAFlag[] {
  const flags: QAFlag[] = [];

  // Capitalization: stem starts with lowercase
  if (stem && /^[a-z]/.test(stem.trim())) {
    flags.push({ rule: 'capitalization', category: 'formatting', severity: 'minor', message: 'Question starts with a lowercase letter.', field: 'stem' });
  }

  // Punctuation spacing: space before punctuation
  if (/\s[,\.\?\!;:]/.test(stem)) {
    flags.push({ rule: 'punctuation_spacing', category: 'formatting', severity: 'minor', message: 'Space before punctuation mark detected.', field: 'stem' });
  }

  // Double spaces
  if (/  /.test(stem)) {
    flags.push({ rule: 'double_space', category: 'formatting', severity: 'minor', message: 'Double space detected in stem.', field: 'stem' });
  }

  // FIB: single underscore instead of long blank
  if (stem.includes('_') && !stem.includes('_____') && !stem.includes('##')) {
    flags.push({ rule: 'fib_underscore', category: 'formatting', severity: 'major', message: 'Use _____ (5+ underscores) or ##answer## for blanks, not single _', field: 'stem' });
  }

  // Readability: excessively long stem
  if (stem.length > 300) {
    flags.push({ rule: 'long_stem', category: 'formatting', severity: 'minor', message: `Stem is ${stem.length} characters — consider simplifying (target < 150).`, field: 'stem' });
  }

  // Check options formatting
  options.forEach((opt: any, i: number) => {
    const text = typeof opt === 'string' ? opt : opt.text || '';
    if (text && /  /.test(text)) {
      flags.push({ rule: 'double_space', category: 'formatting', severity: 'minor', message: 'Double space in option.', field: `option_${String.fromCharCode(65 + i)}` });
    }
  });

  return flags;
}

// --- Content & Phrasing ---
function checkContent(stem: string): QAFlag[] {
  const flags: QAFlag[] = [];

  // Negative phrasing
  const negatives = /\b(not|never|except|incorrect|false|isn't|aren't|doesn't|don't|cannot|won't)\b/i;
  if (negatives.test(stem)) {
    flags.push({ rule: 'negative_phrasing', category: 'content', severity: 'major', message: 'Negative phrasing detected — can confuse students. Consider rephrasing positively.', field: 'stem' });
  }

  // Positional references
  const positional = /\b(above|below|following|shown below|as shown|in the figure)\b/i;
  if (positional.test(stem)) {
    flags.push({ rule: 'positional_reference', category: 'content', severity: 'major', message: 'Positional reference detected (above/below/following). These break in shuffled digital assessments.', field: 'stem' });
  }

  return flags;
}

// --- Quality Control & Hygiene ---
function checkQuality(stem: string, options: any[]): QAFlag[] {
  const flags: QAFlag[] = [];

  // Dummy content
  const dummyPattern = /\b(test|dummy|asdf|lorem|ipsum|xxx|placeholder)\b/i;
  if (dummyPattern.test(stem)) {
    flags.push({ rule: 'dummy_content', category: 'quality', severity: 'critical', message: 'Placeholder/dummy content detected.', field: 'stem' });
  }

  // Too short
  if (stem.trim().length < 10) {
    flags.push({ rule: 'short_stem', category: 'quality', severity: 'critical', message: 'Stem is too short (< 10 characters).', field: 'stem' });
  }

  // Inappropriate content
  const inappropriate = /\b(kill|murder|blood|shoot|gun|knife|death|die|suicide|bomb|terror)\b/i;
  if (inappropriate.test(stem)) {
    flags.push({ rule: 'inappropriate', category: 'quality', severity: 'critical', message: 'Potentially inappropriate/violent content detected.', field: 'stem' });
  }
  options.forEach((opt: any, i: number) => {
    const text = typeof opt === 'string' ? opt : opt.text || '';
    if (inappropriate.test(text)) {
      flags.push({ rule: 'inappropriate', category: 'quality', severity: 'critical', message: 'Potentially inappropriate content in option.', field: `option_${String.fromCharCode(65 + i)}` });
    }
  });

  return flags;
}

// --- Distractor (Option) Quality ---
function checkDistractors(options: any[]): QAFlag[] {
  const flags: QAFlag[] = [];
  if (!options || options.length === 0) return flags;

  const texts = options.map((o: any) => (typeof o === 'string' ? o : o.text || '').toLowerCase().trim());

  // Lazy options
  const lazy = ['all of the above', 'none of the above', 'both a and b', 'all the above', 'none of above', 'both (a) and (b)'];
  texts.forEach((t, i) => {
    if (lazy.some(l => t.includes(l))) {
      flags.push({ rule: 'lazy_option', category: 'distractor', severity: 'major', message: `"${texts[i]}" is a lazy option — avoid all/none of the above.`, field: `option_${String.fromCharCode(65 + i)}` });
    }
  });

  // Length variance — check if one option is 3x longer than average
  const lengths = texts.map(t => t.length).filter(l => l > 0);
  if (lengths.length >= 3) {
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    lengths.forEach((len, i) => {
      if (len > avg * 2.5) {
        flags.push({ rule: 'length_variance', category: 'distractor', severity: 'minor', message: 'This option is significantly longer than others — may give away the answer.', field: `option_${String.fromCharCode(65 + i)}` });
      }
    });
  }

  // Duplicate options
  const seen = new Set<string>();
  texts.forEach((t, i) => {
    if (t && seen.has(t)) {
      flags.push({ rule: 'duplicate_option', category: 'distractor', severity: 'critical', message: 'Duplicate option detected.', field: `option_${String.fromCharCode(65 + i)}` });
    }
    if (t) seen.add(t);
  });

  // Missing distractor rationale for wrong options (check both field names)
  options.forEach((opt: any, i: number) => {
    if (typeof opt === 'object' && !opt.correct && !opt.is_correct && !opt.why_wrong && !opt.distractor_rationale) {
      flags.push({ rule: 'missing_distractor_rationale', category: 'distractor', severity: 'minor', message: 'Wrong option missing rationale.', field: `option_${String.fromCharCode(65 + i)}` });
    }
  });

  return flags;
}

// --- Localization & Spelling ---
function checkLocalization(stem: string, options: any[]): QAFlag[] {
  const flags: QAFlag[] = [];
  const fullText = stem + ' ' + options.map((o: any) => typeof o === 'string' ? o : o.text || '').join(' ');

  // US vs UK English
  const usSpellings: Record<string, string> = {
    'color': 'colour', 'center': 'centre', 'organize': 'organise',
    'analyze': 'analyse', 'behavior': 'behaviour', 'flavor': 'flavour',
    'meter': 'metre', 'defense': 'defence', 'recognize': 'recognise',
    'realize': 'realise', 'customize': 'customise', 'favorite': 'favourite',
    'honor': 'honour', 'labor': 'labour', 'neighbor': 'neighbour'
  };

  for (const [us, uk] of Object.entries(usSpellings)) {
    const regex = new RegExp(`\\b${us}\\b`, 'i');
    if (regex.test(fullText)) {
      flags.push({ rule: 'us_spelling', category: 'localization', severity: 'minor', message: `US spelling "${us}" detected — use UK spelling "${uk}".`, field: 'stem' });
    }
  }

  return flags;
}

// --- Alignment & Duplicacy (cross-question) ---
function checkAlignment(stem: string, lo: string, options?: any[]): QAFlag[] {
  const flags: QAFlag[] = [];
  if (!lo) return flags;

  // Keyword overlap — check if ANY content keywords from LO appear in stem+options
  const getKeywords = (text: string) => new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3)
  );
  const allText = stem + ' ' + (options || []).map((o: any) => typeof o === 'string' ? o : o.text || '').join(' ');
  const questionWords = getKeywords(allText);
  const loWords = getKeywords(lo);

  // Check if at least 1 meaningful LO keyword appears in the question
  const loKeywordHits = [...loWords].filter(w => questionWords.has(w));
  if (loKeywordHits.length === 0 && stem.length > 30 && loWords.size > 0) {
    flags.push({ rule: 'low_alignment', category: 'alignment', severity: 'minor', message: `No LO keywords found in question. Verify alignment with: "${lo.slice(0, 80)}..."`, field: 'stem' });
  }

  return flags;
}

// --- Main runner ---
export function runRuleBasedQA(questions: any[], lo: string): RuleQAResult[] {
  const results: RuleQAResult[] = [];
  const allStems = new Set<string>();

  for (const q of questions) {
    const stem = q.stem || '';
    const options = q.options || [];
    const flags: QAFlag[] = [];

    // Only major rules — skip minor formatting/localization checks
    flags.push(...checkQuality(stem, options));
    flags.push(...checkDistractors(options));
    flags.push(...checkContent(stem));

    // Exact duplicate check
    const normalizedStem = stem.toLowerCase().trim();
    if (normalizedStem && allStems.has(normalizedStem)) {
      flags.push({ rule: 'exact_duplicate', category: 'alignment', severity: 'critical', message: 'Exact duplicate question detected.', field: 'stem' });
    }
    if (normalizedStem) allStems.add(normalizedStem);

    const hasCritical = flags.some(f => f.severity === 'critical');
    const hasMajor = flags.some(f => f.severity === 'major');
    results.push({
      question_id: q.question_id || q.id,
      pass: !hasCritical && !hasMajor,
      flags
    });
  }

  return results;
}
