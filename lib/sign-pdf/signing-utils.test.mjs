import test from 'node:test';
import assert from 'node:assert/strict';

import { convertNormalizedFieldToPdfRect, calculatePageIndexes } from './signing-utils.mjs';

test('convertNormalizedFieldToPdfRect maps page-relative coordinates into PDF coordinates', () => {
  const rect = convertNormalizedFieldToPdfRect({
    x: 0.1,
    y: 0.2,
    width: 0.25,
    height: 0.15,
  }, 595, 842);

  assert.ok(Math.abs(rect.x - 59.5) < 0.001);
  assert.ok(Math.abs(rect.y - 547.3) < 0.001);
  assert.ok(Math.abs(rect.width - 148.75) < 0.001);
  assert.ok(Math.abs(rect.height - 126.3) < 0.001);
});

test('calculatePageIndexes handles all-page and last-page placement rules', () => {
  assert.deepEqual(calculatePageIndexes({
    pageCount: 4,
    pageIndex: 0,
    mode: 'all'
  }), [0, 1, 2, 3]);

  assert.deepEqual(calculatePageIndexes({
    pageCount: 4,
    pageIndex: 1,
    mode: 'last'
  }), [3]);

  assert.deepEqual(calculatePageIndexes({
    pageCount: 4,
    pageIndex: 1,
    mode: 'all-but-last'
  }), [0, 1, 2]);
});
