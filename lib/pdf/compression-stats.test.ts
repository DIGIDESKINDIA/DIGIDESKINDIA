import test from "node:test";
import assert from "node:assert/strict";

import { computeCompressionStats } from "./compression-stats.ts";

test("computeCompressionStats follows actual output data and avoids invented reduction math", () => {
  const stats = computeCompressionStats(380 * 1024, 357 * 1024);

  assert.equal(stats.originalSize, 380 * 1024);
  assert.equal(stats.compressedSize, 357 * 1024);
  assert.equal(stats.savedBytes, 23 * 1024);
  assert.equal(stats.reductionPercent, 6.05);
  assert.equal(stats.isReduced, true);
  assert.equal(stats.isLargerThanOriginal, false);
});

test("computeCompressionStats preserves original when the compressed result is larger", () => {
  const stats = computeCompressionStats(100, 110);

  assert.equal(stats.savedBytes, 0);
  assert.equal(stats.reductionPercent, 0);
  assert.equal(stats.isReduced, false);
  assert.equal(stats.isLargerThanOriginal, true);
});
