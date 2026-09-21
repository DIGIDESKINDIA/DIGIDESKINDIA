import assert from "node:assert/strict";
import test from "node:test";

import { getPdfWorkerSource } from "./pdf-worker.ts";

test("getPdfWorkerSource returns the correct CDN worker URL", () => {
  assert.equal(
    getPdfWorkerSource("6.2.108"),
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.2.108/pdf.worker.min.mjs"
  );
});
