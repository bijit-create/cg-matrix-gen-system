// Detect a pipe-delimited markdown table embedded in stem text and split the
// stem into { beforeText, table, afterText }. Only fires when the stem has a
// header row, a separator row (---), and at least one body row.
//
// Needed because the generator sometimes emits a table inline as:
//   "Day | P | Q | Total --- | --- | --- | --- 1 | 2.35 | 1.10 | 3.45 …"
// which reads as unformatted prose in the card (AN2-15 screenshot).

export interface ParsedStem {
  before: string;
  table: { headers: string[]; rows: string[][] } | null;
  after: string;
}

const PIPE_ROW_RE = /(?:^|\s)([^|\n]+?(?:\s*\|\s*[^|\n]+?){2,})(?=\s*(?:\n|$|\|\s*[-=: ]+\s*\|))/;

/**
 * Heuristic: find a pipe-delimited header row immediately followed by a
 * "--- | --- | …" separator and a sequence of body rows. Works both when the
 * table is newline-separated and when it arrived as one wrapped line of prose.
 */
export function extractMarkdownTable(stem: string): ParsedStem {
  const empty: ParsedStem = { before: stem, table: null, after: '' };
  if (!stem || typeof stem !== 'string') return empty;

  // Normalize: split into "logical cells" by treating runs of "X | Y | Z …" as rows.
  // The model's tables usually land on ONE line; detect by looking for the
  // "--- | ---" separator signature.
  const sep = stem.match(/\|?\s*-{2,}\s*(?:\|\s*-{2,}\s*)+\|?/);
  if (!sep) return empty;

  // Work with the contiguous region around the separator.
  const sepIdx = stem.indexOf(sep[0]);
  if (sepIdx < 0) return empty;

  // Walk backward from sepIdx to find the header row: the last pipe-containing
  // contiguous chunk before the separator.
  const preceding = stem.slice(0, sepIdx).replace(/\s+$/, '');
  const headerMatch = preceding.match(/([^|\n]+?(?:\s*\|\s*[^|\n]+?){2,})\s*$/);
  if (!headerMatch) return empty;
  const headerRaw = headerMatch[1];
  const headerStart = preceding.lastIndexOf(headerRaw);

  const headers = headerRaw.split('|').map(s => s.trim()).filter(Boolean);
  if (headers.length < 2) return empty;

  // Body rows: after the separator, consume pipe-rows until a non-pipe word
  // sequence appears.
  const afterSep = stem.slice(sepIdx + sep[0].length).replace(/^\s+/, '');
  // Rows are sequences with (numberOfHeaders − 1) pipes. Use a regex that
  // captures `headers.length` fields separated by pipes.
  const rowRe = new RegExp(
    `((?:[^|\\n]+?)(?:\\s*\\|\\s*[^|\\n]+?){${headers.length - 1}})(?=(?:\\s+(?:[^|\\n]+?)(?:\\s*\\|\\s*[^|\\n]+?){${headers.length - 1}})|\\s*$|\\s*(?:[A-Z][a-z]|If|What|Which|Observe|Find|Calculate))`,
    'g'
  );
  const rows: string[][] = [];
  let rowEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(afterSep)) !== null) {
    const cells = m[1].split('|').map(s => s.trim());
    // Only accept if cell count matches header count — guards against picking
    // up an unrelated pipe elsewhere.
    if (cells.length !== headers.length) break;
    // Reject if all cells look like prose (no digit/short-token content).
    const hasDataShape = cells.some(c => /\d/.test(c) || c.length <= 20);
    if (!hasDataShape) break;
    rows.push(cells);
    rowEnd = m.index + m[1].length;
    // guard: stop runaway matches
    if (rows.length > 40) break;
  }
  if (rows.length === 0) return empty;

  const before = stem.slice(0, headerStart).replace(/\s+$/, '').replace(/[:,]\s*$/, '').trim();
  const after = afterSep.slice(rowEnd).trim();

  return {
    before,
    table: { headers, rows },
    after,
  };
}
