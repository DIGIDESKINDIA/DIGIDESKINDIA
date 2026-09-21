import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const execFileAsync = promisify(execFile);
const {
  getQpdfPath,
  OOXML_LIMITS,
} = await import('../lib/tools/metadata-remover/constants.ts');
const { PdfMetadataAnalyzer } = await import('../lib/tools/metadata-remover/analyzers/pdf.analyzer.ts');
const { OfficeMetadataAnalyzer } = await import('../lib/tools/metadata-remover/analyzers/office.analyzer.ts');
const { ImageMetadataAnalyzer } = await import('../lib/tools/metadata-remover/analyzers/image.analyzer.ts');
const { PdfMetadataRemover } = await import('../lib/tools/metadata-remover/removers/pdf.remover.ts');
const { OfficeMetadataRemover } = await import('../lib/tools/metadata-remover/removers/office.remover.ts');
const { ImageMetadataRemover } = await import('../lib/tools/metadata-remover/removers/image.remover.ts');
const { sanitizeFilename } = await import('../lib/tools/metadata-remover/validation.ts');
const { createJobDirectory, writeJobState, cleanupExpiredJobs } = await import('../lib/tools/metadata-remover/secure-store.ts');

const root = await mkdtemp(path.join(os.tmpdir(), 'digidesk-metadata-audit-'));
const fixtures = path.join(root, 'fixtures');
const outputs = path.join(root, 'outputs');
await mkdir(fixtures);
await mkdir(outputs);
const results = [];

function record(test, result, details = '') {
  results.push({ test, result, details });
  console.log(`${result === 'PASS' ? 'PASS' : 'FAIL'} | ${test}${details ? ` | ${details}` : ''}`);
}

function metadataKeys(analysis) {
  return analysis.items.map((item) => `${item.key}=${item.value}`);
}

function assertContains(analysis, key, expected) {
  assert.ok(analysis.items.some((item) => item.key.toLowerCase() === key.toLowerCase() && item.value.includes(expected)), `${key}=${expected} not detected; actual: ${metadataKeys(analysis).join(', ')}`);
}

async function makePdf() {
  const document = await PDFDocument.create();
  document.addPage([612, 792]);
  document.addPage([400, 500]);
  document.setAuthor('DigiDesk Test User');
  document.setCreator('DigiDesk Synthetic Creator');
  document.setProducer('DigiDesk Synthetic Producer');
  document.setTitle('DigiDesk Synthetic PDF');
  document.setSubject('Metadata Audit');
  document.setKeywords(['synthetic', 'audit']);
  document.setCreationDate(new Date('2020-01-02T03:04:05Z'));
  document.setModificationDate(new Date('2021-02-03T04:05:06Z'));
  return Buffer.from(await document.save());
}

function officeXml(kind) {
  const names = {
    docx: ['word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>DigiDesk document</w:t></w:r></w:p></w:body></w:document>'],
    xlsx: ['xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    pptx: ['ppt/presentation.xml', '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst/><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>'],
  };
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
  zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>');
  zip.file('docProps/core.xml', '<?xml version="1.0"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><dc:creator>DigiDesk Test User</dc:creator><cp:lastModifiedBy>DigiDesk Editor</cp:lastModifiedBy><dc:title>Synthetic Office File</dc:title><dc:subject>Metadata Audit</dc:subject><cp:keywords>synthetic,audit</cp:keywords><dc:description>Known description</dc:description><dcterms:created>2020-01-02T03:04:05Z</dcterms:created><dcterms:modified>2021-02-03T04:05:06Z</dcterms:modified></cp:coreProperties>');
  zip.file('docProps/app.xml', '<?xml version="1.0"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>DigiDesk Test App</Application><Company>DigiDesk Test Company</Company><Manager>DigiDesk Manager</Manager></Properties>');
  zip.file('docProps/custom.xml', '<?xml version="1.0"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><property name="AuditSecret" pid="2" fmtid="{00000000-0000-0000-0000-000000000000}"><vt:lpwstr>Custom Secret</vt:lpwstr></property></Properties>');
  zip.file(names[kind][0], names[kind][1]);
  if (kind === 'xlsx') zip.file('xl/worksheets/sheet1.xml', '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1"><f>1+1</f><v>2</v></c></row></sheetData></worksheet>');
  if (kind === 'pptx') zip.file('ppt/slides/slide1.xml', '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld/></p:sld>');
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function addPngText(png, key, value) {
  const data = Buffer.concat([Buffer.from(key, 'latin1'), Buffer.from([0]), Buffer.from(value, 'latin1')]);
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write('tEXt', 4, 4, 'ascii');
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([Buffer.from('tEXt'), data])), 8 + data.length);
  const end = png.lastIndexOf(Buffer.from('IEND')) - 4;
  return Buffer.concat([png.subarray(0, end), chunk, png.subarray(end)]);
}

function exifBuffer() {
  const entries = [
    [0x010f, 'DigiDesk Camera'],
    [0x0110, 'DigiDesk Model'],
    [0x0131, 'DigiDesk Software'],
    [0x013b, 'DigiDesk Test Artist'],
  ];
  const tiff = Buffer.alloc(8 + 2 + entries.length * 12 + 128);
  tiff.write('II', 0, 2, 'ascii');
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(entries.length, 8);
  let dataOffset = 8 + 2 + entries.length * 12;
  entries.forEach(([tag, value], index) => {
    const entry = 10 + index * 12;
    const text = Buffer.from(`${value}\0`, 'ascii');
    tiff.writeUInt16LE(tag, entry);
    tiff.writeUInt16LE(2, entry + 2);
    tiff.writeUInt32LE(text.length, entry + 4);
    tiff.writeUInt32LE(dataOffset, entry + 8);
    text.copy(tiff, dataOffset);
    dataOffset += text.length;
  });
  return Buffer.concat([Buffer.from('Exif\0\0', 'ascii'), tiff.subarray(0, dataOffset)]);
}

async function makeImages() {
  const base = sharp({ create: { width: 32, height: 24, channels: 4, background: { r: 20, g: 100, b: 180, alpha: 0.5 } } });
  const plainJpeg = await base.clone().jpeg().toBuffer();
  const exif = exifBuffer();
  const exifSegment = Buffer.alloc(2 + exif.length);
  exifSegment.writeUInt16BE(exif.length + 2, 0);
  exif.copy(exifSegment, 2);
  const jpeg = Buffer.concat([plainJpeg.subarray(0, 2), Buffer.from([0xff, 0xe1]), exifSegment, plainJpeg.subarray(2)]);
  const png = addPngText(await base.clone().png().toBuffer(), 'Author', 'DigiDesk PNG User');
  return { jpeg, png };
}

async function writeFixtures() {
  await writeFile(path.join(fixtures, 'audit.pdf'), await makePdf());
  for (const kind of ['docx', 'xlsx', 'pptx']) await writeFile(path.join(fixtures, `audit.${kind}`), await officeXml(kind));
  const images = await makeImages();
  await writeFile(path.join(fixtures, 'audit.jpg'), images.jpeg);
  await writeFile(path.join(fixtures, 'audit.png'), images.png);
}

async function runInternal(name, type, Analyzer, Remover) {
  const input = path.join(fixtures, `audit.${name}`);
  const output = path.join(outputs, `clean.${name}`);
  const analyzer = new Analyzer();
  const before = await analyzer.analyze(input);
  const expected = name === 'pdf' ? [['Author', 'DigiDesk Test User'], ['Creator', 'DigiDesk Synthetic Creator'], ['Title', 'DigiDesk Synthetic PDF']] : name === 'jpg' ? [['Artist', 'DigiDesk Test Artist'], ['Software', 'DigiDesk Software'], ['Make', 'DigiDesk Camera']] : name === 'png' ? [['Author', 'DigiDesk PNG User']] : [['creator', 'DigiDesk Test User'], ['lastModifiedBy', 'DigiDesk Editor'], ['title', 'Synthetic Office File'], ['AuditSecret', 'Custom Secret']];
  for (const [key, value] of expected) assertContains(before, key, value);
  const inputStats = await stat(input);
  const inputZip = ['docx', 'xlsx', 'pptx'].includes(name) ? await JSZip.loadAsync(await readFile(input), { checkCRC32: true }) : null;
  const inputImage = ['jpg', 'png'].includes(name) ? await sharp(input).metadata() : null;
  const inputPdf = name === 'pdf' ? await PDFDocument.load(await readFile(input), { updateMetadata: false }) : null;
  const result = await new Remover().remove(input, output);
  const after = await analyzer.analyze(output);
  assert.equal(after.hasMetadata, false, `${name} still has metadata: ${metadataKeys(after).join(', ')}`);
  assert.equal(result.verified, true);
  assert.ok((await stat(output)).size > 0);
  if (inputPdf) {
    const outputPdf = await PDFDocument.load(await readFile(output), { updateMetadata: false });
    assert.equal(outputPdf.getPageCount(), inputPdf.getPageCount());
    for (let index = 0; index < inputPdf.getPageCount(); index += 1) assert.deepEqual(outputPdf.getPage(index).getSize(), inputPdf.getPage(index).getSize());
  }
  if (inputZip) {
    const outputZip = await JSZip.loadAsync(await readFile(output), { checkCRC32: true });
    if (name === 'docx') assert.match(await outputZip.file('word/document.xml').async('string'), /DigiDesk document/);
    if (name === 'xlsx') assert.match(await outputZip.file('xl/worksheets/sheet1.xml').async('string'), /<f>1\+1<\/f>/);
    if (name === 'pptx') assert.ok(Object.keys(outputZip.files).filter((entry) => /ppt\/slides\/slide\d+\.xml$/.test(entry)).length === 1);
  }
  if (inputImage) {
    const outputImage = await sharp(output).metadata();
    assert.equal(outputImage.width, inputImage.width);
    assert.equal(outputImage.height, inputImage.height);
    if (name === 'png') assert.equal(outputImage.hasAlpha, inputImage.hasAlpha);
  }
  record(`${name.toUpperCase()} analyze/remove/verify`, 'PASS', `before=${before.count}, after=${after.count}, bytes=${inputStats.size}->${(await stat(output)).size}`);
}

async function runSecurityChecks() {
  const malformed = path.join(root, 'malformed.zip');
  const zip = new JSZip();
  zip.file('../escape.txt', 'unsafe');
  await writeFile(malformed, await zip.generateAsync({ type: 'nodebuffer' }));
  await assert.rejects(() => new OfficeMetadataAnalyzer().analyze(malformed));
  assert.equal(sanitizeFilename('../../unsafe.pdf'), 'unsafe-cleaned.pdf');
  assert.equal(sanitizeFilename('..\\..\\unsafe.pdf'), 'unsafe-cleaned.pdf');
  assert.equal(sanitizeFilename('-unsafe.pdf'), 'unsafe-cleaned.pdf');
  assert.equal(sanitizeFilename('bad\0\nname.pdf'), 'badname-cleaned.pdf');
  const excessive = new JSZip();
  for (let index = 0; index <= OOXML_LIMITS.maxEntries; index += 1) excessive.file(`entry-${index}.xml`, 'x');
  await writeFile(path.join(root, 'excessive.zip'), await excessive.generateAsync({ type: 'nodebuffer' }));
  await assert.rejects(() => new OfficeMetadataAnalyzer().analyze(path.join(root, 'excessive.zip')));
  const bomb = new JSZip();
  bomb.file('docProps/core.xml', 'A'.repeat(2 * 1024 * 1024));
  await writeFile(path.join(root, 'bomb.zip'), await bomb.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } }));
  await assert.rejects(() => new OfficeMetadataAnalyzer().analyze(path.join(root, 'bomb.zip')));
  record('ZIP security and filename traversal', 'PASS', 'traversal, entry-count, compression-ratio, and filename controls');
}

async function runCleanupChecks() {
  const { dir } = await createJobDirectory();
  await writeJobState(dir, { jobId: path.basename(dir), createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() - 1000).toISOString(), fileName: 'x.pdf', fileType: 'pdf', mimeType: 'application/pdf', originalSize: 1, inputPath: path.join(dir, 'input', 'x.pdf'), status: 'created' });
  assert.equal(await cleanupExpiredJobs(), 1);
  await assert.rejects(() => stat(dir));
  record('Expired temporary-file cleanup', 'PASS');
}

async function runApiChecks() {
  const baseUrl = process.env.METADATA_AUDIT_BASE_URL ?? 'http://localhost:3001';
  const health = await fetch(`${baseUrl}/api/tools/metadata-remover/health`);
  assert.equal(health.status, 200);
  const healthBody = await health.json();
  assert.equal(healthBody.processors.pdf, true);
  assert.equal(healthBody.processors.office, true);
  assert.equal(healthBody.processors.jpeg, true);
  assert.equal(healthBody.processors.png, true);

  const fileBytes = await readFile(path.join(fixtures, 'audit.png'));
  const form = new FormData();
  form.append('file', new File([fileBytes], '../../unsafe.png', { type: 'image/png' }));
  const analyze = await fetch(`${baseUrl}/api/tools/metadata-remover/analyze`, { method: 'POST', body: form, headers: { 'x-forwarded-for': '127.0.0.61' } });
  const analyzeText = await analyze.text();
  assert.equal(analyze.status, 200, analyzeText);
  const analyzeBody = JSON.parse(analyzeText);
  assert.ok(analyzeBody.metadata.items.some((item) => item.key === 'Author'));

  const removeForm = new FormData();
  removeForm.append('file', new File([fileBytes], '../../unsafe.png', { type: 'image/png' }));
  const remove = await fetch(`${baseUrl}/api/tools/metadata-remover/remove`, { method: 'POST', body: removeForm, headers: { 'x-forwarded-for': '127.0.0.62' } });
  assert.equal(remove.status, 200);
  const removeBody = await remove.json();
  assert.match(removeBody.downloadToken, /^[a-f0-9]{64}$/);
  const download = await fetch(`${baseUrl}${removeBody.downloadUrl}`, { headers: { 'x-forwarded-for': '127.0.0.63' } });
  assert.equal(download.status, 200);
  assert.equal(download.headers.get('content-type'), 'image/png');
  assert.match(download.headers.get('content-disposition'), /filename=.*cleaned/);
  assert.equal((await download.arrayBuffer()).byteLength > 0, true);
  for (const token of ['bad', '0'.repeat(64), '../' + 'a'.repeat(62)]) {
    const response = await fetch(`${baseUrl}/api/tools/metadata-remover/download/${token}`, { headers: { 'x-forwarded-for': `127.0.0.${70 + token.length}` } });
    assert.equal(response.status, 404);
  }
  const apiTemp = process.env.METADATA_AUDIT_TEMP_DIR;
  if (apiTemp) {
    const expiredDir = path.join(apiTemp, 'audit-expired');
    await mkdir(path.join(expiredDir, 'output'), { recursive: true });
    await writeFile(path.join(expiredDir, 'output', 'expired.png'), fileBytes);
    await writeFile(path.join(expiredDir, 'state.json'), JSON.stringify({ jobId: 'audit-expired', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() - 1).toISOString(), fileName: 'expired.png', fileType: 'png', mimeType: 'image/png', originalSize: fileBytes.length, inputPath: path.join(expiredDir, 'input', 'x'), outputPath: path.join(expiredDir, 'output', 'expired.png'), outputName: 'expired-cleaned.png', downloadToken: 'e'.repeat(64), status: 'removed' }));
    const expiredResponse = await fetch(`${baseUrl}/api/tools/metadata-remover/download/${'e'.repeat(64)}`, { headers: { 'x-forwarded-for': '127.0.0.81' } });
    assert.equal(expiredResponse.status, 404);
    const deletedDir = path.join(apiTemp, 'audit-deleted');
    await mkdir(deletedDir, { recursive: true });
    await writeFile(path.join(deletedDir, 'state.json'), JSON.stringify({ jobId: 'audit-deleted', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString(), fileName: 'deleted.png', fileType: 'png', mimeType: 'image/png', originalSize: 1, inputPath: path.join(deletedDir, 'input', 'x'), outputPath: path.join(deletedDir, 'output', 'missing.png'), outputName: 'deleted-cleaned.png', downloadToken: 'd'.repeat(64), status: 'removed' }));
    const deletedResponse = await fetch(`${baseUrl}/api/tools/metadata-remover/download/${'d'.repeat(64)}`, { headers: { 'x-forwarded-for': '127.0.0.82' } });
    assert.equal(deletedResponse.status, 404);
  }

  const invalidCases = [
    ['bad.exe', 'application/octet-stream', fileBytes],
    ['audit.png', 'application/pdf', fileBytes],
    ['audit.png', 'image/png', Buffer.from('not-a-png')],
    ['invalid.pdf', 'application/pdf', Buffer.from('%PDF-not-valid')],
    ['invalid.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', Buffer.from([0x50, 0x4b, 0x03, 0x04])],
    ['invalid.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', Buffer.from([0x50, 0x4b, 0x03, 0x04])],
    ['invalid.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', Buffer.from([0x50, 0x4b, 0x03, 0x04])],
    ['invalid.jpg', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0x00])],
  ];
  for (const [name, type, bytes] of invalidCases) {
    const invalidForm = new FormData();
    invalidForm.append('file', new File([bytes], name, { type }));
    const invalid = await fetch(`${baseUrl}/api/tools/metadata-remover/analyze`, { method: 'POST', body: invalidForm, headers: { 'x-forwarded-for': `127.0.0.${90 + String(name).length}` } });
    assert.ok([400, 413].includes(invalid.status));
  }
  const oversizedForm = new FormData();
  oversizedForm.append('file', new File([Buffer.alloc(50 * 1024 * 1024 + 1)], 'oversized.pdf', { type: 'application/pdf' }));
  const oversized = await fetch(`${baseUrl}/api/tools/metadata-remover/analyze`, { method: 'POST', body: oversizedForm, headers: { 'x-forwarded-for': '127.0.0.120' } });
  assert.equal(oversized.status, 413);
  if (apiTemp) {
    const beforeFailedJobs = (await readdir(apiTemp, { withFileTypes: true })).filter((entry) => entry.isDirectory()).length;
    const failedForm = new FormData();
    failedForm.append('file', new File([Buffer.from('%PDF-not-a-real-document')], 'failed.pdf', { type: 'application/pdf' }));
    const failed = await fetch(`${baseUrl}/api/tools/metadata-remover/remove`, { method: 'POST', body: failedForm, headers: { 'x-forwarded-for': '127.0.0.121' } });
    assert.equal(failed.status, 400);
    const afterFailedJobs = (await readdir(apiTemp, { withFileTypes: true })).filter((entry) => entry.isDirectory()).length;
    assert.equal(afterFailedJobs, beforeFailedJobs);
  }
  const concurrent = await Promise.all(Array.from({ length: 4 }, async (_, index) => {
    const concurrentForm = new FormData();
    concurrentForm.append('file', new File([fileBytes], `concurrent-${index}.png`, { type: 'image/png' }));
    const response = await fetch(`${baseUrl}/api/tools/metadata-remover/remove`, { method: 'POST', body: concurrentForm, headers: { 'x-forwarded-for': `127.0.1.${index + 1}` } });
    assert.equal(response.status, 200);
    return response.json();
  }));
  assert.equal(new Set(concurrent.map((item) => item.jobId)).size, 4);
  assert.equal(new Set(concurrent.map((item) => item.downloadToken)).size, 4);
  for (const [index, name] of ['pdf', 'docx', 'xlsx', 'pptx', 'jpg', 'png'].entries()) {
    const bytes = await readFile(path.join(fixtures, `audit.${name}`));
    const downloadForm = new FormData();
    const mime = name === 'pdf' ? 'application/pdf' : name === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : name === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : name === 'pptx' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : name === 'png' ? 'image/png' : 'image/jpeg';
    downloadForm.append('file', new File([bytes], `download.${name}`, { type: mime }));
    const processed = await fetch(`${baseUrl}/api/tools/metadata-remover/remove`, { method: 'POST', body: downloadForm, headers: { 'x-forwarded-for': `127.0.2.${index + 1}` } });
    assert.equal(processed.status, 200);
    const processedBody = await processed.json();
    const downloaded = await fetch(`${baseUrl}${processedBody.downloadUrl}`, { headers: { 'x-forwarded-for': `127.0.3.${index + 1}` } });
    assert.equal(downloaded.status, 200);
    const downloadedBytes = Buffer.from(await downloaded.arrayBuffer());
    const downloadedPath = path.join(root, `downloaded.${name}`);
    await writeFile(downloadedPath, downloadedBytes);
    if (name === 'pdf') await PDFDocument.load(downloadedBytes, { updateMetadata: false });
    else if (['docx', 'xlsx', 'pptx'].includes(name)) await JSZip.loadAsync(downloadedBytes, { checkCRC32: true });
    else await sharp(downloadedPath).metadata();
  }
  record('Production API downloads reopen for PDF/DOCX/XLSX/PPTX/JPG/PNG', 'PASS');
  record('API analyze -> remove -> download and token security', 'PASS', 'invalid, expired, deleted, MIME, and concurrent jobs included');
}

async function runPasswordPdfCheck() {
  const encrypted = path.join(root, 'password.pdf');
  await execFileAsync(getQpdfPath(), ['--encrypt', 'user-pass', 'owner-pass', '256', '--', path.join(fixtures, 'audit.pdf'), encrypted]);
  await assert.rejects(() => new PdfMetadataAnalyzer().analyze(encrypted), /password|protected|invalid/i);
  record('Password-protected PDF controlled failure', 'PASS');
}

async function runUiCheck() {
  const baseUrl = process.env.METADATA_AUDIT_BASE_URL;
  if (!baseUrl) return;
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/pdf-tools/metadata-remover`, { waitUntil: 'networkidle' });
  await page.locator('input[type="file"]').setInputFiles(path.join(fixtures, 'audit.png'));
  await page.getByText(/metadata detected/i).waitFor();
  await page.getByRole('button', { name: /remove metadata/i }).click();
  await page.getByText(/removal verified/i).waitFor();
  await browser.close();
  record('Frontend upload -> analysis -> removal -> verified result', 'PASS');
}

try {
  console.log(`QPDF=${getQpdfPath() ?? 'UNAVAILABLE'}`);
  console.log(`OOXML limits: entries=${OOXML_LIMITS.maxEntries}, uncompressedMB=${OOXML_LIMITS.maxUncompressedMb}, ratio=${OOXML_LIMITS.maxCompressionRatio}`);
  assert.ok(getQpdfPath(), 'qpdf is unavailable');
  await writeFixtures();
  await runInternal('pdf', 'pdf', PdfMetadataAnalyzer, PdfMetadataRemover);
  await runInternal('docx', 'docx', OfficeMetadataAnalyzer, OfficeMetadataRemover);
  await runInternal('xlsx', 'xlsx', OfficeMetadataAnalyzer, OfficeMetadataRemover);
  await runInternal('pptx', 'pptx', OfficeMetadataAnalyzer, OfficeMetadataRemover);
  await runInternal('jpg', 'jpg', ImageMetadataAnalyzer, ImageMetadataRemover);
  await runInternal('png', 'png', ImageMetadataAnalyzer, ImageMetadataRemover);
  await runSecurityChecks();
  await runCleanupChecks();
  await runPasswordPdfCheck();
  await runApiChecks();
  await runUiCheck();
  console.log(JSON.stringify({ root, results }, null, 2));
} catch (error) {
  console.error(error.stack ?? error);
  console.log(JSON.stringify({ root, results }, null, 2));
  process.exitCode = 1;
} finally {
  if (!process.env.KEEP_METADATA_AUDIT) await rm(root, { recursive: true, force: true });
}
