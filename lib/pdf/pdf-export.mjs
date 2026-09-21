import {
  PDFArray,
  PDFName,
  PDFNumber,
  PDFString,
  PDFDocument,
  degrees,
  rgb,
} from "pdf-lib";
import { editorRectToPdfRect, getTextLayoutWidth } from "./editor-model.mjs";
import { embedEditorFont } from "./pdf-fonts.mjs";

function color(value = "#111827") {
  const hex = value.replace("#", "");
  const number = Number.parseInt(hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex, 16);
  return rgb(((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255);
}

function pageRect(element, pageWidth, pageHeight) {
  return editorRectToPdfRect(element, pageWidth, pageHeight);
}

export function getTextReplacementRegion(element) {
  const original = element?.originalBBox ?? {};
  const x = Number(element?.pdfX ?? original.x ?? 0);
  const y = Number(element?.pdfY ?? original.y ?? 0) - Number(element?.pdfHeight ?? original.height ?? 0);
  const width = Number(element?.pdfWidth ?? original.width ?? 0);
  const height = Number(element?.pdfHeight ?? original.height ?? 0);
  const margin = Math.min(0.25, Math.max(0.05, height * 0.008));

  return {
    x: Math.max(0, x - margin),
    y: Math.max(0, y - margin),
    width: width + margin * 2,
    height: height + margin * 2,
  };
}

export const supportsTrueRedaction = false;

export function getVisualWhiteoutRegion(element) {
  return getTextReplacementRegion(element);
}

function addUriLink(page, rect, url) {
  if (!url) return;
  const context = page.doc.context;
  const annotation = context.obj({
    Type: "Annot",
    Subtype: "Link",
    Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
    Border: [0, 0, 0],
    A: context.obj({
      Type: "Action",
      S: "URI",
      URI: PDFString.of(url),
    }),
  });
  const annots = page.node.lookup(PDFName.of("Annots"), PDFArray) ?? context.obj([]);
  annots.push(annotation);
  page.node.set(PDFName.of("Annots"), annots);
}

function addMarkupAnnotation(page, rect, subtype, colorValue) {
  const context = page.doc.context;
  const annotation = context.obj({
    Type: "Annot",
    Subtype: subtype,
    Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
    C: [colorValue[0], colorValue[1], colorValue[2]],
    CA: 0.35,
    QuadPoints: [rect.x, rect.y + rect.height, rect.x + rect.width, rect.y + rect.height, rect.x, rect.y, rect.x + rect.width, rect.y],
  });
  const annots = page.node.lookup(PDFName.of("Annots"), PDFArray) ?? context.obj([]);
  annots.push(annotation);
  page.node.set(PDFName.of("Annots"), annots);
}

async function drawText(pdfDoc, page, element, rect, { replacement = false, baseUrl = "" } = {}) {
  const { sourceStyle, ...elementStyle } = element ?? {};
  const style = { ...(sourceStyle ?? {}), ...elementStyle };
  if (!style.fontWeightExplicit && (style.fontWeight === "bold" || style.isBold || style.initialFontWeight === "bold" || Number(style.capturedFontWeight) >= 600)) {
    style.fontWeight = "bold";
  }
  const text = String(element.currentText ?? element.text ?? element.originalText ?? "");
  if (!text) return;
  const baseline = Number(style.pdfY ?? element.pdfY ?? rect.y + rect.height * 0.8);
  const size = Number(style.fontSize ?? element.fontSize ?? 12);
  const commonOptions = {
    y: Math.max(0, Math.min(page.getHeight(), baseline)),
    size,
    color: color(style.color ?? element.color ?? "#111827"),
    opacity: Number(style.opacity ?? element.opacity ?? 1),
    rotate: degrees(Number(style.rotation ?? element.rotation ?? 0)),
    lineHeight: Number(style.lineHeight ?? element.lineHeight ?? size) * size,
  };
  const runs = Array.isArray(element.textRuns) && element.textRuns.length
    ? element.textRuns
    : [{ text, bold: style.fontWeight === "bold", italic: Boolean(style.italic) }];
  let x = rect.x;
  for (const run of runs) {
    if (!run.text) continue;
    const runStyle = { ...style, fontWeight: run.bold ? "bold" : "normal", italic: Boolean(run.italic) };
    const font = await embedEditorFont(pdfDoc, runStyle, { baseUrl });
    const runColor = color(run.color ?? style.color ?? element.color ?? "#111827");
    page.drawText(run.text, { ...commonOptions, x, font, color: runColor, opacity: Number(run.opacity ?? commonOptions.opacity), maxWidth: Math.max(0.1, rect.x + rect.width - x) });
    const runWidth = font.widthOfTextAtSize(run.text, size);
    if (run.underline) page.drawLine({ start: { x, y: commonOptions.y - size * 0.12 }, end: { x: x + runWidth, y: commonOptions.y - size * 0.12 }, thickness: Math.max(0.5, size * 0.05), color: runColor, opacity: Number(run.opacity ?? commonOptions.opacity) });
    if (run.strike) page.drawLine({ start: { x, y: commonOptions.y + size * 0.3 }, end: { x: x + runWidth, y: commonOptions.y + size * 0.3 }, thickness: Math.max(0.5, size * 0.05), color: runColor, opacity: Number(run.opacity ?? commonOptions.opacity) });
    x += runWidth;
  }
}

async function drawElement(pdfDoc, page, element, baseUrl) {
  const { width: pageWidth, height: pageHeight } = page.getSize();
  const rect = pageRect(element, pageWidth, pageHeight);
  const fill = color(element.color ?? "#111827");

  if (element.kind === "text") {
    if (element.source === "extracted" && element.changed && element.originalText !== element.currentText) {
      const rawReplacementRegion = getVisualWhiteoutRegion(element);
      const replacementRegion = {
        x: Math.max(0, Math.min(pageWidth, rawReplacementRegion.x)),
        y: Math.max(0, Math.min(pageHeight, rawReplacementRegion.y)),
        width: Math.max(0.1, Math.min(pageWidth - Math.max(0, rawReplacementRegion.x), rawReplacementRegion.width)),
        height: Math.max(0.1, Math.min(pageHeight - Math.max(0, rawReplacementRegion.y), rawReplacementRegion.height)),
      };
      page.drawRectangle({ x: replacementRegion.x, y: replacementRegion.y, width: replacementRegion.width, height: replacementRegion.height, color: rgb(1, 1, 1) });
      const textX = Math.max(0, Math.min(pageWidth, Number(element.pdfX ?? replacementRegion.x)));
      const textY = Math.max(0, Math.min(pageHeight, Number(element.pdfY ?? 0) - Number(element.pdfHeight ?? replacementRegion.height)));
      const textRegion = {
        x: textX,
        y: textY,
        width: Math.max(0.1, Math.min(pageWidth - textX, getTextLayoutWidth(element) || Number(element.pdfWidth ?? replacementRegion.width))),
        height: Math.max(0.1, Math.min(pageHeight - textY, Number(element.pdfHeight ?? replacementRegion.height))),
      };
      await drawText(pdfDoc, page, element, textRegion, { replacement: true, baseUrl });
    } else if (element.source !== "extracted") {
      await drawText(pdfDoc, page, element, rect, { baseUrl });
    }
    return;
  }

  if (element.kind === "whiteout") {
    page.drawRectangle({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, color: rgb(1, 1, 1), opacity: 1 });
    return;
  }

  if (element.kind === "shape") {
    page.drawRectangle({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, borderColor: fill, borderWidth: Number(element.strokeWidth ?? 2), rotate: degrees(Number(element.rotation ?? 0)) });
    return;
  }

  if (element.kind === "highlight") {
    page.drawRectangle({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, color: rgb(1, 0.88, 0.1), opacity: 0.35 });
    addMarkupAnnotation(page, rect, "Highlight", [1, 0.88, 0.1]);
    return;
  }

  if (element.kind === "strike") {
    page.drawLine({ start: { x: rect.x, y: rect.y + rect.height / 2 }, end: { x: rect.x + rect.width, y: rect.y + rect.height / 2 }, thickness: 2, color: fill });
    addMarkupAnnotation(page, rect, "StrikeOut", [fill.red, fill.green, fill.blue]);
    return;
  }

  if (element.kind === "link") {
    page.drawText(element.text ?? element.url ?? "Link", { x: rect.x, y: rect.y + rect.height * 0.2, size: Number(element.fontSize ?? 10), color: rgb(0.08, 0.32, 0.8) });
    addUriLink(page, rect, element.url ?? element.text);
    return;
  }

  if (element.kind === "signature") {
    await drawText(pdfDoc, page, element, rect, { baseUrl });
    return;
  }

  if (element.kind === "image" && element.dataUrl) {
    const response = await fetch(element.dataUrl);
    const bytes = await response.arrayBuffer();
    const image = element.dataUrl.startsWith("data:image/png") ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
    page.drawImage(image, { x: rect.x, y: rect.y, width: rect.width, height: rect.height, rotate: degrees(Number(element.rotation ?? 0)) });
  }
}

export async function exportEditedPdf({ originalPdfBytes, elements = [], pageOrder, pageRotations = {}, addedPages = [], baseUrl = "" }) {
  const source = await PDFDocument.load(originalPdfBytes);
  const output = await PDFDocument.create();
  const order = pageOrder ?? source.getPages().map((_, index) => index);
  const sourcePages = source.getPages();

  for (let outputIndex = 0; outputIndex < order.length; outputIndex += 1) {
    const sourceIndex = order[outputIndex];
    let page;
    if (sourceIndex == null) {
      const spec = addedPages.find((item) => item.pageIndex === outputIndex + 1) ?? { width: 595.28, height: 841.89, rotation: 0 };
      page = output.addPage([spec.width, spec.height]);
    } else {
      [page] = await output.copyPages(source, [sourceIndex]);
      output.addPage(page);
    }

    const rotation = Number(pageRotations[outputIndex + 1] ?? 0);
    if (rotation) page.setRotation(degrees(rotation));
    const pageElements = elements.filter((element) => element.pageIndex === outputIndex + 1);
    for (const element of pageElements) await drawElement(output, page, element, baseUrl);
  }

  return output.save();
}
