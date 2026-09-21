import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeOcrLanguages,
  createOcrOutputName,
  shouldSkipOcrForPage,
} from "./ocr.ts";

test("normalizeOcrLanguages filters unsupported values and keeps order stable", () => {
  assert.deepEqual(normalizeOcrLanguages(["eng", "hin", "eng+hin", "fra", "eng"]), ["eng", "hin", "eng+hin"]);
});

test("createOcrOutputName appends OCR suffix while preserving basename", () => {
  assert.equal(createOcrOutputName("example.pdf"), "example-ocr.pdf");
  assert.equal(createOcrOutputName("report.PDF"), "report-ocr.pdf");
});

test("shouldSkipOcrForPage marks genuinely text-rich pages as already searchable", () => {
  assert.equal(shouldSkipOcrForPage({ textItems: 180, textCharacters: 1200, images: 0 }), true);
  assert.equal(shouldSkipOcrForPage({ textItems: 8, textCharacters: 40, images: 2 }), false);
});
