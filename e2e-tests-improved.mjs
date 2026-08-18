#!/usr/bin/env node
/**
 * Improved End-to-End API Testing for DigiDesk Tools
 * Handles specific requirements for each tool
 */

import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const TEST_FILES_DIR = './test-files';

const testFiles = {
  pdf: {
    small: path.join(TEST_FILES_DIR, 'small.pdf'),
    multi: path.join(TEST_FILES_DIR, 'multi-page.pdf'),
    large: path.join(TEST_FILES_DIR, 'large.pdf'),
  },
  image: {
    jpg: path.join(TEST_FILES_DIR, 'small.jpg'),
    png: path.join(TEST_FILES_DIR, 'transparent.png'),
  },
};

function fileExists(filepath) {
  try {
    fs.accessSync(filepath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function getFileSize(filepath) {
  try {
    const stats = fs.statSync(filepath);
    return (stats.size / (1024 * 1024)).toFixed(2);
  } catch {
    return '0';
  }
}

function validatePdf(buffer) {
  if (!buffer || buffer.length < 4) return false;
  return buffer.toString('utf-8', 0, 4) === '%PDF' || buffer.toString('utf-8', 0, 5).includes('PDF');
}

function validateImage(buffer, format) {
  if (!buffer || buffer.length < 4) return false;
  const signatures = {
    jpeg: [0xff, 0xd8, 0xff],
    png: [0x89, 0x50, 0x4e, 0x47],
    jpg: [0xff, 0xd8, 0xff],
  };
  const sig = signatures[format?.toLowerCase()] || [0xff, 0xd8, 0xff];
  return sig.every((byte, i) => buffer[i] === byte);
}

async function testPdfTool(toolName, testConfig) {
  const result = {
    tool: toolName,
    endpoint: testConfig.endpoint,
    status: 'NOT_TESTED',
    error: null,
    details: {},
  };

  try {
    const files = testConfig.files || [testConfig.inputFile];
    
    // Check files exist
    for (const file of files) {
      if (!fileExists(file)) {
        result.error = `File not found: ${file}`;
        result.status = 'BLOCKED';
        return result;
      }
    }

    // Create form
    const form = new FormData();
    
    // Add files using the actual API contract: repeated `files` field for multi-file requests
    for (const file of files) {
      const buffer = fs.readFileSync(file);
      const blob = new Blob([buffer], { type: 'application/pdf' });
      form.append('files', blob, path.basename(file));
    }

    // Add parameters
    if (testConfig.params) {
      for (const [key, value] of Object.entries(testConfig.params)) {
        form.append(key, String(value));
      }
    }

    // Make request
    const response = await fetch(`${BASE_URL}/api/pdf/${testConfig.endpoint}`, {
      method: 'POST',
      body: form,
    });

    result.details.statusCode = response.status;

    if (!response.ok) {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        result.error = json.message || json.error;
      } catch {
        result.error = text.substring(0, 100);
      }
      result.status = 'FAIL';
      return result;
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const json = await response.json();
      result.details.responseType = 'JSON';
      
      if (json.success === false) {
        result.error = json.message;
        result.status = 'FAIL';
      } else {
        result.status = 'PASS';
      }
    } else {
      const buffer = await response.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      result.details.responseSize = (uint8.length / (1024 * 1024)).toFixed(2);
      result.details.responseType = contentType.includes('zip') ? 'ZIP' : 'BINARY';

      if (uint8.length === 0) {
        result.error = 'Empty response';
        result.status = 'FAIL';
      } else if (testConfig.validateOutput && !testConfig.validateOutput(uint8)) {
        result.error = 'Output validation failed';
        result.status = 'FAIL';
      } else {
        result.status = 'PASS';
      }
    }
  } catch (error) {
    result.error = error.message;
    result.status = 'ERROR';
  }

  return result;
}

async function testImageTool(toolName, testConfig) {
  const result = {
    tool: toolName,
    endpoint: testConfig.endpoint,
    status: 'NOT_TESTED',
    error: null,
    details: {},
  };

  try {
    if (!fileExists(testConfig.inputFile)) {
      result.error = `File not found: ${testConfig.inputFile}`;
      result.status = 'BLOCKED';
      return result;
    }

    const form = new FormData();
    const buffer = fs.readFileSync(testConfig.inputFile);
    
    let mimeType = 'image/png';
    if (testConfig.inputFile.endsWith('.jpg') || testConfig.inputFile.endsWith('.jpeg')) {
      mimeType = 'image/jpeg';
    }

    const blob = new Blob([buffer], { type: mimeType });

    if (testConfig.endpoint === 'image-to-pdf') {
      form.append('files', blob, path.basename(testConfig.inputFile));
    } else {
      form.append('file', blob, path.basename(testConfig.inputFile));
    }

    if (testConfig.params) {
      for (const [key, value] of Object.entries(testConfig.params)) {
        form.append(key, String(value));
      }
    }

    const response = await fetch(`${BASE_URL}/api/image/${testConfig.endpoint}`, {
      method: 'POST',
      body: form,
    });

    result.details.statusCode = response.status;

    if (!response.ok) {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        result.error = json.message || json.error;
      } catch {
        result.error = text.substring(0, 100);
      }
      result.status = 'FAIL';
      return result;
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const json = await response.json();
      result.details.responseType = 'JSON';
      result.status = json.success !== false ? 'PASS' : 'FAIL';
      if (json.message) result.error = json.message;
    } else {
      const buffer = await response.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      result.details.responseSize = (uint8.length / (1024 * 1024)).toFixed(2);
      result.details.responseType = contentType;

      if (uint8.length === 0) {
        result.error = 'Empty response';
        result.status = 'FAIL';
      } else {
        result.status = 'PASS';
      }
    }
  } catch (error) {
    result.error = error.message;
    result.status = 'ERROR';
  }

  return result;
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('DigiDesk India - Comprehensive E2E Testing');
  console.log('='.repeat(80) + '\n');

  const results = { pdf: [], image: [], timestamp: new Date().toISOString() };

  // PDF Tests
  console.log('PDF Tools Testing...\n');
  
  const pdfTests = [
    { name: 'Info', endpoint: 'info', inputFile: testFiles.pdf.small },
    { name: 'Rotate', endpoint: 'rotate', inputFile: testFiles.pdf.small, params: { angle: 90 } },
    { name: 'Watermark', endpoint: 'watermark', inputFile: testFiles.pdf.small, params: { text: 'TEST' } },
    { name: 'Extract Pages', endpoint: 'extract-pages', inputFile: testFiles.pdf.multi, params: { pages: '1' } },
    { name: 'Delete Pages', endpoint: 'delete-pages', inputFile: testFiles.pdf.multi, params: { pages: '1' } },
    { name: 'Protect', endpoint: 'protect', inputFile: testFiles.pdf.small, params: { password: 'test123' } },
    { name: 'Unlock', endpoint: 'unlock', inputFile: testFiles.pdf.small, params: { password: 'test123' } },
    { name: 'Split', endpoint: 'split', inputFile: testFiles.pdf.multi },
    { name: 'Compress', endpoint: 'compress', inputFile: testFiles.pdf.large },
    { name: 'Page Numbers', endpoint: 'page-numbers', inputFile: testFiles.pdf.small },
    { name: 'Metadata', endpoint: 'metadata', inputFile: testFiles.pdf.small },
    { name: 'Merge', endpoint: 'merge', files: [testFiles.pdf.small, testFiles.pdf.multi] },
    { name: 'Organize', endpoint: 'organize', inputFile: testFiles.pdf.multi, params: { order: '1,2,3' } },
    { name: 'Image to PDF', endpoint: 'image-to-pdf', inputFile: testFiles.image.jpg },
    { name: 'PDF to Image', endpoint: 'pdf-to-image', inputFile: testFiles.pdf.small },
  ];

  for (const test of pdfTests) {
    const result = await testPdfTool(test.name, test);
    results.pdf.push(result);
    const symbol = result.status === 'PASS' ? '✓' : result.status === 'BLOCKED' ? '⊘' : '✗';
    console.log(`${symbol} ${test.name.padEnd(20)} ${result.status.padEnd(10)} ${result.error ? '(' + result.error.substring(0, 40) + ')' : ''}`);
  }

  // Image Tests
  console.log('\n\nImage Tools Testing...\n');

  const imageTests = [
    { name: 'Resize', endpoint: 'resize', inputFile: testFiles.image.png, params: { width: 100, height: 100 } },
    { name: 'Crop', endpoint: 'crop', inputFile: testFiles.image.png, params: { x: 0, y: 0, width: 50, height: 50 } },
    { name: 'Rotate', endpoint: 'rotate', inputFile: testFiles.image.png, params: { angle: 90 } },
    { name: 'Compress', endpoint: 'compress', inputFile: testFiles.image.png, params: { quality: 80 } },
    { name: 'Convert', endpoint: 'convert', inputFile: testFiles.image.png, params: { format: 'jpg' } },
    { name: 'Watermark', endpoint: 'watermark', inputFile: testFiles.image.png, params: { text: 'TEST' } },
    { name: 'Passport Photo', endpoint: 'passport-photo', inputFile: testFiles.image.png },
    { name: 'Remove Background', endpoint: 'remove-background', inputFile: testFiles.image.png },
    { name: 'Image to PDF', endpoint: 'image-to-pdf', inputFile: testFiles.image.jpg },
  ];

  for (const test of imageTests) {
    const result = await testImageTool(test.name, test);
    results.image.push(result);
    const symbol = result.status === 'PASS' ? '✓' : result.status === 'BLOCKED' ? '⊘' : '✗';
    console.log(`${symbol} ${test.name.padEnd(20)} ${result.status.padEnd(10)} ${result.error ? '(' + result.error.substring(0, 40) + ')' : ''}`);
  }

  // Summary
  const pdfPass = results.pdf.filter(r => r.status === 'PASS').length;
  const pdfBlock = results.pdf.filter(r => r.status === 'BLOCKED').length;
  const imgPass = results.image.filter(r => r.status === 'PASS').length;
  const imgBlock = results.image.filter(r => r.status === 'BLOCKED').length;

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`PDF Tools: ${pdfPass} PASS, ${pdfBlock} BLOCKED, ${results.pdf.length - pdfPass - pdfBlock} FAIL (Total: ${results.pdf.length})`);
  console.log(`Image Tools: ${imgPass} PASS, ${imgBlock} BLOCKED, ${results.image.length - imgPass - imgBlock} FAIL (Total: ${results.image.length})`);
  console.log(`Total: ${pdfPass + imgPass} PASS, ${pdfBlock + imgBlock} BLOCKED, ${results.pdf.length + results.image.length - pdfPass - imgPass - pdfBlock - imgBlock} FAIL (Total: ${results.pdf.length + results.image.length})`);

  // Save results
  fs.writeFileSync('./E2E_TEST_RESULTS_DETAILED.json', JSON.stringify(results, null, 2));
  console.log('\nResults saved to: E2E_TEST_RESULTS_DETAILED.json');

  return results;
}

await runTests();
