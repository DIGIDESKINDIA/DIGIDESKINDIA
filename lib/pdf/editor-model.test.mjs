import test from "node:test";
import assert from "node:assert/strict";

import {
  createTextElement,
  editedFilename,
  findComposedTextMatches,
  findTextMatches,
  getEditorDomRect,
  getTextLayoutWidth,
  hitTestText,
  pdfRectToEditorRect,
  pdfToEditorPoint,
  resizeElement,
  replaceTextElement,
  replaceTextElementById,
  remapTextRuns,
  rotationFromPointer,
  sanitizeFilename,
  shouldRenderTextElement,
  shouldShowSelectionHandles,
  splitPdfTextItemIntoWordBoxes,
} from "./editor-model.mjs";
import { getTextReplacementRegion } from "./pdf-export.mjs";

test("sanitizeFilename strips unsafe characters", () => {
  assert.equal(sanitizeFilename("../../report final.pdf"), "report-final.pdf");
  assert.equal(sanitizeFilename("file name?.pdf"), "file-name.pdf");
});

test("editedFilename creates a safe deterministic download name", () => {
  assert.equal(editedFilename("../../evil.pdf"), "evil-edited.pdf");
  assert.equal(editedFilename("document....pdf"), "document-edited.pdf");
  assert.equal(editedFilename("already-edited.pdf"), "already-edited.pdf");
});

test("createTextElement retains normalized values", () => {
  const text = createTextElement({
    id: "t-1",
    pageIndex: 2,
    originalText: "Hello",
    currentText: "Hello",
    x: 12,
    y: 24,
    width: 44,
    height: 10,
    fontSize: 18,
    color: "#111827",
  });

  assert.equal(text.pageIndex, 2);
  assert.equal(text.currentText, "Hello");
  assert.equal(text.fontFamily, "Helvetica");
  assert.equal(text.fontSize, 18);
  assert.equal(text.color, "#111827");
});

test("findTextMatches finds text across pages", () => {
  const matches = findTextMatches(
    [
      createTextElement({
        id: "a",
        pageIndex: 1,
        originalText: "Quarterly report",
        currentText: "Quarterly report",
        x: 10,
        y: 10,
        width: 100,
        height: 10,
        fontSize: 12,
        color: "#111827",
      }),
      createTextElement({
        id: "b",
        pageIndex: 2,
        originalText: "Quarterly update",
        currentText: "Quarterly update",
        x: 10,
        y: 10,
        width: 100,
        height: 10,
        fontSize: 12,
        color: "#111827",
      }),
    ],
    "quarterly"
  );

  assert.equal(matches.length, 2);
  assert.equal(matches[0].pageIndex, 1);
  assert.equal(matches[1].pageIndex, 2);
});

test("replaceTextElement updates content and preserves metadata", () => {
  const original = createTextElement({
    id: "a",
    pageIndex: 1,
    originalText: "Hello",
    currentText: "Hello",
    x: 12,
    y: 16,
    width: 30,
    height: 10,
    fontSize: 18,
    color: "#111827",
    source: "user",
  });

  const updated = replaceTextElement(original, "Hello world");

  assert.equal(updated.currentText, "Hello world");
  assert.equal(updated.originalText, "Hello");
  assert.equal(updated.width > original.width, true);
  assert.equal(updated.edited, true);
});

test("changing extracted text content does not reset source formatting metadata", () => {
  const element = createTextElement({
    id: "project",
    pageIndex: 1,
    source: "extracted",
    originalText: "PROJECT",
    currentText: "PROJECT",
    changed: false,
    fontName: "Helvetica-Bold",
    sourceFontName: "Helvetica-Bold",
    fontFamily: "Helvetica",
    fontSize: 24,
    fontWeight: "bold",
    italic: false,
    color: "#111111",
    sourceStyle: {
      sourceFontName: "Helvetica-Bold",
      fontName: "Helvetica-Bold",
      fontFamily: "Helvetica",
      fontSize: 24,
      fontWeight: "bold",
      italic: false,
      color: "#111111",
    },
  });

  const updated = replaceTextElement(element, "PROJEM");

  assert.equal(updated.currentText, "PROJEM");
  assert.equal(updated.sourceFontName, "Helvetica-Bold");
  assert.equal(updated.sourceStyle.sourceFontName, "Helvetica-Bold");
  assert.equal(updated.sourceStyle.fontName, "Helvetica-Bold");
  assert.equal(updated.sourceStyle.fontFamily, "Helvetica");
  assert.equal(updated.sourceStyle.fontSize, 24);
  assert.equal(updated.sourceStyle.fontWeight, "bold");
  assert.equal(updated.sourceStyle.italic, false);
  assert.equal(updated.sourceStyle.color, "#111111");
});

test("replaceTextElement preserves the active bold state after editing", () => {
  const element = {
    ...createTextElement({
      id: "bold-text",
      source: "extracted",
      originalText: "Bold",
      currentText: "Bold",
      fontWeight: "bold",
      sourceStyle: { fontWeight: "bold" },
    }),
    initialFontWeight: "bold",
    isBold: true,
  };

  const updated = replaceTextElement(element, "Still bold");

  assert.equal(updated.fontWeight, "bold");
  assert.equal(updated.initialFontWeight, "bold");
  assert.equal(updated.isBold, true);
  assert.equal(updated.sourceStyle.fontWeight, "bold");
});

test("replaceTextElement preserves bold and underline formatting", () => {
  const element = createTextElement({
    id: "heading",
    originalText: "1.44: Pre-Project Appraisal:",
    currentText: "1.44: Pre-Project Appraisal:",
    fontWeight: "bold",
    italic: false,
    textRuns: [{ text: "1.44: Pre-Project Appraisal:", bold: true, italic: false, underline: true }],
  });

  const updated = replaceTextElement(element, "1.44: Pre Project Appraaty");

  assert.equal(updated.textRuns.map((run) => run.text).join(""), "1.44: Pre Project Appraaty");
  assert.ok(updated.textRuns.every((run) => run.bold && run.underline));
});

test("remapTextRuns preserves mixed formatting when replacing one range", () => {
  const runs = [
    { text: "ABC ", bold: false, italic: false },
    { text: "DEF", bold: true, italic: false },
    { text: " GHI", bold: false, italic: false, underline: true },
  ];
  const updated = remapTextRuns("ABC DEF GHI", "ABC XYZ GHI", runs);

  assert.deepEqual(updated, [
    { text: "ABC ", bold: false, italic: false },
    { text: "XYZ", bold: true, italic: false },
    { text: " GHI", bold: false, italic: false, underline: true },
  ]);
});

test("remapTextRuns retains style boundaries when replacement length changes", () => {
  const updated = remapTextRuns("Normal BOLD Underline", "Normal replacement Underline", [
    { text: "Normal ", bold: false, italic: false },
    { text: "BOLD", bold: true, italic: false },
    { text: " ", bold: false, italic: false },
    { text: "Underline", bold: false, italic: false, underline: true },
  ]);

  assert.equal(updated.map((run) => run.text).join(""), "Normal replacement Underline");
  assert.equal(updated.find((run) => run.text.includes("repl"))?.bold, true);
  assert.equal(updated.find((run) => run.text.includes("Underline"))?.underline, true);
});

test("repeated replacements remap against the current styled text", () => {
  const first = replaceTextElement(createTextElement({
    originalText: "Bold heading",
    currentText: "Bold heading",
    textRuns: [{ text: "Bold heading", bold: true, italic: false, underline: true }],
  }), "Changed heading");
  const second = replaceTextElement(first, "Final heading");

  assert.equal(second.textRuns.map((run) => run.text).join(""), "Final heading");
  assert.ok(second.textRuns.every((run) => run.bold && run.underline));
});

test("uppercase normal text remains normal after replacement", () => {
  const element = createTextElement({
    originalText: "TH-GAUTAM BUDDH",
    currentText: "TH-GAUTAM BUDDH",
    fontWeight: "normal",
    isBold: false,
    initialFontWeight: "normal",
    textRuns: [{ text: "TH-GAUTAM BUDDH", bold: false, italic: false }],
  });
  const updated = replaceTextElement(element, "TH GAUTAM BUDDH");

  assert.equal(updated.textRuns.map((run) => run.text).join(""), "TH GAUTAM BUDDH");
  assert.ok(updated.textRuns.every((run) => run.bold === false));
  assert.equal(updated.fontWeight, "normal");
});

test("editing FOR THE leaves every untouched sibling run unchanged", () => {
  const elements = [
    ["project", "PROJECT REPORT", true],
    ["for", "FOR THE", false],
    ["uniwest", "UNIWEST HUB", true],
    ["proposed", "PROPOSED COMMERCIAL", true],
    ["building", "BUILDING PROJECT", true],
  ].map(([id, text, bold]) => createTextElement({
    id,
    originalText: text,
    currentText: text,
    fontWeight: bold ? "bold" : "normal",
    textRuns: [{ text, bold, italic: false }],
  }));
  const untouchedBefore = elements.filter((element) => element.id !== "for").map((element) => ({ id: element.id, value: structuredClone(element) }));
  const updated = replaceTextElementById(elements, "for", "FOR TTE");

  assert.equal(updated.find((element) => element.id === "for")?.textRuns[0].bold, false);
  for (const snapshot of untouchedBefore) assert.deepEqual(updated.find((element) => element.id === snapshot.id), snapshot.value);
});

test("shouldRenderTextElement prevents duplicate extracted text overlays", () => {
  assert.equal(shouldRenderTextElement({ source: "extracted", originalText: "Hello", currentText: "Hello", changed: false }), false);
  assert.equal(shouldRenderTextElement({ source: "extracted", originalText: "Hello", currentText: "Hi", changed: true }), true);
  assert.equal(shouldRenderTextElement({ source: "user", text: "New text" }), true);
});

test("shouldShowSelectionHandles hides resize handles outside an active select or edit state", () => {
  assert.equal(shouldShowSelectionHandles({ tool: "text", selectedId: "item-1", editingTextId: null }), false);
  assert.equal(shouldShowSelectionHandles({ tool: "select", selectedId: "item-1", editingTextId: null }), true);
  assert.equal(shouldShowSelectionHandles({ tool: "text", selectedId: "item-1", editingTextId: "item-1" }), true);
  assert.equal(shouldShowSelectionHandles({ tool: "text", selectedId: "item-1", pendingPoint: true }), false);
});

test("pdfToEditorPoint converts PDF coordinates to editor coordinates", () => {
  const point = pdfToEditorPoint({ x: 120, y: 420 }, 600, 800);

  assert.ok(Math.abs(point.x - 20) < 0.001);
  assert.ok(Math.abs(point.y - 47.5) < 0.001);
});

test("pdfRectToEditorRect converts PDF rectangles to editor rectangles", () => {
  const rect = pdfRectToEditorRect({ x: 50, y: 100, width: 120, height: 20 }, 600, 800);

  assert.ok(Math.abs(rect.x - 8.3333333333) < 0.001);
  assert.ok(Math.abs(rect.y - 85) < 0.001);
  assert.ok(Math.abs(rect.width - 20) < 0.001);
  assert.ok(Math.abs(rect.height - 2.5) < 0.001);
});

test("getEditorDomRect maps a PDF-space text box to rendered page pixels", () => {
  const rect = getEditorDomRect({ x: 13.3333333333, y: 9.5, width: 25, height: 3 }, { left: 40, top: 80, width: 900, height: 1200 }, { width: 600, height: 800 });

  assert.ok(Math.abs(rect.left - 160) < 0.001);
  assert.ok(Math.abs(rect.top - 194) < 0.001);
  assert.ok(Math.abs(rect.width - 225) < 0.001);
  assert.ok(Math.abs(rect.height - 36) < 0.001);
});

test("getEditorDomRect rotates page-local geometry consistently", () => {
  const rect = getEditorDomRect({ x: 10, y: 20, width: 20, height: 10 }, { left: 0, top: 0, width: 800, height: 600 }, { width: 600, height: 800 }, 90);

  assert.ok(Math.abs(rect.left - 560) < 0.001);
  assert.ok(Math.abs(rect.top - 60) < 0.001);
  assert.ok(Math.abs(rect.width - 80) < 0.001);
  assert.ok(Math.abs(rect.height - 120) < 0.001);
});

test("hitTestText selects the best matching text object", () => {
  const elements = [
    createTextElement({
      id: "outside",
      pageIndex: 1,
      originalText: "Other text",
      currentText: "Other text",
      x: 30,
      y: 40,
      width: 20,
      height: 10,
      fontSize: 12,
      color: "#111827",
      pdfX: 180,
      pdfY: 320,
      pdfWidth: 120,
      pdfHeight: 12,
    }),
    createTextElement({
      id: "target",
      pageIndex: 1,
      originalText: "Hello world",
      currentText: "Hello world",
      x: 20,
      y: 50,
      width: 30,
      height: 8,
      fontSize: 12,
      color: "#111827",
      pdfX: 120,
      pdfY: 400,
      pdfWidth: 180,
      pdfHeight: 12,
    }),
  ];

  const hit = hitTestText(elements, 1, 22, 54);
  assert.equal(hit?.id, "target");
});

test("hitTestText supports a small hover tolerance without selecting distant text", () => {
  const elements = [
    createTextElement({ id: "report", pageIndex: 1, originalText: "PROJECT REPORT", currentText: "PROJECT REPORT", x: 20, y: 20, width: 24, height: 5 }),
    createTextElement({ id: "for", pageIndex: 1, originalText: "FOR THE", currentText: "FOR THE", x: 20, y: 29, width: 14, height: 5 }),
  ];

  assert.equal(hitTestText(elements, 1, 19, 22, 2)?.id, "report");
  assert.equal(hitTestText(elements, 1, 20, 29.5, 2)?.id, "for");
  assert.equal(hitTestText(elements, 1, 20, 37, 2), null);
});

test("hitTestText inverse-rotates viewport coordinates before testing page text", () => {
  const elements = [
    createTextElement({ id: "gautam", pageIndex: 1, originalText: "GAUTAM", currentText: "GAUTAM", x: 20, y: 30, width: 20, height: 8 }),
  ];

  assert.equal(hitTestText(elements, 1, 70, 20, 0, 90)?.id, "gautam");
});

test("splitPdfTextItemIntoWordBoxes separates words within one PDF.js item", () => {
  const boxes = splitPdfTextItemIntoWordBoxes({
    str: "TH-GAUTAM BUDDH",
    width: 150,
    height: 12,
    transform: [1, 0, 0, 1, 100, 500],
  });

  assert.deepEqual(boxes.map((box) => box.text), ["TH", "GAUTAM", "BUDDH"]);
  assert.ok(boxes[1].x > boxes[0].x + boxes[0].width);
  assert.ok(boxes[2].x > boxes[1].x + boxes[1].width);
});

test("splitPdfTextItemIntoWordBoxes preserves multiline and rotated geometry", () => {
  const boxes = splitPdfTextItemIntoWordBoxes({
    str: "GAUTAM\nBUDDH",
    width: 60,
    height: 10,
    transform: [0, 1, -1, 0, 200, 300],
  });

  assert.deepEqual(boxes.map((box) => box.text), ["GAUTAM", "BUDDH"]);
  assert.ok(boxes[0].height > boxes[0].width);
  assert.notEqual(boxes[0].x, boxes[1].x);
});

test("getTextReplacementRegion stays on the original PDF text bounds", () => {
  const region = getTextReplacementRegion({
    pdfX: 80,
    pdfY: 700,
    pdfWidth: 120,
    pdfHeight: 18,
    originalText: "Hello",
    currentText: "Hello DigiDesk",
  });

  assert.ok(region.x >= 79);
  assert.ok(region.y >= 681);
  assert.ok(region.x + region.width <= 202);
  assert.ok(region.y + region.height <= 701);
});

test("replaceTextElement keeps extracted line geometry fixed", () => {
  const element = createTextElement({
    source: "extracted",
    originalText: "Agricultural Lands",
    currentText: "Agricultural Lands",
    width: 24,
    height: 5,
  });
  const replaced = replaceTextElement(element, "Agricultural Lands with surrounding area");

  assert.equal(replaced.width, 24);
});

test("text layout width can exceed the original extracted run width", () => {
  const element = createTextElement({
    source: "extracted",
    originalText: "ABC DEF",
    currentText: "ABC DEF",
    pdfWidth: 300,
    pdfLineWidth: 500,
  });

  assert.equal(getTextLayoutWidth(element), 500);
  assert.equal(getTextLayoutWidth(replaceTextElement(element, "ABC DEF XYZ")), 500);
});

test("text layout width falls back to the original PDF run width", () => {
  assert.equal(getTextLayoutWidth({ pdfWidth: 300 }), 300);
});

test("resizeElement changes the selected edge without stretching coordinates unexpectedly", () => {
  const element = { id: "image", x: 10, y: 20, width: 20, height: 10, kind: "image" };
  const resized = resizeElement(element, "bottom-right", 5, 4, { preserveAspect: true });

  assert.equal(resized.x, 10);
  assert.equal(resized.y, 20);
  assert.equal(resized.width, 25);
  assert.equal(resized.height, 12.5);
});

test("rotationFromPointer snaps near common angles", () => {
  assert.equal(rotationFromPointer({ x: 0, y: 0 }, { x: 0, y: -10 }), 0);
  assert.equal(rotationFromPointer({ x: 0, y: 0 }, { x: 10, y: 0 }), 90);
});

test("findComposedTextMatches finds a phrase split across adjacent text objects", () => {
  const matches = findComposedTextMatches([
    createTextElement({ id: "hello", pageIndex: 1, originalText: "Hello", currentText: "Hello", x: 10, y: 10, width: 10, height: 4 }),
    createTextElement({ id: "world", pageIndex: 1, originalText: "World", currentText: "World", x: 21, y: 10, width: 10, height: 4 }),
  ], "hello world");

  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0].objectIds, ["hello", "world"]);
});
