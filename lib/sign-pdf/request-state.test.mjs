import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('./request-state.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const moduleRecord = { exports: {} };
new Function('exports', 'module', compiled)(moduleRecord.exports, moduleRecord);
const { canTransitionRequestState, evaluateRequestStatus } = moduleRecord.exports;

test('request lifecycle permits draft send and cancellation', () => {
  assert.equal(canTransitionRequestState('draft', 'sent'), true);
  assert.equal(canTransitionRequestState('draft', 'cancelled'), true);
  assert.equal(canTransitionRequestState('completed', 'sent'), false);
});

test('sequential progress becomes in_progress before completion', () => {
  assert.equal(evaluateRequestStatus({ totalSigners: 2, signedSigners: 0, currentStatus: 'sent' }), 'sent');
  assert.equal(evaluateRequestStatus({ totalSigners: 2, signedSigners: 1, currentStatus: 'sent' }), 'in_progress');
  assert.equal(evaluateRequestStatus({ totalSigners: 2, signedSigners: 2, currentStatus: 'in_progress' }), 'completed');
});

test('parallel requests complete when all independent signers finish', () => {
  assert.equal(evaluateRequestStatus({ totalSigners: 3, signedSigners: 1, currentStatus: 'sent' }), 'in_progress');
  assert.equal(evaluateRequestStatus({ totalSigners: 3, signedSigners: 3, currentStatus: 'in_progress' }), 'completed');
});

test('terminal requests remain terminal', () => {
  assert.equal(evaluateRequestStatus({ totalSigners: 2, signedSigners: 0, currentStatus: 'cancelled' }), 'cancelled');
  assert.equal(evaluateRequestStatus({ totalSigners: 2, signedSigners: 2, currentStatus: 'expired' }), 'expired');
});
