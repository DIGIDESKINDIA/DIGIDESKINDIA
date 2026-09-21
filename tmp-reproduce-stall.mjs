import fs from "fs";
const source = "storage/uploads/2f76964c-33ce-46fa-93b0-bc418cbff935-multi-page.pdf";
const form = new FormData();
form.append("file", new Blob([fs.readFileSync(source)], { type: "application/pdf" }), "real-five-page.pdf");
const started = performance.now();
const response = await fetch("http://localhost:3001/api/pdf/pdf-to-pptx?async=1", { method: "POST", body: form });
const body = await response.json();
console.log("START", response.status, body.jobId);
const states = [];
for (let i = 0; i < 600; i += 1) {
  const status = await fetch(`http://localhost:3001/api/pdf/pdf-to-pptx/status?id=${body.jobId}`, { cache: "no-store" });
  const data = await status.json();
  if (data.job) {
    const key = `${data.job.phase}:${data.job.currentPage}:${data.job.progress}`;
    if (!states.some((entry) => entry.key === key)) states.push({ key, phase: data.job.phase, page: data.job.currentPage, total: data.job.totalPages, progress: data.job.progress, message: data.job.message });
    if (data.job.status === "completed") break;
    if (data.job.status === "failed") break;
  }
  await new Promise((resolve) => globalThis.setTimeout(resolve, 100));
}
const result = await fetch(`http://localhost:3001/api/pdf/pdf-to-pptx/result?id=${body.jobId}`);
console.log("DONE", JSON.stringify({ elapsedMs: Math.round(performance.now() - started), resultStatus: result.status, bytes: (await result.arrayBuffer()).byteLength, states }));
