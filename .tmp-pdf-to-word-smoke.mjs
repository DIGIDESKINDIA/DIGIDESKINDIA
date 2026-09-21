import fs from 'fs';
import path from 'path';
import { pdfToWord } from './lib/pdf/pdf-to-word.ts';

const filePath = path.join(process.cwd(), 'storage/fixtures/ViewDocument.pdf');
const buffer = fs.readFileSync(filePath);
const result = await pdfToWord({
  file: {
    name: 'ViewDocument.pdf',
    size: buffer.length,
    type: 'application/pdf',
    buffer: new Uint8Array(buffer),
  },
  mode: 'standard',
  language: 'eng',
});

console.log(JSON.stringify({
  success: result.success,
  message: result.message,
  outputName: result.outputName,
  hasDocx: !!result.docx,
  docxLength: result.docx ? result.docx.length : 0,
  metadata: result.metadata,
}, null, 2));
