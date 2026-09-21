import fs from 'fs';
import FormData from 'form-data';

async function testApi() {
  try {
    // Read the test Excel file
    const fileStream = fs.createReadStream('test-excel.xlsx');
    const form = new FormData();
    form.append('file', fileStream, 'test-excel.xlsx');
    form.append('type', 'office-to-pdf');

    // Send to API
    const response = await fetch('http://localhost:3000/api/pdf/convert', {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    const data = await response.arrayBuffer();
    console.log('Response size:', data.byteLength);
    
    if (response.ok) {
      // Try to save as PDF
      fs.writeFileSync('output-test.pdf', Buffer.from(data));
      console.log('PDF saved to output-test.pdf');
      console.log('SUCCESS');
    } else {
      const text = new TextDecoder().decode(data);
      console.log('Error response:', text);
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testApi();
