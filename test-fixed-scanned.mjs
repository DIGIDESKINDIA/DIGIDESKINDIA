import fs from 'node:fs';
import JSZip from 'jszip';
import { pdfToWord } from './lib/pdf/pdf-to-word.ts';

const main = async () => {
  console.log('=== GENERATE FIXED SCANNED-FORM DOCX ===');
  const buf = fs.readFileSync('storage/uploads/3e0ba4e7-c78e-4355-aaf1-161741710290-Certificate Examination Form-compressed-increased.pdf');
  const r = await pdfToWord({
    file: { name: 'form.pdf', size: buf.length, type: 'application/pdf', buffer: new Uint8Array(buf) },
    mode: 'digital',
    language: 'eng',
  });

  if (!r.success || !r.docx) {
    console.log('FAILED:', r.message);
    process.exit(1);
  }

  fs.writeFileSync('output/scanned-form-positioned-fixed.docx', r.docx);
  console.log(JSON.stringify({
    success: true,
    outputSize: r.docx.length,
    pages: r.metadata?.pages,
    digitalPages: r.metadata?.digitalPages,
    scannedPages: r.metadata?.scannedPages,
    ocrWords: r.metadata?.words,
  }, null, 2));

  console.log('\n=== DOCX XML STRUCTURE CHECK ===');
  const zip = await JSZip.loadAsync(fs.readFileSync('output/scanned-form-positioned-fixed.docx'));
  const docXml = await zip.file('word/document.xml')?.async('string') || '';

  const hasGiantParagraph = /<w:p>[\s\S]{5000,}<\/w:p>/.test(docXml);
  const w_t_count = (docXml.match(/<w:t\b/gi) || []).length;
  const w_drawing_count = (docXml.match(/<w:drawing\b/gi) || []).length;
  const wp_anchor_count = (docXml.match(/<wp:anchor\b/gi) || []).length;
  const p_count = (docXml.match(/<w:p>/gi) || []).length;

  console.log(JSON.stringify({
    w_t: w_t_count,
    w_drawing: w_drawing_count,
    wp_anchor: wp_anchor_count,
    paragraphs: p_count,
    hasGiantFlowingParagraph: hasGiantParagraph,
  }, null, 2));

  console.log('\n=== DIGITAL REGRESSION 118-PAGE ===');
  const digitalBuf = fs.readFileSync('storage/fixtures/ViewDocument_current.rendered.pdf');
  const digitalR = await pdfToWord({
    file: { name: 'ViewDocument_current.rendered.pdf', size: digitalBuf.length, type: 'application/pdf', buffer: new Uint8Array(digitalBuf) },
    mode: 'digital',
    language: 'eng',
  });

  console.log(JSON.stringify({
    inputPages: digitalR.metadata?.pages ?? 0,
    outputPages: digitalR.metadata?.pages ?? 0,
    digitalPages: digitalR.metadata?.digitalPages ?? 0,
    scannedPages: digitalR.metadata?.scannedPages ?? 0,
    success: digitalR.success,
  }, null, 2));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
