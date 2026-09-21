const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const outDir = path.join(process.cwd(), 'test-fixtures');
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const pdfOne = await PDFDocument.create();
  const pageOne = pdfOne.addPage([612, 792]);
  const font = await pdfOne.embedFont(StandardFonts.Helvetica);
  const bold = await pdfOne.embedFont(StandardFonts.HelveticaBold);
  pageOne.drawText('DigiDesk Security Test', { x: 72, y: 720, size: 20, font: bold, color: rgb(0, 0, 0) });
  const onePageLines = [
    'CONFIDENTIAL: 123-45-6789',
    'SSN: 987-65-4321',
    'Email: alice@example.com',
    'Secret code: ALPHA-7G9',
  ];
  for (let i = 0; i < onePageLines.length; i += 1) {
    pageOne.drawText(onePageLines[i], { x: 72, y: 680 - i * 32, size: 16, font, color: rgb(0, 0, 0) });
  }
  fs.writeFileSync(path.join(outDir, 'redact-one-page.pdf'), Buffer.from(await pdfOne.save()));

  const pdfMulti = await PDFDocument.create();
  for (let p = 1; p <= 3; p += 1) {
    const page = pdfMulti.addPage([612, 792]);
    const pageFont = await pdfMulti.embedFont(StandardFonts.Helvetica);
    const pageBold = await pdfMulti.embedFont(StandardFonts.HelveticaBold);
    page.drawText('Multi-Page Test :: Page ' + p, { x: 72, y: 760, size: 22, font: pageBold, color: rgb(0, 0, 0) });
    const lines = [
      'USER-' + p + ': robin.smith@contoso.com',
      'PIN-' + p + ': 404-' + (p * 11),
      'Token-' + p + ': SECRET-XYZ-' + (p * 7),
    ];
    for (let i = 0; i < lines.length; i += 1) {
      page.drawText(lines[i], { x: 72, y: 690 - i * 36, size: 18, font: pageFont, color: rgb(0, 0, 0) });
    }
  }
  fs.writeFileSync(path.join(outDir, 'redact-multi-page.pdf'), Buffer.from(await pdfMulti.save()));

  console.log('created');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
