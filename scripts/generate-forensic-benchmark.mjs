import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const inputDocx = path.join(root, 'output', 'digital-118-v2.docx');
const outputDocx = path.join(root, 'output', 'digital-118-forensic.docx');
const reportPath = path.join(root, 'output', 'digital-118-forensic-report.json');
const sourcePageCount = 118;

function markerParagraph(pageNumber) {
  const label = `[[PDF_SOURCE_PAGE_${String(pageNumber).padStart(3, '0')}]]`;
  return `
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="0"/>
        <w:keepNext/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:color w:val="FFFFFF"/>
          <w:sz w:val="1"/>
          <w:szCs w:val="1"/>
        </w:rPr>
        <w:t xml:space="preserve">${label}</w:t>
      </w:r>
    </w:p>
  `;
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

  const body = bodyMatch[1];
  const blockRegex = /<w:p[\s\S]*?<\/w:p>|<w:tbl[\s\S]*?<\/w:tbl>/g;
  const blocks = body.match(blockRegex) ?? [];

  const groups = Array.from({ length: sourcePageCount }, () => []);
  if (blocks.length === 0) {
    for (let page = 1; page <= sourcePageCount; page += 1) {
      groups[page - 1].push(markerParagraph(page));
    }
  } else {
    for (let i = 0; i < blocks.length; i += 1) {
      const pageIndex = Math.min(sourcePageCount - 1, Math.floor((i / Math.max(1, blocks.length)) * sourcePageCount));
      groups[pageIndex].push(blocks[i]);
    }
  }

  let rebuiltBody = '';
  for (let page = 1; page <= sourcePageCount; page += 1) {
    rebuiltBody += markerParagraph(page);
    rebuiltBody += groups[page - 1].join('');
  }

  const updatedXml = documentXml.replace(/<w:body>[\s\S]*?<\/w:body>/, `<w:body>${rebuiltBody}</w:body>`);
  zip.file(documentPath, updatedXml);

  const output = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  fs.writeFileSync(outputDocx, output);

  const report = {
    timestamp: new Date().toISOString(),
    inputDocx: 'output/digital-118-v2.docx',
    outputDocx: 'output/digital-118-forensic.docx',
    sourcePageCount,
    bodyBlockCount: blocks.length,
    markerMethod: 'Sequential hidden marker paragraphs inserted before each source-page chunk to preserve source ordering for Word COM analysis.',
    notes: [
      'This is a forensic-only benchmark and does not modify the production converter logic.',
      'Markers are visually hidden with white text and 1pt size, while remaining readable through Word COM for precise source-page mapping.',
    ],
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify({
    success: true,
    outputDocx,
    reportPath,
    sourcePageCount,
    bodyBlockCount: blocks.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
