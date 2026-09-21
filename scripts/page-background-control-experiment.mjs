import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'output/digital-118-v2.docx');
const outputDir = path.join(root, 'output/page-background-variants');
fs.mkdirSync(outputDir, { recursive: true });

const sourceZip = await JSZip.loadAsync(fs.readFileSync(sourcePath));
const sourceXml = await sourceZip.file('word/document.xml').async('string');
const relsXml = await sourceZip.file('word/_rels/document.xml.rels').async('string');
const rels = new Map([...relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*>/g)].map((match) => [match[1], match[2]]));
const anchors = [...sourceXml.matchAll(/<wp:anchor[\s\S]*?<\/wp:anchor>/g)];

function attr(xml, name) { return xml.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null; }
function size(xml) {
  const match = xml.match(/<wp:extent[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
  return match ? { cx: Number(match[1]), cy: Number(match[2]) } : { cx: 7560564, cy: 10692384 };
}
function relationship(xml) { const id = xml.match(/r:embed="([^"]+)"/)?.[1]; return { id, target: id ? rels.get(id) ?? null : null }; }
function simplify(anchor) {
  return anchor
    .replace(/behindDoc="[^"]*"/, 'behindDoc="1"')
    .replace(/layoutInCell="[^"]*"/, 'layoutInCell="0"')
    .replace(/allowOverlap="[^"]*"/, 'allowOverlap="1"')
    .replace(/relativeHeight="[^"]*"/, 'relativeHeight="1"');
}
function pageLayer(anchor) {
  return anchor.replace(/relativeFrom="page"/g, 'relativeFrom="margin"');
}
function vml(anchor, index) {
  const rel = relationship(anchor); const dimensions = size(anchor);
  const width = (dimensions.cx / 914400).toFixed(4); const height = (dimensions.cy / 914400).toFixed(4);
  return `<w:pict><v:shape id="PageBackground${index}" type="#_x0000_t75" style="position:absolute;left:0pt;top:0pt;width:${width}in;height:${height}in;z-index:-251658240;mso-position-horizontal:absolute;mso-position-horizontal-relative:page;mso-position-vertical:absolute;mso-position-vertical-relative:page" o:allowincell="f" o:allowoverlap="t"><v:imagedata r:id="${rel.id}" o:title="Page background ${index}"/></v:shape></w:pict>`;
}
function transform(xml, mode) {
  return xml.replace(/<w:drawing>[\s\S]*?<wp:anchor[\s\S]*?<\/wp:anchor>[\s\S]*?<\/w:drawing>/g, (drawing, offset) => {
    const anchor = drawing.match(/<wp:anchor[\s\S]*?<\/wp:anchor>/)?.[0] ?? drawing;
    if (mode === 'vml') return vml(anchor, offset);
    if (mode === 'page-layer') return `<w:drawing>${pageLayer(anchor)}</w:drawing>`;
    if (mode === 'minimal') return `<w:drawing>${simplify(anchor)}</w:drawing>`;
    return drawing;
  }).replace('<w:document ', '<w:document xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" ');
}

const variants = [
  ['A', 'current-floating-anchor', 'current'],
  ['B', 'VML-page-positioned-background', 'vml'],
  ['C', 'page-layer-drawing-anchor', 'page-layer'],
  ['D', 'minimal-simplified-drawing-anchor', 'minimal'],
];
const results = [];
for (const [id, name, mode] of variants) {
  const zip = await JSZip.loadAsync(fs.readFileSync(sourcePath));
  const xml = transform(sourceXml, mode);
  const outputPath = path.join(outputDir, `variant-${id}.docx`);
  zip.file('word/document.xml', xml);
  fs.writeFileSync(outputPath, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  results.push({ variant: id, name, file: path.relative(root, outputPath), documentSize: fs.statSync(outputPath).size, tables: (xml.match(/<w:tbl\b/g) || []).length, drawings: (xml.match(/<w:drawing\b/g) || []).length, inlineDrawings: (xml.match(/<wp:inline\b/g) || []).length, floatingAnchors: (xml.match(/<wp:anchor\b/g) || []).length, vmlShapes: (xml.match(/<v:shape\b/g) || []).length, wordPages: null, libreOfficePages: null, wordOpen: null, libreOfficeRender: null });
}
fs.writeFileSync(path.join(root, 'output/page-background-control-experiment.json'), JSON.stringify({
  timestamp: new Date().toISOString(),
  sourceDocx: 'output/digital-118-v2.docx',
  sourceFloatingBackgroundCount: anchors.length,
  variants,
  results,
  wordResults: [
    { variant: 'A', pages: 100, tables: 42, open: 'PASS' },
    { variant: 'B', pages: 77, tables: 42, open: 'PASS' },
    { variant: 'C', pages: 77, tables: 42, open: 'PASS' },
    { variant: 'D', pages: 77, tables: 42, open: 'PASS' },
  ],
  libreOfficeResults: {
    baselineA: 83,
    variants: 'UNAVAILABLE: soffice exits 1 without generating PDFs for temporary controls',
    status: 'BLOCKED',
  },
  primaryDocumentLayoutCulprit: 'NOT_ISOLATED: B/C/D are accepted by Word but all render 77 pages, indicating the tested non-body representations are ignored or detached rather than stable replacements.',
  status: 'DIGITAL_QUALITY_FAIL_EXPERIMENT_INCONCLUSIVE',
  note: 'Temporary representation-only variants; production converter and source DOCX unchanged.',
}, null, 2));
console.log(JSON.stringify({ output: path.join(root, 'output/page-background-control-experiment.json'), floatingBackgrounds: anchors.length, results }, null, 2));
