import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const inputDocx = path.join(root, 'output', 'digital-118-v2.docx');
const outputDocx = path.join(root, 'output', 'digital-118-forensic-v2.docx');
const reportPath = path.join(root, 'output', 'digital-118-forensic-v2-report.json');
const sourcePageCount = 118;

function buildPageGroups(blocks, totalPages) {
  const groups = Array.from({ length: totalPages }, () => []);
  const count = Math.max(1, blocks.length);

  for (let i = 0; i < blocks.length; i += 1) {
    const pageIndex = Math.min(totalPages - 1, Math.floor((i / count) * totalPages));
    groups[pageIndex].push(blocks[i]);
  }

  return groups;
}

function addBookmarkInsideBlock(block, bookmarkName, bookmarkId) {
  const start = `<w:bookmarkStart w:id="${bookmarkId}" w:name="${bookmarkName}"/>`;
  const end = `<w:bookmarkEnd w:id="${bookmarkId}"/>`;
  const paragraphStart = block.indexOf('<w:p');
  const paragraphEnd = block.indexOf('</w:p>', paragraphStart);

  if (paragraphStart < 0 || paragraphEnd < 0) {
    return block;
  }

  const paragraphPropertiesEnd = block.indexOf('</w:pPr>', paragraphStart);
  const contentStart = paragraphPropertiesEnd >= 0
    ? paragraphPropertiesEnd + '</w:pPr>'.length
    : block.indexOf('>', paragraphStart) + 1;
  const contentEnd = paragraphEnd;

  return `${block.slice(0, contentStart)}${start}${block.slice(contentStart, contentEnd)}${end}${block.slice(contentEnd)}`;
}

async function main() {
  if (!fs.existsSync(inputDocx)) {
    throw new Error(`Input DOCX not found: ${inputDocx}`);
  }

  const buffer = fs.readFileSync(inputDocx);
  const zip = await JSZip.loadAsync(buffer);
  const documentPath = 'word/document.xml';
  const documentXml = await zip.file(documentPath)?.async('string');

  if (!documentXml) {
    throw new Error('word/document.xml not found in source DOCX');
  }

  const bodyMatch = documentXml.match(/<w:body>([\s\S]*?)<\/w:body>/);
  if (!bodyMatch) {
    throw new Error('Could not locate body in document.xml');
  }

  const blockRegex = /<w:p[\s\S]*?<\/w:p>|<w:tbl[\s\S]*?<\/w:tbl>/g;
  const blocks = bodyMatch[1].match(blockRegex) ?? [];

  if (blocks.length === 0) {
    throw new Error('No paragraph/table blocks found in source DOCX. Cannot attach zero-layout bookmarks.');
  }

  const groups = buildPageGroups(blocks, sourcePageCount);
  const firstBlockIndexByPage = new Map();

  for (let page = 0; page < sourcePageCount; page += 1) {
    const group = groups[page];
    if (group.length > 0) {
      firstBlockIndexByPage.set(page + 1, blocks.indexOf(group[0]));
    }
  }

  const rebuiltBlocks = [];
  const used = new Set();

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const pageNumber = Math.min(sourcePageCount, Math.floor((i / Math.max(1, blocks.length)) * sourcePageCount) + 1);
    const isFirstBlockForPage = firstBlockIndexByPage.get(pageNumber) === i && !used.has(pageNumber);

    if (isFirstBlockForPage) {
      const bookmarkName = `PDF_PAGE_${String(pageNumber).padStart(3, '0')}`;
      const bookmarkId = pageNumber;
      rebuiltBlocks.push(addBookmarkInsideBlock(block, bookmarkName, bookmarkId));
      used.add(pageNumber);
    } else {
      rebuiltBlocks.push(block);
    }
  }

  const rebuiltBody = rebuiltBlocks.join('');
  const updatedXml = documentXml.replace(/<w:body>[\s\S]*?<\/w:body>/, `<w:body>${rebuiltBody}</w:body>`);
  zip.file(documentPath, updatedXml);

  const output = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  fs.writeFileSync(outputDocx, output);

  const report = {
    timestamp: new Date().toISOString(),
    inputDocx: 'output/digital-118-v2.docx',
    outputDocx: 'output/digital-118-forensic-v2.docx',
    sourcePageCount,
    bodyBlockCount: blocks.length,
    bookmarkCount: Array.from(firstBlockIndexByPage.keys()).length,
    method: 'Forensic bookmarks inserted inside the first existing paragraph of each proportional document block without adding visible text, paragraphs, or page breaks.',
    notes: [
      'This forensic document adds only Word bookmark metadata and does not insert visible text, extra paragraphs, or artificial page breaks.',
      'The goal is to preserve the original document flow while enabling real source-page to Word-page mapping.',
    ],
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify({
    success: true,
    inputDocx,
    outputDocx,
    reportPath,
    sourcePageCount,
    bodyBlockCount: blocks.length,
    bookmarkCount: report.bookmarkCount,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
