import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLinkedPageIndexes,
  generateSecureToken,
  validateRequestPayload,
} from './request-helpers.mjs';

test('buildLinkedPageIndexes supports all common placement modes', () => {
  assert.deepEqual(buildLinkedPageIndexes({ pageCount: 5, pageIndex: 2, mode: 'single' }), [2]);
  assert.deepEqual(buildLinkedPageIndexes({ pageCount: 5, pageIndex: 2, mode: 'all' }), [0, 1, 2, 3, 4]);
  assert.deepEqual(buildLinkedPageIndexes({ pageCount: 5, pageIndex: 2, mode: 'last' }), [4]);
  assert.deepEqual(buildLinkedPageIndexes({ pageCount: 5, pageIndex: 2, mode: 'all-but-last' }), [0, 1, 2, 3]);
  assert.deepEqual(buildLinkedPageIndexes({ pageCount: 5, pageIndex: 2, mode: 'range', range: [1, 3] }), [1, 2, 3]);
});

test('generateSecureToken creates a high-entropy token', () => {
  const token = generateSecureToken();
  assert.equal(typeof token, 'string');
  assert.ok(token.length >= 32);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
});

test('validateRequestPayload rejects invalid signers and empty required assignments', () => {
  const result = validateRequestPayload({
    title: 'Contract',
    signers: [
      { id: 's1', name: 'Alice', email: 'alice@example.com', role: 'Approver', color: '#22c55e' },
      { id: 's2', name: 'Bob', email: 'not-an-email', role: 'Reviewer', color: '#f59e0b' },
    ],
    fields: [
      { id: 'f1', type: 'signature', pageIndex: 0, x: 0.2, y: 0.2, width: 0.2, height: 0.1, required: true },
    ],
    settings: { signingMode: 'sequential' },
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /invalid email|required/i);
});
