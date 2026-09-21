import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const STORAGE_DIR = path.join(process.cwd(), "storage", "redactions");

export interface RedactionJobFile {
  token: string;
  fileName: string;
  bytes: Uint8Array;
  createdAt: number;
}

export async function createRedactionJob(fileName: string, bytes: Uint8Array): Promise<string> {
  await mkdir(STORAGE_DIR, { recursive: true });
  const token = crypto.randomUUID();
  const target = path.join(STORAGE_DIR, `${token}.pdf`);
  await writeFile(target, Buffer.from(bytes));
  return token;
}

export async function getRedactionJob(token: string): Promise<RedactionJobFile | null> {
  const target = path.join(STORAGE_DIR, `${token}.pdf`);

  try {
    const bytes = await readFile(target);
    return {
      token,
      fileName: `${token}-redacted.pdf`,
      bytes: new Uint8Array(bytes),
      createdAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export async function deleteRedactionJob(token: string): Promise<void> {
  const target = path.join(STORAGE_DIR, `${token}.pdf`);
  try {
    await unlink(target);
  } catch {
    // Ignore cleanup failures.
  }
}
