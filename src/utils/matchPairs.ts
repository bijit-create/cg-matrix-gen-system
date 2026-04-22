// Shared helper for splitting match-the-following pairs into left/right.
// The model was told to emit pairs as "X → Y" (Unicode arrow), but the LaTeX
// directive we added later causes it to sometimes use \to / \rightarrow /
// \Rightarrow / \implies inside a LaTeX block like "\(x + 3 \to x + 3\)".
// The original split(' → ') silently failed on those, leaving right empty
// and putting everything in left (observed in U2-6 and U2-8 screenshots).
//
// This helper tries multiple arrow variants in priority order and returns
// the first successful split. Accepts strings and pair objects.

export type PairLike = string | { left?: string; right?: string } | any;

const ARROW_PATTERNS = [
  / → /,          // Unicode arrow with spaces (preferred)
  /→/,            // Unicode arrow without spaces
  /\s\\to\s/,     // LaTeX \to with surrounding whitespace
  /\\to\{?\}?/,   // LaTeX \to with or without empty braces
  /\s\\rightarrow\s/,
  /\\rightarrow/,
  /\s\\Rightarrow\s/,
  /\\Rightarrow/,
  /\s\\implies\s/,
  /\\implies/,
];

export function splitPair(pair: PairLike): { left: string; right: string } {
  if (pair == null) return { left: '', right: '' };
  if (typeof pair === 'object') {
    return {
      left: String(pair.left ?? '').trim(),
      right: String(pair.right ?? '').trim(),
    };
  }
  const s = String(pair);
  for (const re of ARROW_PATTERNS) {
    const idx = s.search(re);
    if (idx < 0) continue;
    const m = s.match(re);
    if (!m) continue;
    return {
      left: s.slice(0, idx).trim(),
      right: s.slice(idx + m[0].length).trim(),
    };
  }
  // Fallback: no arrow found — keep entire string as left, mark right empty
  // so the rendering can show a placeholder instead of duplicating the left.
  return { left: s.trim(), right: '' };
}
