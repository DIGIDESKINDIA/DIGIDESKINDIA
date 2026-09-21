export type PdfTextToken = {
  str: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  pageNumber?: number;
};

type TextLine = {
  tokens: PdfTextToken[];
  y: number;
  height: number;
};

type ColumnBoundary = {
  start: number;
  end: number;
};

type ExtractionResult = {
  rows: string[][];
  confidence: number;
  table: {
    headerRowIndex: number;
    columns: ColumnBoundary[];
  } | null;
};

export type PdfLayoutRowKind = "header" | "metadata" | "information" | "table" | "totals" | "footer" | "spacer";

export type PdfPageLayout = {
  rows: string[][];
  rowKinds: PdfLayoutRowKind[];
  mergedRows: number[];
  tableRowStart: number;
  tableRowEnd: number;
  confidence: number;
};

const NO_TEXT_MESSAGE = "No extractable text was found in this PDF.";

function cleanToken(token: PdfTextToken): PdfTextToken | null {
  const str = token.str.replace(/\s+/g, " ").trim();
  if (!str || !Number.isFinite(token.x) || !Number.isFinite(token.y)) return null;

  return {
    ...token,
    str,
    width: Number.isFinite(token.width) && token.width && token.width > 0 ? token.width : undefined,
    height: Number.isFinite(token.height) && token.height && token.height > 0 ? token.height : undefined,
  };
}

function median(values: number[], fallback: number): number {
  if (!values.length) return fallback;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] || fallback;
}

function tokenEnd(token: PdfTextToken): number {
  return token.x + (token.width ?? 0);
}

function tokenCenter(token: PdfTextToken): number {
  return token.x + (token.width ?? 0) / 2;
}

function groupIntoLines(tokens: PdfTextToken[]): TextLine[] {
  const normalized = tokens.map(cleanToken).filter((token): token is PdfTextToken => token !== null);
  if (!normalized.length) return [];

  const heights = normalized.map((token) => token.height ?? 10).filter((height) => height > 0);
  const baselineTolerance = Math.max(1.5, median(heights, 10) * 0.55);
  const lines: TextLine[] = [];

  for (const token of [...normalized].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const matchingLine = lines.find((line) => Math.abs(line.y - token.y) <= Math.max(baselineTolerance, line.height * 0.55));

    if (matchingLine) {
      matchingLine.tokens.push(token);
      matchingLine.y = matchingLine.tokens.reduce((sum, item) => sum + item.y, 0) / matchingLine.tokens.length;
      matchingLine.height = Math.max(matchingLine.height, token.height ?? matchingLine.height);
    } else {
      lines.push({ tokens: [token], y: token.y, height: token.height ?? median(heights, 10) });
    }
  }

  return lines
    .map((line) => ({ ...line, tokens: line.tokens.sort((a, b) => a.x - b.x) }))
    .sort((a, b) => b.y - a.y);
}

function lineStartPositions(line: TextLine): number[] {
  return line.tokens.map((token) => token.x);
}

function repeatedAlignmentScore(candidate: TextLine, otherLines: TextLine[], tolerance: number): number {
  return candidate.tokens.reduce((score, token) => {
    const aligned = otherLines.some((line) =>
      line.tokens.some((other) => Math.abs(other.x - token.x) <= tolerance)
    );
    return score + (aligned ? 1 : 0);
  }, 0);
}

function looksNumeric(value: string): boolean {
  return /^[-+]?[$€£₹]?\s*\d[\d,]*(?:\.\d+)?%?$/.test(value);
}

function findHeader(lines: TextLine[], tolerance: number): number {
  if (lines.length < 2) return -1;

  let bestIndex = -1;
  let bestScore = 0;
  const candidateLimit = Math.max(3, Math.ceil(lines.length * 0.45));

  for (let index = 0; index < Math.min(lines.length, candidateLimit); index += 1) {
    const line = lines[index];
    if (line.tokens.length < 3) continue;

    const following = lines.slice(index + 1, Math.min(lines.length, index + 7));
    const alignment = repeatedAlignmentScore(line, following, tolerance * 1.8);
    const nonNumeric = line.tokens.filter((token) => !looksNumeric(token.str)).length;
    const score = line.tokens.length * 2 + alignment * 3 + nonNumeric;

    if (alignment >= 2 && score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  }

  return bestIndex;
}

function inferColumns(header: TextLine, followingLines: TextLine[], tolerance: number): ColumnBoundary[] {
  const starts = header.tokens.map((token) => token.x);
  const repeatedStarts = followingLines.flatMap(lineStartPositions);
  const centers = starts.map((start) => {
    const aligned = repeatedStarts.filter((value) => Math.abs(value - start) <= tolerance * 2);
    return aligned.length ? median([start, ...aligned], start) : start;
  });

  const sortedCenters = [...centers].sort((a, b) => a - b);
  const uniqueCenters: number[] = [];

  for (const center of sortedCenters) {
    if (!uniqueCenters.length || center - uniqueCenters[uniqueCenters.length - 1] > tolerance) {
      uniqueCenters.push(center);
    } else {
      uniqueCenters[uniqueCenters.length - 1] = (uniqueCenters[uniqueCenters.length - 1] + center) / 2;
    }
  }

  const firstStart = uniqueCenters[0] ?? 0;
  const lastEnd = Math.max(
    ...followingLines.flatMap((line) => line.tokens.map(tokenEnd)),
    ...header.tokens.map(tokenEnd),
    firstStart + 1
  );

  return uniqueCenters.map((start, index) => ({
    start: index === 0 ? Math.min(start, firstStart) : (uniqueCenters[index - 1] + start) / 2,
    end: index === uniqueCenters.length - 1 ? lastEnd + tolerance * 2 : (start + uniqueCenters[index + 1]) / 2,
  }));
}

function assignToColumns(line: TextLine, columns: ColumnBoundary[]): string[] {
  const cells = columns.map(() => [] as string[]);

  for (const token of line.tokens) {
    const center = tokenCenter(token);
    let columnIndex = columns.findIndex((column) => center >= column.start && center < column.end);

    if (columnIndex < 0) {
      const nearest = columns.reduce((best, column, index) => {
        const distance = center < column.start ? column.start - center : center > column.end ? center - column.end : 0;
        return distance < best.distance ? { index, distance } : best;
      }, { index: 0, distance: Number.POSITIVE_INFINITY });
      columnIndex = nearest.index;
    }

    cells[columnIndex].push(token.str);
  }

  return cells.map((cell) => cell.join(" ").trim());
}

function splitFreeformLine(line: TextLine, gapThreshold: number): string[] {
  if (!line.tokens.length) return [];
  const cells: string[] = [];
  let current: string[] = [];
  let previousEnd: number | null = null;

  for (const token of line.tokens) {
    if (previousEnd !== null && token.x - previousEnd > gapThreshold && current.length) {
      cells.push(current.join(" ").trim());
      current = [];
    }
    current.push(token.str);
    previousEnd = tokenEnd(token);
  }

  if (current.length) cells.push(current.join(" ").trim());
  return cells;
}

function normalizeRows(rows: string[][], columnCount: number): string[][] {
  return rows.map((row) => {
    const normalized = row.slice(0, columnCount);
    while (normalized.length < columnCount) normalized.push("");
    return normalized;
  });
}

export function extractRowsFromTokens(tokens: PdfTextToken[]): ExtractionResult {
  const lines = groupIntoLines(tokens);
  if (!lines.length) {
    return { rows: [[NO_TEXT_MESSAGE]], confidence: 0, table: null };
  }

  const heights = lines.flatMap((line) => line.tokens.map((token) => token.height ?? line.height));
  const fontHeight = median(heights, 10);
  const xGaps = lines.flatMap((line) => line.tokens.slice(1).map((token, index) => token.x - tokenEnd(line.tokens[index]))).filter((gap) => gap > 0);
  const naturalGap = median(xGaps, fontHeight * 2);
  const lineTolerance = Math.max(2, fontHeight * 0.7);
  const headerRowIndex = findHeader(lines, lineTolerance);

  if (headerRowIndex < 0) {
    const rows = lines.map((line) => splitFreeformLine(line, Math.max(fontHeight * 3, naturalGap * 2.5)));
    const columnCount = Math.max(...rows.map((row) => row.length), 1);
    return {
      rows: normalizeRows(rows.filter((row) => row.length > 0), columnCount),
      confidence: 0.45,
      table: null,
    };
  }

  const header = lines[headerRowIndex];
  const tableLines = lines.slice(headerRowIndex);
  const columns = inferColumns(header, tableLines.slice(1), lineTolerance);
  const descriptionColumn = header.tokens.findIndex((token) =>
    /description|details|item name|product|service/i.test(token.str)
  );
  const tableRows: string[][] = [];
  let previousTableLine: TextLine | null = null;

  for (const line of tableLines.map((tableLine) => ({ line: tableLine, cells: assignToColumns(tableLine, columns) }))) {
    const nonEmptyCells = line.cells.filter((cell) => cell.length > 0).length;
    const isWrappedDescription =
      descriptionColumn >= 0 &&
      tableRows.length > 0 &&
      nonEmptyCells === 1 &&
      line.cells[descriptionColumn].length > 0 &&
      previousTableLine !== null &&
      previousTableLine.y - line.line.y <= Math.max(lineTolerance * 1.5, line.line.height * 1.35);

    if (isWrappedDescription) {
      const previousRow = tableRows[tableRows.length - 1];
      previousRow[descriptionColumn] = `${previousRow[descriptionColumn]} ${line.cells[descriptionColumn]}`.trim();
    } else {
      tableRows.push(line.cells);
    }

    previousTableLine = line.line;
  }
  const beforeRows = lines.slice(0, headerRowIndex).map((line) => assignToColumns(line, columns));
  const rows = [...beforeRows, ...tableRows];
  const confidence = Math.min(0.99, 0.55 + Math.min(0.35, columns.length / 20) + (tableLines.length > 2 ? 0.08 : 0));

  return {
    rows: normalizeRows(rows, columns.length),
    confidence,
    table: { headerRowIndex: beforeRows.length, columns },
  };
}

function lineText(line: TextLine): string {
  return line.tokens.map((token) => token.str).join(" ").trim();
}

function splitLineByLargestGap(line: TextLine): [string, string] | null {
  if (line.tokens.length < 2) return null;

  let largestGap = 0;
  let splitIndex = -1;
  for (let index = 1; index < line.tokens.length; index += 1) {
    const gap = line.tokens[index].x - tokenEnd(line.tokens[index - 1]);
    if (gap > largestGap) {
      largestGap = gap;
      splitIndex = index;
    }
  }

  if (splitIndex < 0 || largestGap <= Math.max(2, line.height * 0.8)) return null;
  return [
    line.tokens.slice(0, splitIndex).map((token) => token.str).join(" ").trim(),
    line.tokens.slice(splitIndex).map((token) => token.str).join(" ").trim(),
  ];
}

function splitLineByPageHalf(line: TextLine, pageWidth: number): [string, string] {
  const midpoint = pageWidth / 2;
  const leftTokens = line.tokens.filter((token) => tokenCenter(token) < midpoint);
  const rightTokens = line.tokens.filter((token) => tokenCenter(token) >= midpoint);
  const left = leftTokens.map((token) => token.str).join(" ").trim();
  const right = rightTokens.map((token) => token.str).join(" ").trim();

  if (!left && right) return splitLineByLargestGap(line) ?? ["", right];
  if (left && !right) return splitLineByLargestGap(line) ?? [left, ""];
  return [left, right];
}

function isTotalsLine(text: string): boolean {
  return /\b(subtotal|tax|deposit|total|amount due|balance|discount|shipping|fee)\b/i.test(text);
}

function isFooterLine(text: string): boolean {
  return /\b(payable|payable to|checks?|due in|overdue|service charge|terms and conditions|website|www\.|@)\b/i.test(text);
}

function appendSpacer(rows: string[][], rowKinds: PdfLayoutRowKind[]) {
  if (rows.length && rowKinds[rowKinds.length - 1] !== "spacer") {
    rows.push([""]);
    rowKinds.push("spacer");
  }
}

export function extractPageLayout(
  tokens: PdfTextToken[],
  pageWidth: number,
  pageHeight: number
): PdfPageLayout {
  const lines = groupIntoLines(tokens);
  if (!lines.length) {
    return { rows: [[NO_TEXT_MESSAGE]], rowKinds: ["footer"], mergedRows: [], tableRowStart: -1, tableRowEnd: -1, confidence: 0 };
  }

  const heights = lines.flatMap((line) => line.tokens.map((token) => token.height ?? line.height));
  const lineTolerance = Math.max(2, median(heights, 10) * 0.7);
  const headerLineIndex = findHeader(lines, lineTolerance);
  const extraction = extractRowsFromTokens(tokens);
  const rows: string[][] = [];
  const rowKinds: PdfLayoutRowKind[] = [];
  const mergedRows: number[] = [];
  const addRow = (row: string[], kind: PdfLayoutRowKind, merge = false) => {
    const index = rows.length;
    rows.push(row);
    rowKinds.push(kind);
    if (merge) mergedRows.push(index);
  };

  const topThreshold = pageHeight * 0.72;
  const lineGaps = lines.slice(headerLineIndex + 1).map((line, index) => lines[headerLineIndex + index].y - line.y).filter((gap) => gap > 0);
  const expectedRowGap = lineGaps.length
    ? Math.min(...lineGaps)
    : Math.max(8, median(heights, 10) * 1.8);
  const tableGapThreshold = Math.max(median(heights, 10) * 4, expectedRowGap * 2.5);
  let tableEndLineIndex = headerLineIndex;
  for (let index = headerLineIndex + 1; index < lines.length; index += 1) {
    const gap = lines[index - 1].y - lines[index].y;
    if (gap > tableGapThreshold) break;
    tableEndLineIndex = index;
  }
  const tableBottom = lines[tableEndLineIndex]?.y ?? Number.NEGATIVE_INFINITY;
  const infoLines = headerLineIndex >= 0
    ? lines.slice(0, headerLineIndex).filter((line) => line.y <= topThreshold && line.y > tableBottom)
    : [];

  for (const line of lines.slice(0, headerLineIndex >= 0 ? headerLineIndex : lines.length)) {
    const text = lineText(line);
    if (!text) continue;

    if (line.y > topThreshold) {
      const [left, right] = splitLineByPageHalf(line, pageWidth);
      if (left && right) addRow([left, "", right], "header");
      else addRow([text], "header", true);
    } else if (infoLines.includes(line)) {
      const [left, right] = splitLineByPageHalf(line, pageWidth);
      if (left && right) addRow([left, "", right], "information");
      else addRow([text], "information");
    }
  }

  if (headerLineIndex >= 0 && extraction.table) {
    appendSpacer(rows, rowKinds);
    const physicalTableRowCount = tableEndLineIndex - headerLineIndex + 1;
    const tableRows = extraction.rows.slice(extraction.table.headerRowIndex, extraction.table.headerRowIndex + physicalTableRowCount);
    const tableRowStart = rows.length;
    tableRows.forEach((row) => addRow(row, "table"));
    const tableRowEnd = rows.length - 1;

    const afterTableLines = lines.slice(tableEndLineIndex + 1);
    for (const line of afterTableLines) {
      const text = lineText(line);
      if (!text) continue;
      const [left, right] = splitLineByPageHalf(line, pageWidth);

      if (isTotalsLine(text) || (right && /[$€£₹]?\s*\d/.test(right))) {
        addRow(["", "", "", "", left || text, right], "totals");
      } else if (isFooterLine(text) || line.y < pageHeight * 0.2) {
        addRow([text], "footer", true);
      } else {
        addRow([left || text, "", right], "information");
      }
    }

    return {
      rows,
      rowKinds,
      mergedRows,
      tableRowStart,
      tableRowEnd,
      confidence: Math.min(0.99, extraction.confidence + 0.03),
    };
  }

  for (const line of lines) {
    const text = lineText(line);
    if (text) addRow([text], line.y < pageHeight * 0.2 ? "footer" : "information", true);
  }

  return { rows, rowKinds, mergedRows, tableRowStart: -1, tableRowEnd: -1, confidence: extraction.confidence };
}

export { NO_TEXT_MESSAGE };
