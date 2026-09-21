import test from 'node:test';
import assert from 'node:assert/strict';

import { mapViewerToPdf, validateRedactionRectangle } from './redaction-utils.ts';

test('validates redaction rectangles within page bounds', () => {
  assert.doesNotThrow(() => validateRedactionRectangle({ x: 10, y: 20, width: 50, height: 30 }, 200, 300));
  assert.throws(() => validateRedactionRectangle({ x: -1, y: 20, width: 50, height: 30 }, 200, 300), /within/i);
  assert.throws(() => validateRedactionRectangle({ x: 10, y: 20, width: 500, height: 30 }, 200, 300), /within/i);
});

test('maps browser coordinates into PDF page coordinates', () => {
  const pdfPoint = mapViewerToPdf({
    pageWidth: 612,
    pageHeight: 792,
    containerWidth: 612,
    containerHeight: 792,
    x: 200,
    y: 300,
    zoom: 1,
    rotation: 0,
  });

  assert.equal(Math.round(pdfPoint.x), 200);
  assert.equal(Math.round(pdfPoint.y), 300);
});

test('scales coordinates consistently for zoomed viewers', () => {
  const pdfPoint = mapViewerToPdf({
    pageWidth: 612,
    pageHeight: 792,
    containerWidth: 1224,
    containerHeight: 1584,
    x: 400,
    y: 600,
    zoom: 2,
    rotation: 0,
  });

  assert.equal(Math.round(pdfPoint.x), 200);
  assert.equal(Math.round(pdfPoint.y), 300);
});
