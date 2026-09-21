import crypto from "crypto";
import fs from "fs";
import path from "path";

import {
  pdfToPptx,
  pdfToPptxOutputName,
  type PdfToPptxProgress,
  type PdfToPptxResult,
} from "./pdf-to-pptx";
import type { PdfFile } from "./types";

const JOB_TTL_MS = 10 * 60 * 1000;
const JOB_STORAGE_DIR = path.join(process.cwd(), "storage", "pdf-to-pptx-jobs");

export type PdfToPptxJobState = PdfToPptxProgress & {
  jobId: string;
  outputName?: string;
  error?: string;
};

type JobRecord = {
  state: PdfToPptxJobState;
  result?: PdfToPptxResult;
  expiresAt: number;
  timer: ReturnType<typeof setTimeout>;
};

const jobs = new Map<string, JobRecord>();

function jobStatePath(jobId: string) {
  return path.join(JOB_STORAGE_DIR, `${jobId}.json`);
}

function jobResultPath(jobId: string) {
  return path.join(JOB_STORAGE_DIR, `${jobId}.pptx`);
}

function persistJob(record: JobRecord) {
  fs.mkdirSync(JOB_STORAGE_DIR, { recursive: true });
  fs.writeFileSync(jobStatePath(record.state.jobId), JSON.stringify({
    state: record.state,
    expiresAt: record.expiresAt,
    result: record.result ? { ...record.result, pptx: undefined } : undefined,
  }));
  if (record.result?.pptx) fs.writeFileSync(jobResultPath(record.state.jobId), Buffer.from(record.result.pptx));
}

function loadPersistedJob(jobId: string): JobRecord | null {
  try {
    const persisted = JSON.parse(fs.readFileSync(jobStatePath(jobId), "utf8")) as { state: PdfToPptxJobState; expiresAt: number; result?: PdfToPptxResult };
    if (!persisted.expiresAt || persisted.expiresAt <= Date.now()) return null;
    const resultBytes = fs.existsSync(jobResultPath(jobId)) ? fs.readFileSync(jobResultPath(jobId)) : undefined;
    return {
      state: persisted.state,
      expiresAt: persisted.expiresAt,
      result: persisted.result ? { ...persisted.result, pptx: resultBytes } : undefined,
      timer: setTimeout(() => jobs.delete(jobId), Math.max(1, persisted.expiresAt - Date.now())),
    };
  } catch {
    return null;
  }
}

function initialState(jobId: string, totalPages = 0): PdfToPptxJobState {
  return {
    jobId,
    status: "processing",
    phase: "loading",
    currentPage: 0,
    totalPages,
    progress: 1,
    message: "Reading PDF...",
  };
}

export function createPdfToPptxJob(file: PdfFile) {
  const jobId = crypto.randomUUID();
  const record: JobRecord = {
    state: initialState(jobId),
    expiresAt: Date.now() + JOB_TTL_MS,
    timer: setTimeout(() => jobs.delete(jobId), JOB_TTL_MS),
  };
  record.timer.unref?.();
  jobs.set(jobId, record);
  persistJob(record);

  void pdfToPptx({
    file,
    onProgress: (progress) => {
      const current = jobs.get(jobId);
      if (!current) return;
      current.state = { ...progress, jobId, outputName: current.state.outputName };
      if (progress.status === "completed") current.state.outputName = pdfToPptxOutputName(file.name);
      persistJob(current);
    },
  }).then((result) => {
    const current = jobs.get(jobId);
    if (!current) return;
    current.result = result;
    persistJob(current);
    if (!result.success) {
      current.state = {
        ...current.state,
        status: "failed",
        phase: "failed",
        progress: Math.min(current.state.progress, 99),
        message: result.message,
        error: result.message,
      };
      persistJob(current);
    }
  }).catch((error) => {
    const current = jobs.get(jobId);
    if (!current) return;
    current.state = {
      ...current.state,
      status: "failed",
      phase: "failed",
      progress: Math.min(current.state.progress, 99),
      message: error instanceof Error ? error.message : "PDF to PowerPoint conversion failed.",
      error: error instanceof Error ? error.message : "PDF to PowerPoint conversion failed.",
    };
    persistJob(current);
  });

  return jobId;
}

export function getPdfToPptxJob(jobId: string) {
  const record = loadPersistedJob(jobId) || jobs.get(jobId);
  if (!record || record.expiresAt <= Date.now()) {
    if (record) jobs.delete(jobId);
    return null;
  }
  jobs.set(jobId, record);
  return record;
}
