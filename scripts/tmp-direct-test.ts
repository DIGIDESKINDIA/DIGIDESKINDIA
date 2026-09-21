// Direct test script for pdfToWord conversion
// Uses tsx to run TypeScript directly
import fs from 'fs';
import path from 'path';

async function main() {
  const startTime = Date.now();
  console.log('Starting direct conversion test...');

  // Import the pdfToWord function
  const { pdfToWord, pdfToWordOutputName } = await import('../lib/pdf/pdf-to-word');

  // Read the PDF file
  const pdfPath = 'c:/Users/Sumit kumar/Downloads/ViewDocument.pdf';
  console.log(`Reading PDF from: ${pdfPath}`);
  const pdfBuffer = fs.readFileSync(pdfPath);
  console.log(`PDF size: ${pdfBuffer.length} bytes`);

  console.log(`Import took: ${Date.now() - startTime}ms`);

  // Convert
  console.log('Calling pdfToWord...');
  const result = await pdfToWord({
    file: {
      name: 'ViewDocument.pdf',
      size: pdfBuffer.length,
      type: 'application/pdf',
      buffer: new Uint8Array(pdfBuffer),
    },
    mode: 'standard',
    language: 'eng',
  });

  console.log(`Conversion took: ${Date.now() - startTime}ms`);

  if (result.success && result.docx) {
    const outBuffer = Buffer.from(result.docx);
    const outPath = 'storage/fixtures/ViewDocument_v4.docx';
    fs.writeFileSync(outPath, outBuffer);
    console.log(`Saved to: ${outPath}`);
    console.log(`Output size: ${outBuffer.length} bytes`);
    console.log('SUCCESS');
  } else {
    console.error('Conversion failed:', result.message);
    console.log('FAILURE');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
