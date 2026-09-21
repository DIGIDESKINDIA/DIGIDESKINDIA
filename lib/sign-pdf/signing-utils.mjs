export function convertNormalizedFieldToPdfRect(field, pageWidth, pageHeight) {
  const width = Number(field?.width ?? 0) * Number(pageWidth || 1);
  const height = Number(field?.height ?? 0) * Number(pageHeight || 1);
  const x = Number(field?.x ?? 0) * Number(pageWidth || 1);
  const y = Number(field?.y ?? 0) * Number(pageHeight || 1);

  return {
    x,
    y: Number(pageHeight || 0) - (y + height),
    width,
    height,
  };
}

export function calculatePageIndexes({ pageCount, pageIndex, mode, range }) {
  const safeCount = Number(pageCount || 1);
  const safeIndex = Number(pageIndex ?? 0);

  if (!Number.isFinite(safeCount) || safeCount < 1) {
    return [];
  }

  if (mode === "single") {
    return [Math.min(Math.max(safeIndex, 0), safeCount - 1)];
  }

  if (mode === "all") {
    return Array.from({ length: safeCount }, (_, index) => index);
  }

  if (mode === "all-but-last") {
    return Array.from({ length: Math.max(0, safeCount - 1) }, (_, index) => index);
  }

  if (mode === "last") {
    return [safeCount - 1];
  }

  if (mode === "range" && Array.isArray(range) && range.length === 2) {
    const start = Math.min(Math.max(range[0], 0), safeCount - 1);
    const end = Math.min(Math.max(range[1], 0), safeCount - 1);
    const from = Math.min(start, end);
    const to = Math.max(start, end);

    return Array.from({ length: to - from + 1 }, (_, offset) => from + offset);
  }

  return [Math.min(Math.max(safeIndex, 0), safeCount - 1)];
}
