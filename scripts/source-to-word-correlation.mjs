import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePdfPath = path.join(root, 'storage/fixtures/ViewDocument_current.rendered.pdf');
const docxPath = path.join(root, 'output/digital-118-v2.docx');
const outputPath = path.join(root, 'output/source-to-word-correlation.json');

function normalize(value) {
  return value
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function xmlText(xml) {
  return xml
    .replace(/<w:tab\s*\/>/g, ' ')
    .replace(/<w:br[^>]*\/>/g, ' ')
    .replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function phrases(text) {
  const words = normalize(text).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  const lengths = [14, 10, 7, 4];
  return lengths
    .filter((length) => words.length >= length)
    .map((length) => words.slice(0, length).join(' '));
}

function firstUniquePhrase(pageText, allPageTexts) {
  for (const phrase of phrases(pageText)) {
    const occurrences = allPageTexts.reduce((count, candidate) => count + (normalize(candidate).includes(phrase) ? 1 : 0), 0);
    if (occurrences === 1) return phrase;
  }
  return phrases(pageText)[0] ?? '';
}

function lastUniquePhrase(pageText, allPageTexts) {
  const words = normalize(pageText).split(' ').filter(Boolean);
  for (const length of [14, 10, 7, 4]) {
    if (words.length < length) continue;
    const phrase = words.slice(-length).join(' ');
    const occurrences = allPageTexts.reduce((count, candidate) => count + (normalize(candidate).includes(phrase) ? 1 : 0), 0);
    if (occurrences === 1) return phrase;
  }
  return words.slice(-Math.min(7, words.length)).join(' ');
}

const pdf = await getDocument({ data: new Uint8Array(fs.readFileSync(sourcePdfPath)) }).promise;
const sourcePages = [];
for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  const text = content.items.filter((item) => typeof item.str === 'string').map((item) => item.str).join(' ');
  const operatorList = await page.getOperatorList();
  const imageOps = operatorList.fnArray.filter((operator) => [OPS.paintImageMaskXObject, OPS.paintImageXObject, OPS.paintInlineImageXObject].includes(operator)).length;
  sourcePages.push({
    sourcePage: pageNumber,
    nativeText: text,
    normalizedText: normalize(text),
    sourceImageOperations: imageOps,
    sourcePageType: normalize(text).length === 0 ? (imageOps > 0 ? 'image-only' : 'empty') : imageOps > 0 ? 'text-and-image' : 'text-only',
  });
}

const zip = await JSZip.loadAsync(fs.readFileSync(docxPath));
const documentXml = await zip.file('word/document.xml').async('string');
const body = documentXml.match(/<w:body>([\s\S]*?)<\/w:body>/)?.[1] ?? '';
const blocks = body.match(/<w:p[\s\S]*?<\/w:p>|<w:tbl[\s\S]*?<\/w:tbl>/g) ?? [];
const docxBlocks = blocks.map((xml, index) => ({
  blockIndex: index,
  elementType: xml.startsWith('<w:tbl') ? 'table' : 'paragraph',
  text: xmlText(xml),
  normalizedText: normalize(xmlText(xml)),
  imageCount: (xml.match(/<w:drawing\b/g) || []).length,
}));
const docxText = docxBlocks.map((block) => block.text).join(' ');
const normalizedDocxText = normalize(docxText);
const allPageTexts = sourcePages.map((page) => page.nativeText);
let searchCursor = 0;

const correlations = sourcePages.map((page) => {
  const sourceTextStart = firstUniquePhrase(page.nativeText, allPageTexts);
  const sourceTextEnd = lastUniquePhrase(page.nativeText, allPageTexts);
  const startPosition = sourceTextStart ? normalizedDocxText.indexOf(sourceTextStart, searchCursor) : -1;
  const endPosition = sourceTextEnd && startPosition >= 0
    ? normalizedDocxText.indexOf(sourceTextEnd, startPosition + sourceTextStart.length)
    : -1;
  const matched = startPosition >= 0;
  if (matched) searchCursor = Math.max(searchCursor, endPosition >= 0 ? endPosition + sourceTextEnd.length : startPosition + sourceTextStart.length);
  const block = matched
    ? docxBlocks.find((candidate) => normalizedDocxText.indexOf(candidate.normalizedText) <= startPosition && startPosition <= normalizedDocxText.indexOf(candidate.normalizedText) + candidate.normalizedText.length)
    : null;
  const textLength = page.normalizedText.length;
  return {
    sourcePage: page.sourcePage,
    sourceTextStart,
    sourceTextEnd,
    totalNormalizedCharacters: textLength,
    docxNormalizedStart: startPosition,
    docxNormalizedEnd: endPosition,
    matchedBlockIndex: block?.blockIndex ?? null,
    matchedElementType: block?.elementType ?? null,
    imageCountHint: block?.imageCount ?? 0,
    sourceImageOperations: page.sourceImageOperations,
    sourcePageType: page.sourcePageType,
    matchMethod: matched ? 'sequential-normalized-phrase-match' : textLength === 0 ? 'neighbor-inference-required' : 'uncorrelated',
    confidence: matched ? (sourceTextStart.length >= 70 && sourceTextEnd.length >= 70 ? 0.95 : 0.78) : textLength === 0 ? 0.2 : 0.1,
    wordPageStart: null,
    wordPageEnd: null,
    wordRangeStart: null,
    wordRangeEnd: null,
    matchedStartPhrase: null,
    matchedEndPhrase: null,
    relationship: null,
    candidateWordPages: [],
    correlationStatus: matched ? 'pending-word-range-enrichment' : textLength === 0 ? 'image-or-empty-needs-neighbor-analysis' : 'uncorrelated',
  };
});

const report = {
  timestamp: new Date().toISOString(),
  sourcePdf: 'storage/fixtures/ViewDocument_current.rendered.pdf',
  productionDocx: 'output/digital-118-v2.docx',
  sourcePageCount: pdf.numPages,
  docxBlockCount: docxBlocks.length,
  docxImageCount: docxBlocks.reduce((sum, block) => sum + block.imageCount, 0),
  wordPageCount: null,
  wordTables: null,
  wordInlineShapes: null,
  wordParagraphs: null,
  summary: null,
  finalStatus: 'PENDING_WORD_RANGE_ENRICHMENT',
  sourcePages: correlations,
  method: 'Read-only source text correlation. Word page numbers are added by enrich-source-to-word-correlation.ps1 using Word Range.Information(3).',
  constraints: ['No bookmarks', 'No markers', 'No paragraphs', 'No content controls', 'No page breaks', 'No production DOCX changes'],
};
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outputPath, sourcePageCount: pdf.numPages, docxBlockCount: docxBlocks.length, matchedPages: correlations.filter((page) => page.docxNormalizedStart >= 0).length }, null, 2));