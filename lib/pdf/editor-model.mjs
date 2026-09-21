export function sanitizeFilename(name = "edited-document.pdf") {
  const base = String(name)
    .replace(/\\+/g, "/")
    .split("/")
    .pop()
    ?.trim();

  if (!base || base === "." || base === "..") {
    return "edited-document.pdf";
  }

  const withoutExtension = base.replace(/\.pdf$/i, "").trim();
  const cleaned = withoutExtension
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();

  const safeName = cleaned || "edited-document";
  return `${safeName}.pdf`;
}

export function editedFilename(name = "document.pdf") {
  const safe = sanitizeFilename(name).replace(/\.pdf$/i, "");
  const base = safe.replace(/-edited$/i, "");
  return `${base || "document"}-edited.pdf`;
}

function asFiniteNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function splitPdfTextItemIntoWordBoxes(item = {}) {
  const text = String(item.str ?? "");
  const width = Math.max(asFiniteNumber(item.width, 0), 0);
  const height = Math.max(asFiniteNumber(item.height, 0), 1);
  const transform = Array.isArray(item.transform) && item.transform.length >= 6
    ? item.transform.map((value) => asFiniteNumber(value))
    : [1, 0, 0, 1, 0, 0];
  const originX = transform[4];
  const originY = transform[5];
  const xLength = Math.hypot(transform[0], transform[1]) || 1;
  const yLength = Math.hypot(transform[2], transform[3]) || 1;
  const axisX = [transform[0] / xLength, transform[1] / xLength];
  const axisY = [transform[2] / yLength, transform[3] / yLength];
  const lines = text.split(/\r?\n/);
  const lineHeight = Math.max(height, yLength, 1);
  const boxes = [];

  lines.forEach((line, lineIndex) => {
    const lineOffsetX = axisY[0] * lineHeight * lineIndex;
    const lineOffsetY = axisY[1] * lineHeight * lineIndex;
    const matches = line.matchAll(/[\p{L}\p{N}]+/gu);

    for (const match of matches) {
      const start = match.index ?? 0;
      const word = match[0];
      const end = start + word.length;
      const localStart = width * (line.length ? start / line.length : 0);
      const localEnd = width * (line.length ? end / line.length : 0);
      const corners = [
        [localStart, 0],
        [localEnd, 0],
        [localStart, lineHeight],
        [localEnd, lineHeight],
      ].map(([localX, localY]) => [
        originX + lineOffsetX + axisX[0] * localX + axisY[0] * localY,
        originY + lineOffsetY + axisX[1] * localX + axisY[1] * localY,
      ]);
      const xs = corners.map(([x]) => x);
      const ys = corners.map(([, y]) => y);

      boxes.push({
        text: word,
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
        baseline: originY + lineOffsetY,
      });
    }
  });

  return boxes;
}

export function pdfToEditorPoint(point, pageWidth = 1, pageHeight = 1) {
  const x = asFiniteNumber(point?.x, 0);
  const y = asFiniteNumber(point?.y, 0);
  return {
    x: (x / Math.max(pageWidth, 1)) * 100,
    y: 100 - (y / Math.max(pageHeight, 1)) * 100,
  };
}

export function editorToPdfPoint(point, pageWidth = 1, pageHeight = 1) {
  const x = asFiniteNumber(point?.x, 0);
  const y = asFiniteNumber(point?.y, 0);
  return {
    x: (x / 100) * Math.max(pageWidth, 1),
    y: (1 - y / 100) * Math.max(pageHeight, 1),
  };
}

export function pdfRectToEditorRect(rect, pageWidth = 1, pageHeight = 1) {
  const x = asFiniteNumber(rect?.x, 0);
  const y = asFiniteNumber(rect?.y, 0);
  const width = asFiniteNumber(rect?.width, 0);
  const height = asFiniteNumber(rect?.height, 0);

  return {
    x: (x / Math.max(pageWidth, 1)) * 100,
    y: 100 - ((y + height) / Math.max(pageHeight, 1)) * 100,
    width: (width / Math.max(pageWidth, 1)) * 100,
    height: (height / Math.max(pageHeight, 1)) * 100,
  };
}

export function editorRectToPdfRect(rect, pageWidth = 1, pageHeight = 1) {
  const x = asFiniteNumber(rect?.x, 0);
  const y = asFiniteNumber(rect?.y, 0);
  const width = asFiniteNumber(rect?.width, 0);
  const height = asFiniteNumber(rect?.height, 0);

  return {
    x: (x / 100) * Math.max(pageWidth, 1),
    y: (1 - (y + height) / 100) * Math.max(pageHeight, 1),
    width: (width / 100) * Math.max(pageWidth, 1),
    height: (height / 100) * Math.max(pageHeight, 1),
  };
}

export function getTextLayoutWidth(element) {
  const explicit = Number(element?.pdfLineWidth ?? element?.lineWidth ?? element?.availableWidth);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return Math.max(Number(element?.pdfWidth ?? element?.width ?? 0), 0);
}

export function getEditorDomRect(element, pageRect, pageSize, rotation = 0) {
  const pageWidth = Math.max(Number(pageSize?.width ?? pageRect?.width ?? 1), 1);
  const pageHeight = Math.max(Number(pageSize?.height ?? pageRect?.height ?? 1), 1);
  const renderedWidth = Math.max(Number(pageRect?.width ?? pageWidth), 1);
  const renderedHeight = Math.max(Number(pageRect?.height ?? pageHeight), 1);
  const source = {
    x: Number(element?.x ?? 0) / 100 * pageWidth,
    y: Number(element?.y ?? 0) / 100 * pageHeight,
    width: Number(element?.width ?? 0) / 100 * pageWidth,
    height: Number(element?.height ?? 0) / 100 * pageHeight,
  };
  const normalizedRotation = ((Number(rotation) % 360) + 360) % 360;
  let x = source.x;
  let y = source.y;
  let width = source.width;
  let height = source.height;

  if (normalizedRotation === 90) {
    x = pageHeight - source.y - source.height;
    y = source.x;
    width = source.height;
    height = source.width;
  } else if (normalizedRotation === 180) {
    x = pageWidth - source.x - source.width;
    y = pageHeight - source.y - source.height;
  } else if (normalizedRotation === 270) {
    x = source.y;
    y = pageWidth - source.x - source.width;
    width = source.height;
    height = source.width;
  }

  const rotatedPageWidth = normalizedRotation === 90 || normalizedRotation === 270 ? pageHeight : pageWidth;
  const rotatedPageHeight = normalizedRotation === 90 || normalizedRotation === 270 ? pageWidth : pageHeight;
  return {
    left: Number(pageRect?.left ?? 0) + x * (renderedWidth / rotatedPageWidth),
    top: Number(pageRect?.top ?? 0) + y * (renderedHeight / rotatedPageHeight),
    width: width * (renderedWidth / rotatedPageWidth),
    height: height * (renderedHeight / rotatedPageHeight),
  };
}

export function createTextElement(input = {}) {
  const pageIndex = Number.isFinite(input.pageIndex) ? input.pageIndex : 1;
  const x = Number.isFinite(input.x) ? input.x : 0;
  const y = Number.isFinite(input.y) ? input.y : 0;
  const width = Number.isFinite(input.width) ? input.width : 80;
  const height = Number.isFinite(input.height) ? input.height : 12;
  const resolvedFontWeight = input.fontWeight === "bold" ? "bold" : "normal";
  const sourceStyle = input.sourceStyle ?? {
    fontName: input.fontName ?? undefined,
    fontFamily: input.fontFamily ?? "Helvetica",
    fontSize: Number.isFinite(input.fontSize) ? input.fontSize : 12,
    fontWeight: resolvedFontWeight,
    italic: Boolean(input.italic),
    color: input.color ?? "#111827",
    opacity: Number.isFinite(input.opacity) ? input.opacity : 1,
    transform: Array.isArray(input.transform) ? input.transform : [1, 0, 0, 1, 0, 0],
    baseline: Number.isFinite(input.baseline) ? input.baseline : y,
    lineHeight: Number.isFinite(input.lineHeight) ? input.lineHeight : 1.2,
    charSpacing: Number.isFinite(input.charSpacing) ? input.charSpacing : 0,
    rotation: Number.isFinite(input.rotation) ? input.rotation : 0,
    scaleX: Number.isFinite(input.scaleX) ? input.scaleX : 1,
    scaleY: Number.isFinite(input.scaleY) ? input.scaleY : 1,
  };

  return {
    id: input.id ?? `text-${Math.random().toString(36).slice(2, 10)}`,
    pageIndex,
    originalText: input.originalText ?? "",
    currentText: input.currentText ?? input.originalText ?? "",
    x,
    y,
    width,
    height,
    pdfX: Number.isFinite(input.pdfX) ? input.pdfX : x,
    pdfY: Number.isFinite(input.pdfY) ? input.pdfY : y,
    pdfWidth: Number.isFinite(input.pdfWidth) ? input.pdfWidth : width,
    pdfLineWidth: Number.isFinite(input.pdfLineWidth) ? input.pdfLineWidth : undefined,
    pdfHeight: Number.isFinite(input.pdfHeight) ? input.pdfHeight : height,
    transform: Array.isArray(input.transform) ? input.transform : [1, 0, 0, 1, 0, 0],
    fontName: input.fontName ?? sourceStyle.fontName ?? undefined,
    fontFamily: input.fontFamily ?? sourceStyle.fontFamily ?? "Helvetica",
    fontSize: Number.isFinite(input.fontSize) ? input.fontSize : sourceStyle.fontSize ?? 12,
    fontWeight: input.fontWeight ?? sourceStyle.fontWeight ?? "normal",
    italic: Boolean(input.italic ?? sourceStyle.italic),
    color: input.color ?? sourceStyle.color ?? "#111827",
    opacity: Number.isFinite(input.opacity) ? input.opacity : sourceStyle.opacity ?? 1,
    rotation: Number.isFinite(input.rotation) ? input.rotation : sourceStyle.rotation ?? 0,
    scaleX: Number.isFinite(input.scaleX) ? input.scaleX : sourceStyle.scaleX ?? 1,
    scaleY: Number.isFinite(input.scaleY) ? input.scaleY : sourceStyle.scaleY ?? 1,
    charSpacing: Number.isFinite(input.charSpacing) ? input.charSpacing : sourceStyle.charSpacing ?? 0,
    lineHeight: Number.isFinite(input.lineHeight) ? input.lineHeight : sourceStyle.lineHeight ?? 1.2,
    baseline: Number.isFinite(input.baseline) ? input.baseline : sourceStyle.baseline ?? y,
    align: input.align ?? "left",
    originalBBox: input.originalBBox ?? {
      x: Number.isFinite(input.pdfX) ? input.pdfX : x,
      y: Number.isFinite(input.pdfY) ? input.pdfY : y,
      width: Number.isFinite(input.pdfWidth) ? input.pdfWidth : width,
      height: Number.isFinite(input.pdfHeight) ? input.pdfHeight : height,
    },
    changed: Boolean(input.changed),
    source: input.source ?? "extracted",
    edited: Boolean(input.edited),
    sourceFontName: input.sourceFontName ?? sourceStyle.sourceFontName ?? input.fontName ?? undefined,
    sourceStyle,
    textRuns: Array.isArray(input.textRuns) ? input.textRuns.map((run) => ({ ...run })) : undefined,
  };
}

function normalizeTextRuns(runs = []) {
  return runs.filter((run) => run?.text).reduce((result, run) => {
    const previous = result[result.length - 1];
    const style = { ...run, text: undefined };
    if (previous && JSON.stringify({ ...previous, text: undefined }) === JSON.stringify(style)) previous.text += run.text;
    else result.push({ ...run });
    return result;
  }, []);
}

function sliceTextRuns(runs, start, end) {
  const result = [];
  let offset = 0;
  for (const run of runs) {
    const runStart = offset;
    const runEnd = offset + run.text.length;
    const sliceStart = Math.max(start, runStart);
    const sliceEnd = Math.min(end, runEnd);
    if (sliceEnd > sliceStart) result.push({ ...run, text: run.text.slice(sliceStart - runStart, sliceEnd - runStart) });
    offset = runEnd;
  }
  return result;
}

export function remapTextRuns(originalText, replacementText, textRuns = []) {
  const original = String(originalText ?? "");
  const replacement = String(replacementText ?? "");
  const runs = normalizeTextRuns(textRuns.length ? textRuns : [{ text: original, bold: false, italic: false }]);
  if (original === replacement) return runs;
  if (!original || !replacement) return replacement ? [{ ...runs[0], text: replacement }] : [];

  let prefix = 0;
  while (prefix < original.length && prefix < replacement.length && original[prefix] === replacement[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < original.length - prefix && suffix < replacement.length - prefix
    && original[original.length - suffix - 1] === replacement[replacement.length - suffix - 1]) suffix += 1;
  const changedStart = prefix;
  const changedEnd = original.length - suffix;
  const replacementEnd = replacement.length - suffix;

  const styleAt = (index) => {
    let offset = 0;
    for (const run of runs) {
      if (index < offset + run.text.length) return run;
      offset += run.text.length;
    }
    return runs[runs.length - 1] ?? { bold: false, italic: false };
  };
  const changedRuns = [];
  const originalChangedLength = Math.max(changedEnd - changedStart, 1);
  const replacementChangedText = replacement.slice(prefix, replacementEnd);
  for (let index = 0; index < replacementChangedText.length; index += 1) {
    const sourceIndex = changedStart + Math.min(originalChangedLength - 1, Math.floor(index * originalChangedLength / Math.max(replacementChangedText.length, 1)));
    changedRuns.push({ ...styleAt(sourceIndex), text: replacementChangedText[index] });
  }
  const prefixRuns = sliceTextRuns(runs, 0, prefix);
  const suffixRuns = sliceTextRuns(runs, original.length - suffix, original.length);
  return normalizeTextRuns([...prefixRuns, ...changedRuns, ...suffixRuns]);
}

export function replaceTextElement(element, replacementText) {
  const nextValue = String(replacementText ?? "");
  const originalValue = String(element?.originalText ?? element?.text ?? element?.currentText ?? "");
  const currentValue = String(element?.currentText ?? element?.text ?? element?.originalText ?? "");
  const fontSize = Number.isFinite(element?.fontSize) ? Number(element.fontSize) : 12;
  const nextWidth = element?.source === "extracted"
    ? Number(element?.width ?? 0)
    : Math.max(Number(element?.width ?? 0), Math.max(24, nextValue.length * (fontSize * 0.55)));

  const textRuns = remapTextRuns(currentValue, nextValue, Array.isArray(element?.textRuns) ? element.textRuns : [{
    text: currentValue,
    bold: element?.fontWeight === "bold" || element?.isBold === true,
    italic: element?.italic === true,
    underline: element?.underline === true,
    strike: element?.strike === true,
  }]);
  return {
    ...element,
    currentText: nextValue,
    text: nextValue,
    changed: nextValue !== originalValue,
    edited: nextValue !== originalValue,
    width: nextWidth,
    textRuns,
  };
}

export function replaceTextElementById(elements, elementId, replacementText) {
  return (Array.isArray(elements) ? elements : []).map((element) => (
    element?.id === elementId ? replaceTextElement(element, replacementText) : element
  ));
}

export function shouldRenderTextElement(element) {
  if (element?.kind && element.kind !== "text") return false;
  if (element?.source === "user") return true;
  return element?.changed === true || element?.originalText !== (element?.currentText ?? element?.text ?? element?.originalText);
}

export function shouldShowSelectionHandles({ tool, selectedId, editingTextId, pendingPoint = false } = {}) {
  if (!selectedId || pendingPoint) return false;
  if (tool === "select") return true;
  return tool === "text" && editingTextId === selectedId;
}

export function resizeElement(element, handle, deltaX, deltaY, { preserveAspect = false, minSize = 2 } = {}) {
  const original = { x: Number(element.x ?? 0), y: Number(element.y ?? 0), width: Number(element.width ?? minSize), height: Number(element.height ?? minSize) };
  let { x, y, width, height } = original;

  if (handle.includes("left")) {
    x += deltaX;
    width -= deltaX;
  }
  if (handle.includes("right")) width += deltaX;
  if (handle.includes("top")) {
    y += deltaY;
    height -= deltaY;
  }
  if (handle.includes("bottom")) height += deltaY;

  width = Math.max(minSize, width);
  height = Math.max(minSize, height);
  if (preserveAspect) {
    const ratio = original.width / Math.max(original.height, minSize);
    if (Math.abs(deltaX) >= Math.abs(deltaY)) height = Math.max(minSize, width / Math.max(ratio, 0.01));
    else width = Math.max(minSize, height * ratio);
    if (handle.includes("top")) y = original.y + original.height - height;
    if (handle.includes("left")) x = original.x + original.width - width;
  }

  return { ...element, x: Math.max(0, x), y: Math.max(0, y), width, height };
}

export function rotationFromPointer(center, pointer, snap = 3) {
  const angle = (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) / Math.PI + 90;
  const normalized = (angle + 360) % 360;
  const snaps = [0, 45, 90, 180, 270, 315];
  const nearest = snaps.find((value) => Math.abs(value - normalized) <= snap || Math.abs(value + 360 - normalized) <= snap);
  return nearest == null ? normalized : nearest;
}

export function buildTextSearchStream(elements) {
  const stream = [];
  const grouped = new Map();
  for (const element of elements ?? []) {
    if (element.kind !== "text" && element.currentText == null && element.originalText == null) continue;
    const text = String(element.text ?? element.currentText ?? element.originalText ?? "");
    if (!text) continue;
    if (!grouped.has(element.pageIndex)) grouped.set(element.pageIndex, []);
    grouped.get(element.pageIndex).push(element);
  }

  for (const [pageIndex, pageElements] of grouped) {
    pageElements.sort((left, right) => (Number(left.y ?? 0) - Number(right.y ?? 0)) || (Number(left.x ?? 0) - Number(right.x ?? 0)));
    let offset = 0;
    for (let index = 0; index < pageElements.length; index += 1) {
      const element = pageElements[index];
      const text = String(element.text ?? element.currentText ?? element.originalText ?? "");
      if (index > 0) offset += 1;
      const start = offset;
      const end = start + text.length;
      stream.push({ objectId: element.id, pageIndex, text, start, end, bbox: { x: element.x, y: element.y, width: element.width, height: element.height } });
      offset = end;
    }
  }
  return stream;
}

export function findComposedTextMatches(elements, query, { caseSensitive = false, wholeWord = false } = {}) {
  const needle = String(query ?? "");
  if (!needle) return [];
  const stream = buildTextSearchStream(elements);
  const results = [];
  const byPage = new Map();
  for (const run of stream) {
    if (!byPage.has(run.pageIndex)) byPage.set(run.pageIndex, []);
    byPage.get(run.pageIndex).push(run);
  }
  for (const [pageIndex, runs] of byPage) {
    const text = runs.map((run) => run.text).join(" ");
    const haystack = caseSensitive ? text : text.toLowerCase();
    const target = caseSensitive ? needle : needle.toLowerCase();
    let from = 0;
    while (from < haystack.length) {
      const index = haystack.indexOf(target, from);
      if (index < 0) break;
      const before = text[index - 1] ?? " ";
      const after = text[index + target.length] ?? " ";
      if (!wholeWord || /\W/u.test(before) && /\W/u.test(after)) {
        const affected = runs.filter((run) => run.end > index && run.start < index + target.length);
        results.push({ pageIndex, text: text.slice(index, index + target.length), objectIds: affected.map((run) => run.objectId), bbox: affected.reduce((box, run) => ({ x: Math.min(box.x, run.bbox.x), y: Math.min(box.y, run.bbox.y), width: Math.max(box.x + box.width, run.bbox.x + run.bbox.width) - Math.min(box.x, run.bbox.x), height: Math.max(box.y + box.height, run.bbox.y + run.bbox.height) - Math.min(box.y, run.bbox.y) }), { x: 100, y: 100, width: 0, height: 0 }) });
      }
      from = index + Math.max(target.length, 1);
    }
  }
  return results;
}

export function findTextMatches(elements, query) {
  const normalizedQuery = String(query ?? "").trim().toLowerCase();
  if (!normalizedQuery) return [];

  return elements
    .filter((element) => {
        const value = String(element.text ?? element.currentText ?? element.originalText ?? "").toLowerCase();
      return value.includes(normalizedQuery);
    })
    .map((element) => ({
      id: element.id,
      pageIndex: element.pageIndex,
      x: element.x,
      y: element.y,
      text: element.text ?? element.currentText ?? element.originalText ?? "",
    }));
}

export function hitTestText(elements, pageIndex, x, y, tolerance = 0, rotation = 0) {
  const normalizedRotation = ((Number(rotation) % 360) + 360) % 360;
  const pagePoint = normalizedRotation === 90
    ? { x: y, y: 100 - x }
    : normalizedRotation === 180
      ? { x: 100 - x, y: 100 - y }
      : normalizedRotation === 270
        ? { x: 100 - y, y: x }
        : { x, y };
  const pageElements = (Array.isArray(elements) ? elements : []).filter((element) => element.pageIndex === pageIndex);
  let bestMatch = null;
  let bestArea = Number.POSITIVE_INFINITY;

  for (const element of pageElements) {
    const left = Number(element.x ?? 0);
    const top = Number(element.y ?? 0);
    const width = Number(element.width ?? 0);
    const height = Number(element.height ?? 0);
    const right = left + width;
    const bottom = top + height;

    if (element.kind !== "text" && element.originalText == null && element.currentText == null) {
      continue;
    }

    const inside = pagePoint.x >= left - tolerance && pagePoint.x <= right + tolerance && pagePoint.y >= top - tolerance && pagePoint.y <= bottom + tolerance;
    if (!inside) continue;

    const area = Math.max(width * height, 0.0001);
    if (area < bestArea) {
      bestArea = area;
      bestMatch = element;
    }
  }

  return bestMatch;
}
