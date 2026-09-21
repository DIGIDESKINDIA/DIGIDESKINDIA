import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, '.tmp-pdfword');

const inputFiles = [
  'test-files/small.pdf',
  'test-files/multi-page.pdf',
  'storage/uploads/3e0ba4e7-c78e-4355-aaf1-161741710290-Certificate Examination Form-compressed-increased.pdf',
].map((file) => path.join(root, file));

execSync(
  `npx tsc ${path.join(root, 'lib/pdf/pdf-to-word.ts')} --module commonjs --target ES2022 --moduleResolution node --esModuleInterop --skipLibCheck --outDir ${outDir}`,
  { cwd: root, stdio: 'inherit' }
);

const compiledModule = path.join(outDir, 'pdf-to-word.js');
const { pdfToWord, pdfToWordOutputName } = await import('file://' + compiledModule);

for (const inputFile of inputFiles) {
  if (!fs.existsSync(inputFile)) {
    console.log('SKIP', inputFile);
    continue;
  }

  const buffer = fs.readFileSync(inputFile);
  const result = await pdfToWord({
    file: {
      name: path.basename(inputFile),
      size: buffer.length,
      type: 'application/pdf',
      buffer: new Uint8Array(buffer),
    },
    mode: 'digital',
    language: 'eng',
  });

  console.log('FILE', inputFile);
  console.log('RESULT', JSON.stringify({ success: result.success, message: result.message, metadata: result.metadata }));

  if (result.docx) {
    const outDirName = path.join(root, 'storage/output');
    fs.mkdirSync(outDirName, { recursive: true });
    const outPath = path.join(outDirName, pdfToWordOutputName(path.basename(inputFile)));
    fs.writeFileSync(outPath, Buffer.from(result.docx));
    console.log('DOCX_PATH', outPath, 'SIZE', Buffer.from(result.docx).length);
  }
}
