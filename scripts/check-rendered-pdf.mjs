import fs from 'node:fs';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const pdfPath = path.join(root, 'output/digital-118-v2-rendered.pdf');

console.log('Reading rendered PDF page count...');
console.log('File: ' + pdfPath);

const pdfBuffer = fs.readFileSync(pdfPath);
const pdfData = new Uint8Array(pdfBuffer);
const pdf = await getDocument({ data: pdfData }).promise;

console.log('');
console.log('RENDERED PDF PAGE COUNT: ' + pdf.numPages);
console.log('');
console.log('Comparison:');
console.log('  Source PDF: 118 pages');
console.log('  Generated DOCX (Word COM): 100 pages');
console.log('  Rendered PDF from DOCX: ' + pdf.numPages + ' pages');
console.log('');

if (pdf.numPages === 100) {
    console.log('RESULT: Rendered PDF matches Word page count (100)');
    console.log('CONCLUSION: 18-page gap is consistent and maintained in PDF rendering');
} else if (pdf.numPages === 118) {
    console.log('RESULT: Rendered PDF matches source PDF page count (118)');
    console.log('CONCLUSION: Word pagination differs from PDF rendering');
} else {
    console.log('RESULT: Rendered PDF has different page count (' + pdf.numPages + ')');
    console.log('CONCLUSION: Unexpected page count in rendered PDF');
}
