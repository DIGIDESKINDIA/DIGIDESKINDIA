#!/usr/bin/env node
/**
 * End-to-End API Testing for DigiDesk Tools
 * Tests each tool with actual file uploads, processing, and output validation
 */

import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

// Use native fetch (Node 18+) or fallback
const fetch = globalThis.fetch;

const BASE_URL = 'http://localhost:3000';
const TEST_FILES_DIR = './test-files';

// Test file configurations
const testFiles = {
  pdf: {
    small: path.join(TEST_FILES_DIR, 'small.pdf'),
    multi: path.join(TEST_FILES_DIR, 'multi-page.pdf'),
    large: path.join(TEST_FILES_DIR, 'large.pdf'),
    invalid: path.join(TEST_FILES_DIR, 'invalid.pdf'),
    empty: path.join(TEST_FILES_DIR, 'empty.pdf'),
  },
  image: {
    jpg: path.join(TEST_FILES_DIR, 'small.jpg'),
    png: path.join(TEST_FILES_DIR, 'transparent.png'),
    highRes: path.join(TEST_FILES_DIR, 'high-res.png'),
    webp: path.join(TEST_FILES_DIR, 'test.webp'),
  },
};

/**
 * Helper: Check if file exists and is readable
 */
function fileExists(filepath) {
  try {
    fs.accessSync(filepath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper: Get file size in MB
 */
function getFileSize(filepath) {
  try {
    const stats = fs.statSync(filepath);
    return (stats.size / (1024 * 1024)).toFixed(2);
  } catch {
    return 'unknown';
  }
}

/**
 * Helper: Validate PDF file
 */
function validatePdf(buffer) {
  if (!buffer || buffer.length < 4) return false;
  // Check PDF header
  const header = buffer.toString('utf-8', 0, 4);
  return header === '%PDF' || buffer.toString('utf-8', 0, 5).includes('PDF');
}

/**
 * Helper: Validate image file
 */
function validateImage(buffer, format) {
  if (!buffer || buffer.length < 4) return false;
  
  const signatures = {
    jpeg: [0xff, 0xd8, 0xff],
    png: [0x89, 0x50, 0x4e, 0x47],
    jpg: [0xff, 0xd8, 0xff],
  };
  
  const sig = signatures[format.toLowerCase()] || signatures['jpeg'];
  for (let i = 0; i < sig.length; i++) {
    if (buffer[i] !== sig[i]) return false;
  }
  return true;
}

/**
 * Test PDF Tool
 */
async function testPdfTool(toolName, testConfig) {
  const {
    endpoint,
    method = 'POST',
    fileParam = 'file',
    inputFile,
    expectedOutput = 'application/pdf',
    validationFn = validatePdf,
  } = testConfig;

  const result = {
    tool: toolName,
    endpoint,
    upload: 'BLOCKED',
    processing: 'BLOCKED',
    output: 'BLOCKED',
    download: 'BLOCKED',
    validation: 'BLOCKED',
    status: 'NOT_TESTED',
    size_input: '0',
    size_output: '0',
    error: null,
  };

  try {
    // Check if input file exists
    if (!fileExists(inputFile)) {
      result.error = `Input file not found: ${inputFile}`;
      return result;
    }

    result.size_input = getFileSize(inputFile);
    result.upload = 'PASS';

    // Create form data
    const formData = new FormData();
    formData.append(fileParam, fs.createReadStream(inputFile));

    // Add any additional parameters
    if (testConfig.params) {
      Object.entries(testConfig.params).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    // Make API request
    const response = await fetch(`${BASE_URL}/api/pdf/${endpoint}`, {
      method,
      body: formData,
      headers: formData.getHeaders(),
    });

    result.processing = response.ok ? 'PASS' : 'FAIL';

    if (!response.ok) {
      const text = await response.text();
      result.error = `HTTP ${response.status}: ${text.substring(0, 100)}`;
      result.status = 'FAIL';
      return result;
    }

    // Check response type
    const contentType = response.headers.get('content-type') || '';
    result.download = 'PASS';

    // Handle different response types
    if (contentType.includes('application/json')) {
      const json = await response.json();
      
      // For JSON responses, check if they contain file data or status
      if (json.url) {
        // Download from URL
        result.output = 'PASS';
      } else if (json.success === false) {
        result.output = 'FAIL';
        result.error = json.message;
        result.status = 'FAIL';
        return result;
      } else {
        result.output = 'PASS';
      }
    } else if (contentType.includes('application/pdf') || contentType.includes('zip')) {
      // Binary response
      const buffer = await response.buffer();
      result.size_output = (buffer.length / (1024 * 1024)).toFixed(2);

      if (buffer.length === 0) {
        result.output = 'FAIL';
        result.validation = 'FAIL';
        result.error = 'Empty response buffer';
        result.status = 'FAIL';
        return result;
      }

      result.output = 'PASS';

      // Validate output
      if (validationFn(buffer)) {
        result.validation = 'PASS';
        result.status = 'PASS';
      } else {
        result.validation = 'FAIL';
        result.error = 'Output validation failed';
        result.status = 'FAIL';
      }
    } else {
      result.output = 'FAIL';
      result.error = `Unexpected content type: ${contentType}`;
      result.status = 'FAIL';
    }
  } catch (error) {
    result.error = error.message;
    result.status = 'ERROR';
  }

  return result;
}

/**
 * Test Image Tool
 */
async function testImageTool(toolName, testConfig) {
  const {
    endpoint,
    method = 'POST',
    fileParam = 'file',
    inputFile,
    validationFn = validateImage,
  } = testConfig;

  const result = {
    tool: toolName,
    endpoint,
    upload: 'BLOCKED',
    processing: 'BLOCKED',
    output: 'BLOCKED',
    download: 'BLOCKED',
    validation: 'BLOCKED',
    status: 'NOT_TESTED',
    size_input: '0',
    size_output: '0',
    error: null,
  };

  try {
    if (!fileExists(inputFile)) {
      result.error = `Input file not found: ${inputFile}`;
      return result;
    }

    result.size_input = getFileSize(inputFile);
    result.upload = 'PASS';

    const formData = new FormData();
    formData.append(fileParam, fs.createReadStream(inputFile));

    if (testConfig.params) {
      Object.entries(testConfig.params).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const response = await fetch(`${BASE_URL}/api/image/${endpoint}`, {
      method,
      body: formData,
      headers: formData.getHeaders(),
    });

    result.processing = response.ok ? 'PASS' : 'FAIL';

    if (!response.ok) {
      const text = await response.text();
      result.error = `HTTP ${response.status}: ${text.substring(0, 100)}`;
      result.status = 'FAIL';
      return result;
    }

    const contentType = response.headers.get('content-type') || '';
    result.download = 'PASS';

    if (contentType.includes('application/json')) {
      const json = await response.json();
      if (json.url || json.success !== false) {
        result.output = 'PASS';
        result.status = 'PASS';
      } else {
        result.output = 'FAIL';
        result.status = 'FAIL';
        result.error = json.message;
      }
    } else {
      const buffer = await response.buffer();
      result.size_output = (buffer.length / (1024 * 1024)).toFixed(2);

      if (buffer.length === 0) {
        result.output = 'FAIL';
        result.validation = 'FAIL';
        result.error = 'Empty response';
        result.status = 'FAIL';
      } else {
        result.output = 'PASS';
        result.validation = validationFn(buffer, contentType.split('/')[1]) ? 'PASS' : 'FAIL';
        result.status = result.validation === 'PASS' ? 'PASS' : 'FAIL';
      }
    }
  } catch (error) {
    result.error = error.message;
    result.status = 'ERROR';
  }

  return result;
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('DigiDesk India - E2E API Test Suite');
  console.log('='.repeat(80) + '\n');

  const results = {
    pdf: [],
    image: [],
    timestamp: new Date().toISOString(),
  };

  // PDF Tool tests
  console.log('Testing PDF Tools...\n');
  const pdfTests = [
    { name: 'Merge', config: { endpoint: 'merge', inputFile: testFiles.pdf.small } },
    { name: 'Split', config: { endpoint: 'split', inputFile: testFiles.pdf.multi } },
    { name: 'Compress', config: { endpoint: 'compress', inputFile: testFiles.pdf.large } },
    { name: 'Rotate', config: { endpoint: 'rotate', inputFile: testFiles.pdf.small } },
    { name: 'Extract Pages', config: { endpoint: 'extract-pages', inputFile: testFiles.pdf.multi, params: { pages: '1' } } },
    { name: 'Delete Pages', config: { endpoint: 'delete-pages', inputFile: testFiles.pdf.multi, params: { pages: '1' } } },
    { name: 'Organize', config: { endpoint: 'organize', inputFile: testFiles.pdf.multi } },
    { name: 'Page Numbers', config: { endpoint: 'page-numbers', inputFile: testFiles.pdf.small } },
    { name: 'Watermark', config: { endpoint: 'watermark', inputFile: testFiles.pdf.small, params: { text: 'TEST' } } },
    { name: 'Protect', config: { endpoint: 'protect', inputFile: testFiles.pdf.small, params: { password: 'test' } } },
    { name: 'Unlock', config: { endpoint: 'unlock', inputFile: testFiles.pdf.small, params: { password: 'test' } } },
    { name: 'Image to PDF', config: { endpoint: 'image-to-pdf', inputFile: testFiles.image.jpg } },
    { name: 'PDF to Image', config: { endpoint: 'pdf-to-image', inputFile: testFiles.pdf.small } },
    { name: 'Info', config: { endpoint: 'info', inputFile: testFiles.pdf.small } },
    { name: 'Metadata', config: { endpoint: 'metadata', inputFile: testFiles.pdf.small } },
  ];

  for (const test of pdfTests) {
    try {
      const result = await testPdfTool(test.name, test.config);
      results.pdf.push(result);
      console.log(`✓ ${test.name}: ${result.status}`);
    } catch (error) {
      console.error(`✗ ${test.name}: ${error.message}`);
    }
  }

  // Image Tool tests
  console.log('\nTesting Image Tools...\n');
  const imageTests = [
    { name: 'Resize', config: { endpoint: 'resize', inputFile: testFiles.image.png, params: { width: 100, height: 100 } } },
    { name: 'Compress', config: { endpoint: 'compress', inputFile: testFiles.image.png } },
    { name: 'Rotate', config: { endpoint: 'rotate', inputFile: testFiles.image.png } },
    { name: 'Crop', config: { endpoint: 'crop', inputFile: testFiles.image.png, params: { x: 0, y: 0, width: 50, height: 50 } } },
    { name: 'Convert', config: { endpoint: 'convert', inputFile: testFiles.image.png, params: { format: 'jpg' } } },
    { name: 'Watermark', config: { endpoint: 'watermark', inputFile: testFiles.image.png, params: { text: 'TEST' } } },
    { name: 'Image to PDF', config: { endpoint: 'image-to-pdf', inputFile: testFiles.image.jpg } },
    { name: 'Passport Photo', config: { endpoint: 'passport-photo', inputFile: testFiles.image.png } },
    { name: 'Remove Background', config: { endpoint: 'remove-background', inputFile: testFiles.image.png } },
  ];

  for (const test of imageTests) {
    try {
      const result = await testImageTool(test.name, test.config);
      results.image.push(result);
      console.log(`✓ ${test.name}: ${result.status}`);
    } catch (error) {
      console.error(`✗ ${test.name}: ${error.message}`);
    }
  }

  return results;
}

// Run tests
const results = await runAllTests();

// Generate report
console.log('\n' + '='.repeat(80));
console.log('PDF Tools Summary');
console.log('='.repeat(80));
console.table(results.pdf.map(r => ({
  Tool: r.tool,
  Upload: r.upload,
  Processing: r.processing,
  Output: r.output,
  Validation: r.validation,
  Status: r.status,
  InputSize: r.size_input,
  OutputSize: r.size_output,
})));

console.log('\n' + '='.repeat(80));
console.log('Image Tools Summary');
console.log('='.repeat(80));
console.table(results.image.map(r => ({
  Tool: r.tool,
  Upload: r.upload,
  Processing: r.processing,
  Output: r.output,
  Validation: r.validation,
  Status: r.status,
  InputSize: r.size_input,
  OutputSize: r.size_output,
})));

// Save results
const reportPath = './E2E_TEST_RESULTS.json';
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\nFull results saved to: ${reportPath}`);

// Summary stats
const pdfPassed = results.pdf.filter(r => r.status === 'PASS').length;
const imagePassed = results.image.filter(r => r.status === 'PASS').length;
console.log(`\nSummary: ${pdfPassed}/${results.pdf.length} PDF tools passed, ${imagePassed}/${results.image.length} Image tools passed`);
