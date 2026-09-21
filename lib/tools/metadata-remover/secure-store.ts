import crypto from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { JobState } from "./types.ts";

export function getJobRootDir(): string {
  const configured = process.env.METADATA_TEMP_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(os.tmpdir(), "metadata-remover");
}

export async function createJobDirectory(): Promise<{ jobId: string; dir: string; inputDir: string; outputDir: string; analysisDir: string }> {
  const base = getJobRootDir();
  await mkdir(base, { recursive: true });

  const jobId = crypto.randomUUID();
  const dir = path.join(base, jobId);
  const inputDir = path.join(dir, "input");
  const outputDir = path.join(dir, "output");
  const analysisDir = path.join(dir, "analysis");

  await mkdir(inputDir, { recursive: true, mode: 0o700 });
  await mkdir(outputDir, { recursive: true, mode: 0o700 });
  await mkdir(analysisDir, { recursive: true, mode: 0o700 });

  return { jobId, dir, inputDir, outputDir, analysisDir };
}

export async function writeJobState(jobDir: string, data: JobState): Promise<void> {
  await writeFile(path.join(jobDir, "state.json"), JSON.stringify(data, null, 2), { mode: 0o600 });
}

export async function readJobState(jobDir: string): Promise<JobState> {
  const state = await readFile(path.join(jobDir, "state.json"), "utf8");
  return JSON.parse(state) as JobState;
}

export async function deleteJob(jobDir: string): Promise<void> {
  await rm(jobDir, { recursive: true, force: true });
}

export async function cleanupExpiredJobs(): Promise<number> {
  const root = getJobRootDir();
  let deleted = 0;

  try {
    const entries = await readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(root, entry.name);
      try {
        const state = await readJobState(dir);
        if (new Date(state.expiresAt).getTime() <= Date.now()) {
          await deleteJob(dir);
          deleted += 1;
        }
      } catch {
        await deleteJob(dir);
        deleted += 1;
      }
    }
  } catch {
    return 0;
  }

  return deleted;
}

export async function findJobByToken(token: string): Promise<{ jobDir: string; state: JobState } | null> {
  const root = getJobRootDir();
  try {
    const entries = await readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(root, entry.name);
      try {
        const state = await readJobState(dir);
        if (state.downloadToken === token) {
          return { jobDir: dir, state };
        }
      } catch {
        // ignore stale jobs
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function ensureExpiringJob(jobDir: string, minutes: number): Promise<string> {
  const state = await readJobState(jobDir);
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  const next = { ...state, expiresAt };
  await writeJobState(jobDir, next);
  return expiresAt;
}

export async function getFileStats(filePath: string): Promise<{ size: number; mtimeMs: number }> {
  const stats = await stat(filePath);
  return { size: stats.size, mtimeMs: stats.mtimeMs };
}
