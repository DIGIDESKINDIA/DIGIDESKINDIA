import test from 'node:test';
import assert from 'node:assert/strict';

import {
  detectFileType,
  getSupportedMimeTypes,
  isAllowedExtension,
  sanitizeFilename,
  validateMimeType,
} from './validation.ts';

test('detects supported file types from extension and mime', () => {
  assert.equal(detectFileType('report.pdf', 'application/pdf'), 'pdf');
  assert.equal(detectFileType('report.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'), 'docx');
  assert.equal(detectFileType('photo.jpg', 'image/jpeg'), 'jpg');
  assert.equal(detectFileType('image.png', 'image/png'), 'png');
});

test('validates MIME against supported types', () => {
  assert.doesNotThrow(() => validateMimeType('application/pdf', ['application/pdf']));
  assert.throws(() => validateMimeType('application/octet-stream', ['application/pdf']), /Unsupported file type/i);
});

test('allows supported extensions', () => {
  assert.equal(isAllowedExtension('report.pdf'), true);
  assert.equal(isAllowedExtension('report.docx'), true);
  assert.equal(isAllowedExtension('report.jpg'), true);
  assert.equal(isAllowedExtension('report.exe'), false);
});

test('creates safe filenames', () => {
  assert.equal(sanitizeFilename('My Important Document (Final).pdf'), 'My Important Document (Final)-cleaned.pdf');
  assert.equal(sanitizeFilename('photo.jpg'), 'photo-cleaned.jpg');
  assert.equal(sanitizeFilename('../unsafe.pdf'), 'unsafe-cleaned.pdf');
});

test('exposes the supported MIME map', () => {
  const map = getSupportedMimeTypes();
  assert.equal(map.pdf.includes('application/pdf'), true);
  assert.equal(map.docx.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document'), true);
});
