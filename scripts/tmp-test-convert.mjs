import fs from 'fs';
import http from 'http';

const pdfPath = 'c:/Users/Sumit kumar/Downloads/ViewDocument.pdf';
const pdfBytes = fs.readFileSync(pdfPath);

// Build multipart/form-data manually
const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
const crlf = '\r\n';

let body = '';
body += `--${boundary}${crlf}`;
body += `Content-Disposition: form-data; name="file"; filename="ViewDocument.pdf"${crlf}`;
body += `Content-Type: application/pdf${crlf}${crlf}`;

const bodyPart1 = Buffer.from(body, 'utf8');
const bodyPart2 = Buffer.concat([
  Buffer.from(`${crlf}--${boundary}--${crlf}`, 'utf8')
]);

// Combine all parts
const multipart = Buffer.concat([bodyPart1, pdfBytes, bodyPart2]);

console.log('Sending multipart/form-data, PDF size:', pdfBytes.length, 'Total size:', multipart.length);

const request = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/pdf/pdf-to-word',
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': multipart.length
  },
  timeout: 60000
}, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Content-Type:', res.headers['content-type']);
  
  const chunks = [];
  res.on('data', chunk => chunks.push(chunk));
  res.on('end', () => {
    const buf = Buffer.concat(chunks);
    console.log('Response size:', buf.length);
    if (res.statusCode === 200) {
      fs.writeFileSync('storage/fixtures/ViewDocument_v4.docx', buf);
      console.log('Saved v4.docx');
    } else {
      console.log('Response:', buf.toString().substring(0, 500));
    }
  });
});

request.on('error', err => console.error('Request error:', err.message));
request.write(multipart);
request.end();