import fs from 'node:fs';
import JSZip from 'jszip';

const main = async () => {
  const zip = await JSZip.loadAsync(fs.readFileSync('output/scanned-form-positioned-fixed.docx'));
  const docXml = await zip.file('word/document.xml')?.async('string') || '';

  console.log('=== DOCUMENT.XML (first 3000 chars) ===');
  console.log(docXml.substring(0, 3000));

  console.log('\n=== SEARCHING FOR OCR TEXT BOXES ===');
  const txbxMatches = docXml.match(/<w:txbxContent[\s\S]*?<\/w:txbxContent>/g) || [];
  console.log(`Found ${txbxMatches.length} text boxes`);
  if (txbxMatches.length > 0) {
    console.log('First text box:', txbxMatches[0].substring(0, 500));
  }

  console.log('\n=== SEARCHING FOR ANCHORS ===');
  const anchorMatches = docXml.match(/<wp:anchor[\s\S]*?<\/wp:anchor>/g) || [];
  console.log(`Found ${anchorMatches.length} anchors`);
  if (anchorMatches.length > 0) {
    console.log('First anchor (first 600 chars):', anchorMatches[0].substring(0, 600));
  }

  console.log('\n=== DOCX FILE LISTING ===');
  zip.forEach((relativePath, file) => {
    if (relativePath.includes('media')) {
      console.log(`${relativePath} (${file._data.uncompressedSize} bytes)`);
    }
  });
};

main().catch(err => { console.error(err); process.exit(1); });
