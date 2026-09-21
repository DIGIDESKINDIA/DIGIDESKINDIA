import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docxPath = path.join(root, 'output/digital-118-v2.docx');
const outputPath = path.join(root, 'output/production-docx-media-inventory.json');

function imageSize(buffer, extension) {
  if (extension === 'png' && buffer.length >= 24 && buffer.toString('ascii', 0, 8) === '\x89PNG\r\n\x1a\n') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), format: 'png' };
  }
  if ((extension === 'jpg' || extension === 'jpeg') && buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    for (let index = 2; index + 9 < buffer.length;) {
      if (buffer[index] !== 0xff) { index += 1; continue; }
      const marker = buffer[index + 1];
      const length = buffer.readUInt16BE(index + 2);
      if (marker >= 0xc0 && marker <= 0xc3) return { height: buffer.readUInt16BE(index + 5), width: buffer.readUInt16BE(index + 7), format: 'jpeg' };
      index += 2 + length;
    }
  }
  return { width: null, height: null, format: extension };
}

const zip = await JSZip.loadAsync(fs.readFileSync(docxPath));
const relsXml = await zip.file('word/_rels/document.xml.rels').async('string');
const relationships = new Map();
for (const match of relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*>/g)) relationships.set(match[1], match[2].replace(/^\//, ''));
const documentXml = await zip.file('word/document.xml').async('string');
const drawingMatches = [...documentXml.matchAll(/<w:drawing[\s\S]*?<\/w:drawing>/g)];
const media = [];
for (let index = 0; index < drawingMatches.length; index += 1) {
  const xml = drawingMatches[index][0];
  const relationshipId = xml.match(/r:(?:embed|link)="([^"]+)"/)?.[1] ?? null;
  const target = relationshipId ? relationships.get(relationshipId) : null;
  const mediaPath = target?.startsWith('word/') ? target : target ? path.posix.join('word', target) : null;
  const file = mediaPath ? zip.file(mediaPath) : null;
  const bytes = file ? await file.async('nodebuffer') : null;
  const extension = mediaPath?.split('.').pop()?.toLowerCase() ?? 'unknown';
  const extent = xml.match(/<wp:extent[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
  media.push({
    documentOrder: index + 1,
    relationshipId,
    mediaPath,
    byteLength: bytes?.length ?? 0,
    image: bytes ? imageSize(bytes, extension) : null,
    docxExtentEmu: extent ? { cx: Number(extent[1]), cy: Number(extent[2]) } : null,
    placement: xml.includes('<wp:inline') ? 'inline' : xml.includes('<wp:anchor') ? 'floating' : 'unknown',
    wordPage: null,
    wordRangeStart: null,
    wordRangeEnd: null,
    wordWidth: null,
    wordHeight: null,
  });
}

fs.writeFileSync(outputPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  productionDocx: 'output/digital-118-v2.docx',
  mediaPartCount: Object.keys(zip.files).filter((name) => name.startsWith('word/media/')).length,
  drawingCount: media.length,
  wordPageCount: null,
  wordInlineShapeCount: null,
  status: 'PENDING_WORD_ENRICHMENT',
  media,
}, null, 2));
console.log(JSON.stringify({ outputPath, mediaPartCount: Object.keys(zip.files).filter((name) => name.startsWith('word/media/')).length, drawingCount: media.length }, null, 2));