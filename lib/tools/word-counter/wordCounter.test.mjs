import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("./wordCounter.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleRecord = { exports: {} };
new Function("exports", "module", compiled)(moduleRecord.exports, moduleRecord);
const { analyzeText, READING_WORDS_PER_MINUTE } = moduleRecord.exports;

test("returns zeros for empty and whitespace-only input", () => {
  assert.deepEqual(analyzeText(""), {
    words: 0, characters: 0, charactersNoSpaces: 0, sentences: 0, paragraphs: 0,
    readingTimeMinutes: 0, averageWordsPerSentence: 0, averageCharactersPerWord: 0,
  });
  assert.equal(analyzeText(" \t\n ").words, 0);
});

test("counts English text, spacing, tabs, paragraphs, and averages", () => {
  const result = analyzeText("Hello,   world!\nThis\tis a test.\n\nFinal line");
  assert.equal(result.words, 8);
  assert.equal(result.sentences, 3);
  assert.equal(result.paragraphs, 3);
  assert.equal(result.averageWordsPerSentence, 2.67);
  assert.equal(result.averageCharactersPerWord, 4.13);
});

test("handles Hindi, mixed-language input, numbers, and danda sentence endings", () => {
  const result = analyzeText("यह एक परीक्षण है। Hello 2026! मिश्रित text॥");
  assert.equal(result.words, 8);
  assert.equal(result.sentences, 3);
  assert.equal(result.paragraphs, 1);
});

test("does not turn punctuation into words or sentences", () => {
  const result = analyzeText("... !!! ??? ।॥");
  assert.equal(result.words, 0);
  assert.equal(result.sentences, 0);
  assert.equal(result.paragraphs, 0);
});

test("treats repeated punctuation as one sentence boundary and handles emoji", () => {
  const result = analyzeText("Amazing... Really!!! Yes??? \ud83d\ude00");
  assert.equal(result.words, 3);
  assert.equal(result.sentences, 3);
  assert.equal(result.characters, Array.from("Amazing... Really!!! Yes??? \ud83d\ude00").length);
});

test("calculates configurable reading time and stays stable with large text", () => {
  const text = Array.from({ length: READING_WORDS_PER_MINUTE + 1 }, () => "word").join(" ");
  const result = analyzeText(text);
  assert.equal(result.words, READING_WORDS_PER_MINUTE + 1);
  assert.equal(result.readingTimeMinutes, 2);
  assert.equal(analyzeText("word ".repeat(50_000)).words, 50_000);
});