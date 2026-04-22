/**
 * Rule-Based QA Engine — comprehensive heuristic checks
 * Based on: Haladyna-Downing (2002), ETS Standards (2014), Rodriguez (2005)
 *
 * Run INSTANTLY (no API calls) against every question.
 * User triggers this explicitly via "Run QA" button.
 */

export interface QAFlag {
  rule: string;
  category: 'formatting' | 'content' | 'quality' | 'distractor' | 'localization' | 'alignment';
  severity: 'critical' | 'major' | 'minor';
  message: string;
  field: string;
}

export interface RuleQAResult {
  question_id: string;
  pass: boolean;
  flags: QAFlag[];
}

// === FORMATTING & TYPOGRAPHY ===
function checkFormatting(stem: string, options: any[]): QAFlag[] {
  const flags: QAFlag[] = [];

  // Capitalization
  if (stem && /^[a-z]/.test(stem.trim())) {
    flags.push({ rule: 'capitalization', category: 'formatting', severity: 'minor', message: 'Question starts with a lowercase letter.', field: 'stem' });
  }

  // Punctuation spacing
  if (/\s[,\.\?\!;:]/.test(stem)) {
    flags.push({ rule: 'punctuation_spacing', category: 'formatting', severity: 'minor', message: 'Incorrect space before punctuation mark.', field: 'stem' });
  }

  // Double spaces
  if (/  /.test(stem)) {
    flags.push({ rule: 'double_space', category: 'formatting', severity: 'minor', message: 'Double space detected.', field: 'stem' });
  }

  // FIB: single underscore
  if (stem.includes('_') && !stem.includes('_____') && !stem.includes('##')) {
    flags.push({ rule: 'fib_format', category: 'formatting', severity: 'major', message: 'Use _____ (5+) or ##answer## for blanks, not single _.', field: 'stem' });
  }

  // Stem too long (>150 chars) — readability concern
  if (stem.length > 150) {
    flags.push({ rule: 'long_stem', category: 'formatting', severity: 'minor', message: `Stem is ${stem.length} chars. Consider simplifying (<150 recommended).`, field: 'stem' });
  }

  // Option formatting
  options.forEach((opt: any, i: number) => {
    const text = typeof opt === 'string' ? opt : opt.text || '';
    if (/  /.test(text)) {
      flags.push({ rule: 'double_space', category: 'formatting', severity: 'minor', message: 'Double space in option.', field: `option_${String.fromCharCode(65 + i)}` });
    }
  });

  return flags;
}

// === CONTENT & PHRASING ===
function checkContent(stem: string): QAFlag[] {
  const flags: QAFlag[] = [];

  // Negative phrasing [Haladyna Rule 10]
  if (/\b(not|never|except|incorrect|false|isn't|aren't|doesn't|don't|cannot|won't)\b/i.test(stem)) {
    flags.push({ rule: 'negative_phrasing', category: 'content', severity: 'major', message: 'Negative phrasing detected (Haladyna Rule 10). Consider rephrasing positively.', field: 'stem' });
  }

  // Positional references (break in digital shuffle)
  if (/\b(above|below|following|shown below|as shown|in the figure|in the diagram)\b/i.test(stem)) {
    flags.push({ rule: 'positional_reference', category: 'content', severity: 'major', message: 'Positional reference (above/below/following) breaks in shuffled digital assessments.', field: 'stem' });
  }

  // "Which of the following is true/false" [Haladyna Rule 5]
  if (/which of the following (is|are)\s+(true|false|correct|incorrect)/i.test(stem)) {
    flags.push({ rule: 'vague_stem', category: 'content', severity: 'major', message: '"Which of the following is true/false?" is too vague (Haladyna Rule 5). Ask a specific question.', field: 'stem' });
  }

  return flags;
}

// === QUALITY CONTROL & HYGIENE ===
function checkQuality(stem: string, options: any[], profile: 'cbse' | 'state' = 'cbse'): QAFlag[] {
  const flags: QAFlag[] = [];

  // Dummy content
  if (/\b(test|dummy|asdf|lorem|ipsum|xxx|placeholder|sample)\b/i.test(stem)) {
    flags.push({ rule: 'dummy_content', category: 'quality', severity: 'critical', message: 'Placeholder/dummy content detected.', field: 'stem' });
  }

  // Too short
  if (stem.trim().length < 10) {
    flags.push({ rule: 'short_stem', category: 'quality', severity: 'critical', message: 'Stem too short (<10 characters).', field: 'stem' });
  }

  // Inappropriate content
  const inappropriate = /\b(kill|murder|blood|shoot|gun|knife|death|die|suicide|bomb|terror|weapon)\b/i;
  if (inappropriate.test(stem)) {
    flags.push({ rule: 'inappropriate', category: 'quality', severity: 'critical', message: 'Potentially inappropriate/violent content.', field: 'stem' });
  }
  options.forEach((opt: any, i: number) => {
    const text = typeof opt === 'string' ? opt : opt.text || '';
    if (inappropriate.test(text)) {
      flags.push({ rule: 'inappropriate', category: 'quality', severity: 'critical', message: 'Inappropriate content in option.', field: `option_${String.fromCharCode(65 + i)}` });
    }
  });

  // Stem word count. State-board profile tightens cap 40 → 25 and raises severity (Divyansh).
  const wordCount = stem.trim().split(/\s+/).length;
  const cap = profile === 'state' ? 25 : 40;
  if (wordCount > cap) {
    flags.push({
      rule: 'high_language_load',
      category: 'quality',
      severity: profile === 'state' ? 'major' : 'minor',
      message: `Stem is ${wordCount} words. ${profile === 'state' ? 'State-board profile' : 'For non-language subjects'}, keep under ${cap}.`,
      field: 'stem',
    });
  }

  return flags;
}

// === DISTRACTOR QUALITY [Haladyna Rules 18-24, Rodriguez 2005] ===
function checkDistractors(options: any[]): QAFlag[] {
  const flags: QAFlag[] = [];
  if (!options || options.length === 0) return flags;

  const texts = options.map((o: any) => (typeof o === 'string' ? o : o.text || '').toLowerCase().trim());

  // Lazy options [Haladyna Rule 24]
  const lazy = ['all of the above', 'none of the above', 'both a and b', 'all the above', 'none of above', 'both (a) and (b)'];
  texts.forEach((t, i) => {
    if (lazy.some(l => t.includes(l))) {
      flags.push({ rule: 'lazy_option', category: 'distractor', severity: 'major', message: `"${t}" is a lazy option (Haladyna Rule 24).`, field: `option_${String.fromCharCode(65 + i)}` });
    }
  });

  // Length variance — correct answer often longest [Haladyna Rule 22]
  const lengths = texts.map(t => t.length).filter(l => l > 0);
  if (lengths.length >= 3) {
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    lengths.forEach((len, i) => {
      if (len > avg * 2.5) {
        flags.push({ rule: 'length_variance', category: 'distractor', severity: 'minor', message: 'Option significantly longer than others — may give away answer.', field: `option_${String.fromCharCode(65 + i)}` });
      }
      if (len < avg * 0.3 && len > 0) {
        flags.push({ rule: 'length_variance', category: 'distractor', severity: 'minor', message: 'Option significantly shorter than others.', field: `option_${String.fromCharCode(65 + i)}` });
      }
    });
  }

  // Duplicate options (exact text)
  const seen = new Set<string>();
  texts.forEach((t, i) => {
    if (t && seen.has(t)) {
      flags.push({ rule: 'duplicate_option', category: 'distractor', severity: 'critical', message: 'Duplicate option detected.', field: `option_${String.fromCharCode(65 + i)}` });
    }
    if (t) seen.add(t);
  });

  // Compound-answer duplicates — same numeric/measurement value appearing in
  // multiple options even when the surrounding prose differs. Caught "Priya;
  // 16.975 metres" vs "Sameer: 16.975 metres" in the U2-7 screenshot — only
  // the name differed, so the question was impossible to answer on maths alone.
  // Extract canonical numeric/unit tokens ("16.975 metres", "10.805 kg", "3.5"),
  // and flag if any token appears in ≥2 options.
  const numericTokenRe = /-?\d+(?:[.,]\d+)?\s*(?:kg|g|mg|m\b|cm|mm|km|ml|l|litre|metres?|meters?|seconds?|minutes?|hours?|%|°c|°f)?/gi;
  const numberCounts: Record<string, number[]> = {};
  texts.forEach((t, i) => {
    const matches = (t.match(numericTokenRe) || []).map(s => s.replace(/\s+/g, ' ').trim().toLowerCase()).filter(Boolean);
    // only care about tokens long enough to be meaningful (skip lone "1" etc.)
    const meaningful = matches.filter(m => m.length >= 3 || /\d\D/.test(m));
    meaningful.forEach(m => {
      (numberCounts[m] ||= []).push(i);
    });
  });
  Object.entries(numberCounts).forEach(([token, optionIdxs]) => {
    if (optionIdxs.length >= 2) {
      optionIdxs.forEach(i => {
        flags.push({
          rule: 'compound_duplicate',
          category: 'distractor',
          severity: 'major',
          message: `Numeric/unit value "${token}" appears in ${optionIdxs.length} options. Differentiator cannot rely on a non-mathematical label alone.`,
          field: `option_${String.fromCharCode(65 + i)}`,
        });
      });
    }
  });

  // Combination options (research: adds test-wiseness, not cognition)
  texts.forEach((t, i) => {
    if (/\b(both\s+[a-d]\s+and\s+[a-d]|options?\s+[ivx]+\s+and\s+[ivx]+|[a-d]\s*,\s*[a-d]\s+and\s+[a-d]|all\s+of\s+these|i\s+and\s+ii|ii\s+and\s+iii)\b/i.test(t)) {
      flags.push({ rule: 'combination_option', category: 'distractor', severity: 'major', message: 'Combination option detected ("Both A and B", "I and III"). Research shows these add test-wiseness, not cognition.', field: `option_${String.fromCharCode(65 + i)}` });
    }
  });

  // Absolute qualifiers in options [Haladyna Rule 11]
  texts.forEach((t, i) => {
    if (/\b(always|never|all|none|every|must|impossible|certainly)\b/i.test(t)) {
      flags.push({ rule: 'absolute_qualifier', category: 'distractor', severity: 'minor', message: 'Absolute qualifier ("always/never/all/none") often signals wrong answer.', field: `option_${String.fromCharCode(65 + i)}` });
    }
  });

  return flags;
}

// === LOCALIZATION & SPELLING ===
function checkLocalization(stem: string, options: any[]): QAFlag[] {
  const flags: QAFlag[] = [];
  const fullText = stem + ' ' + options.map((o: any) => typeof o === 'string' ? o : o.text || '').join(' ');

  // US vs UK English
  const usToUk: Record<string, string> = {
    'color': 'colour', 'center': 'centre', 'organize': 'organise',
    'analyze': 'analyse', 'behavior': 'behaviour', 'flavor': 'flavour',
    'meter': 'metre', 'defense': 'defence', 'recognize': 'recognise',
    'realize': 'realise', 'customize': 'customise', 'favorite': 'favourite',
    'honor': 'honour', 'labor': 'labour', 'neighbor': 'neighbour',
    'mold': 'mould', 'catalog': 'catalogue', 'program': 'programme',
  };

  for (const [us, uk] of Object.entries(usToUk)) {
    if (new RegExp(`\\b${us}\\b`, 'i').test(fullText)) {
      flags.push({ rule: 'us_spelling', category: 'localization', severity: 'major', message: `US spelling "${us}" → use UK "${uk}".`, field: 'stem' });
    }
  }

  return flags;
}

// === ALIGNMENT & DUPLICACY ===
function checkAlignment(stem: string, lo: string, options?: any[]): QAFlag[] {
  const flags: QAFlag[] = [];
  if (!lo) return flags;

  const getKeywords = (text: string) => new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 4)
  );
  const allText = stem + ' ' + (options || []).map((o: any) => typeof o === 'string' ? o : o.text || '').join(' ');
  const qWords = getKeywords(allText);
  const loWords = getKeywords(lo);
  const hits = [...loWords].filter(w => qWords.has(w));

  if (hits.length === 0 && stem.length > 30 && loWords.size > 0) {
    flags.push({ rule: 'low_alignment', category: 'alignment', severity: 'minor', message: `No LO keywords found. Verify alignment with: "${lo.slice(0, 60)}..."`, field: 'stem' });
  }

  return flags;
}

// === MAIN RUNNER ===
export function runRuleBasedQA(questions: any[], lo: string, profile: 'cbse' | 'state' = 'cbse'): RuleQAResult[] {
  const results: RuleQAResult[] = [];
  const allStems = new Set<string>();

  for (const q of questions) {
    const stem = q.stem || '';
    const options = q.options || [];
    const flags: QAFlag[] = [];

    // Run ALL checks
    flags.push(...checkFormatting(stem, options));
    flags.push(...checkContent(stem));
    flags.push(...checkQuality(stem, options, profile));
    flags.push(...checkDistractors(options));
    flags.push(...checkLocalization(stem, options));
    flags.push(...checkAlignment(stem, lo, options));

    // Exact duplicate
    const norm = stem.toLowerCase().trim();
    if (norm && allStems.has(norm)) {
      flags.push({ rule: 'exact_duplicate', category: 'alignment', severity: 'critical', message: 'Exact duplicate question.', field: 'stem' });
    }
    if (norm) allStems.add(norm);

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

// === NUMERICAL DIVERSITY (Divyansh — pattern-lock detection) ===
// Jaccard similarity on content-word sets (digits dropped) across numerical stems.
// Flags: pair-wise Jaccard > 0.6, or ≥ 3 stems sharing leading 6 tokens.
export function checkNumericalDiversity(questions: any[]): string[] {
  const findings: string[] = [];
  const nums = questions.filter(q => /\d/.test(q.stem || ''));
  if (nums.length < 3) return findings;

  const tokenize = (s: string): Set<string> => {
    const stop = new Set(['the', 'a', 'an', 'of', 'is', 'are', 'was', 'were', 'be', 'to', 'in', 'on', 'at', 'and', 'or', 'if', 'then', 'for', 'with', 'by', 'as', 'from', 'this', 'that', 'it']);
    return new Set(
      s.toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3 && !stop.has(w))
    );
  };
  const jaccard = (a: Set<string>, b: Set<string>): number => {
    if (a.size === 0 || b.size === 0) return 0;
    let inter = 0;
    a.forEach(w => { if (b.has(w)) inter++; });
    return inter / (a.size + b.size - inter);
  };

  const sets = nums.map(q => tokenize(q.stem));
  let highSimPairs = 0;
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const s = jaccard(sets[i], sets[j]);
      if (s > 0.6) {
        highSimPairs++;
        findings.push(`High similarity (Jaccard=${s.toFixed(2)}) between ${nums[i].id} and ${nums[j].id}.`);
      }
    }
  }
  if (highSimPairs === 0) findings.push(`diversity OK — ${nums.length} numericals, no pair above 0.6 Jaccard.`);

  // Leading-6-token repetition
  const leads: Record<string, string[]> = {};
  nums.forEach(q => {
    const key = (q.stem || '').toLowerCase().split(/\s+/).slice(0, 6).join(' ');
    if (!key) return;
    (leads[key] ||= []).push(q.id);
  });
  Object.entries(leads).forEach(([key, ids]) => {
    if (ids.length >= 3) findings.push(`${ids.length} numericals share opener "${key}..." — ${ids.join(', ')}.`);
  });

  return findings;
}
