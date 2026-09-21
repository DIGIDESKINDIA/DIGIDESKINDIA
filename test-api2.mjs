import fs from 'fs';
import { request } from 'http';
import { parse } from 'url';

async function testApi() {
  return new Promise((resolve, reject) => {
    const filePath = 'test-excel.xlsx';
    const fileBuffer = fs.readFileSync(filePath);
    
    // Build multipart form data manually
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2, 13);
    const lines = [];
    
    // Add file field
    lines.push(`--${boundary}`);
    lines.push('Content-Disposition: form-data; name="file"; filename="test-excel.xlsx"');
    lines.push('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    lines.push('');
    
    const body = Buffer.concat([
      Buffer.from(lines.join('\r\n') + '\r\n'),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}\r\n`),
      Buffer.from('Content-Disposition: form-data; name="type"\r\n\r\noffice-to-pdf'),
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
    
    const options = parse('http://localhost:3000/api/pdf/convert');
    options.method = 'POST';
    options.headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length
    };
    
    const req = request(options, (res) => {
      let data = Buffer.alloc(0);
      
      res.on('data', chunk => {
        data = Buffer.concat([data, chunk]);
      });
      
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Headers:', res.headers);
        
        try {
          if (res.headers['content-type']?.includes('application/pdf')) {
            fs.writeFileSync('output-test.pdf', data);
            console.log('PDF saved! Size:', data.length);
            console.log('SUCCESS');
          } else {
            const text = data.toString();
            console.log('Response:', text);
          }
        } catch (e) {
          console.error(e.message);
        }
        resolve();
      });
    });
    
    req.on('error', (err) => {
      console.error('Request error:', err.message);
      reject(err);
    });
    
    req.write(body);
    req.end();
  });
}

testApi().catch(console.error);
