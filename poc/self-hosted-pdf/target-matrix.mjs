import { readFile } from "node:fs/promises";

const base = process.argv[2] ?? "http://localhost:8080";
const inputPath = process.argv[3] ?? "test-files/small.pdf";
const input = await readFile(inputPath);
const targets = [100, 200, 500, 1024, 2048].map(
  (value) => value * 1024
);

for (const targetBytes of targets) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([input], { type: "application/pdf" }),
    "matrix.pdf"
  );
  form.append("targetBytes", String(targetBytes));
  form.append("quality", "medium");

  const startedAt = performance.now();
  const response = await fetch(`${base}/compress`, {
    method: "POST",
    body: form,
  });
  const output = Buffer.from(await response.arrayBuffer());

  console.log(JSON.stringify({
    originalBytes: input.length,
    requestedTargetBytes: targetBytes,
    status: response.status,
    outputBytes: response.ok ? output.length : null,
    targetReached: response.headers.get("X-Target-Reached"),
    bestAchievable: response.headers.get("X-Best-Achievable"),
    attemptCount: response.headers.get("X-Attempt-Count"),
    strategy: response.headers.get("X-Compression-Strategy"),
    processingTimeMs: Math.round(performance.now() - startedAt),
    meaningful: input.length > targetBytes,
  }));
}