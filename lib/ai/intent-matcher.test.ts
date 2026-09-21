import test from "node:test";
import assert from "node:assert/strict";

import { resolveDigiDeskIntent } from "./intent-matcher.ts";

test("matches compress pdf request to the real compress PDF tool", () => {
  const result = resolveDigiDeskIntent("Compress PDF");

  assert.equal(result?.serviceId, "pdf-compress");
  assert.ok(result?.service.route.startsWith("/pdf-tools/"));
});

test("matches Hindi/Hinglish compress request", () => {
  const result = resolveDigiDeskIntent("pdf ko chhota karna hai");

  assert.equal(result?.serviceId, "pdf-compress");
});

test("matches PAN card query to government service", () => {
  const result = resolveDigiDeskIntent("PAN card ka form kaise bharein");

  assert.equal(result?.serviceId, "government-pan-card");
});

test("returns null for unknown requests", () => {
  const result = resolveDigiDeskIntent("How do I build a rocket?");

  assert.equal(result, null);
});
