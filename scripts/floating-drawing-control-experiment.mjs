import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'output/digital-118-v2.docx');
const variantDir = path.join(root, 'output/floating-drawing-variants');
const diagnosticPath = path.join(root, 'output/floating-drawing-diagnostic.json');
const experimentPath = path.join(root, 'output/floating-drawing-control-experiment.json');
fs.mkdirSync(variantDir, { recursive: true });

function attr(xml, name) { return xml.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null; }
function extent(anchor) {
  const match = anchor.match(/<wp:extent[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
  return match ? { cx: Number(match[1]), cy: Number(match[2]), widthInches: Number(match[1]) / 914400, heightInches: Number(match[2]) / 914400 } : null;
}
function relTarget(xml, rels) {
  const id = xml.match(/r:(?:embed|link)="([^"]+)"/)?.[1];
  return id ? { relationshipId: id, target: rels.get(id) ?? null } : { relationshipId: null, target: null };
}
function wrapMode(anchor) {
  const match = anchor.match(/<wp:(wrap\w+)(?:\s[^>]*)?\/>/);
  return match?.[1] ?? (anchor.match(/<wp:(wrap\w+)/)?.[1] ?? 'none');
}
function transformAnchor(anchor, mode) {
  if (mode === 'inline') {
    return anchor
      .replace(/<wp:anchor\b[^>]*>/, '<wp:inline distT="0" distB="0" distL="0" distR="0">')
      .replace('</wp:anchor>', '</wp:inline>')
      .replace(/<wp:(simplePos|positionH|positionV|wrap[^>]*|effectExtent|extentLst)[\s\S]*?<\/wp:\1>/g, '')
      .replace(/<wp:(simplePos|positionH|positionV|wrap\w+|effectExtent|extentLst)[^>]*\/>/g, '');
  }
  if (mode === 'simple') {
    return anchor
      .replace(/\s+(relativeHeight|behindDoc|locked|layoutInCell|allowOverlap|simplePos|distT|distB|distL|distR)="[^"]*"/g, '')
      .replace(/<wp:wrap\w+[^>]*\/>/g, '<wp:wrapNone/>')
      .replace(/<wp:wrap\w+[^>]*>[\s\S]*?<\/wp:wrap\w+>/g, '<wp:wrapNone/>');
  }
  return anchor;
}

const sourceZip = await JSZip.loadAsync(fs.readFileSync(sourcePath));
const documentXml = await sourceZip.file('word/document.xml').async('string');
const relsXml = await sourceZip.file('word/_rels/document.xml.rels').async('string');
const rels = new Map([...relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*>/g)].map((match) => [match[1], match[2].replace(/^\//, '')]));
const anchors = [...documentXml.matchAll(/<wp:anchor[\s\S]*?<\/wp:anchor>/g)].map((match, index) => {
  const xml = match[0];
  const target = relTarget(xml, rels);
  const drawingStart = match.index ?? 0;
  return {
    drawingIndex: index + 1,
    sourceDocumentOrder: drawingStart,
    mediaTarget: target.target,
    relationshipId: target.relationshipId,
    extent: extent(xml),
    anchorAttributes: Object.fromEntries(['relativeHeight', 'behindDoc', 'allowOverlap', 'layoutInCell', 'locked', 'simplePos', 'distT', 'distB', 'distL', 'distR'].map((name) => [name, attr(xml, name)])),
    positionH: xml.match(/<wp:positionH[\s\S]*?<\/wp:positionH>/)?.[0] ?? null,
    positionV: xml.match(/<wp:positionV[\s\S]*?<\/wp:positionV>/)?.[0] ?? null,
    wrapMode: wrapMode(xml),
    classification: xml.includes('digital-bg') ? 'page-background image' : (extent(xml)?.widthInches >= 6 && extent(xml)?.heightInches >= 8 ? 'page-background image' : 'figure'),
  };
});

const baseDocument = documentXml;
const variants = [
  { id: 'A', name: 'current-document-unchanged', transform: (xml) => xml },
  { id: 'B', name: 'floating-to-inline-only', transform: (xml) => xml.replace(/<wp:anchor[\s\S]*?<\/wp:anchor>/g, (anchor) => transformAnchor(anchor, 'inline')) },
  { id: 'C', name: 'remove-floating-drawings-only', transform: (xml) => xml.replace(/<w:drawing>[\s\S]*?<wp:anchor[\s\S]*?<\/wp:anchor>[\s\S]*?<\/w:drawing>/g, '') },
  { id: 'D', name: 'simple-wrap-none-anchors', transform: (xml) => xml.replace(/<wp:anchor[\s\S]*?<\/wp:anchor>/g, (anchor) => transformAnchor(anchor, 'simple')) },
  { id: 'E', name: 'page-sized-floating-images-to-inline', transform: (xml) => xml.replace(/<wp:anchor[\s\S]*?<\/wp:anchor>/g, (anchor) => {
    const size = extent(anchor);
    return size && size.widthInches >= 6 && size.heightInches >= 8 ? transformAnchor(anchor, 'inline') : anchor;
  }) },
];

const results = [];
for (const variant of variants) {
  const zip = await JSZip.loadAsync(fs.readFileSync(sourcePath));
  zip.file('word/document.xml', variant.transform(baseDocument));
  const outputPath = path.join(variantDir, `variant-${variant.id}.docx`);
  fs.writeFileSync(outputPath, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  const transformed = variant.transform(baseDocument);
  results.push({
    variant: variant.id,
    name: variant.name,
    file: path.relative(root, outputPath),
    byteLength: fs.statSync(outputPath).size,
    tableCount: (transformed.match(/<w:tbl\b/g) || []).length,
    drawingCount: (transformed.match(/<w:drawing\b/g) || []).length,
    inlineDrawingCount: (transformed.match(/<wp:inline\b/g) || []).length,
    floatingDrawingCount: (transformed.match(/<wp:anchor\b/g) || []).length,
    wordPages: null,
    libreOfficePages: null,
  });
}

fs.writeFileSync(diagnosticPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  productionDocx: 'output/digital-118-v2.docx',
  floatingDrawingCount: anchors.length,
  drawingsTotal: (documentXml.match(/<w:drawing\b/g) || []).length,
  floatingDrawings: anchors,
  classificationCounts: Object.fromEntries([...new Set(anchors.map((item) => item.classification))].map((name) => [name, anchors.filter((item) => item.classification === name).length])),
}, null, 2));
fs.writeFileSync(experimentPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  sourceDocx: 'output/digital-118-v2.docx',
  variants: results,
  constraints: ['temporary variants only', 'production converter unchanged', '42-table count required', 'no OCR added'],
}, null, 2));
console.log(JSON.stringify({ diagnosticPath, experimentPath, floatingDrawingCount: anchors.length, variants: results }, null, 2));