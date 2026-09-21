import { mkdtemp, readFile, rm, unlink, writeFile } from "fs/promises";
import os from "os";
import path from "path";

import { decryptPDF } from "@/lib/pdf/decrypt";
import { encryptPDF } from "@/lib/pdf/encrypt";
import {
  protectPdf as protectWithAdobe,
  unlockPdf as unlockWithAdobe,
} from "@/lib/pdf/adobe-services";

const PDF_WORKER_URL = process.env.PDF_WORKER_URL?.trim();

function nativeUnavailable(error: unknown) {
  return /ENOENT|not found|not recognized/i.test(
    error instanceof Error ? error.message : String(error)
  );
}

function providerConfigured() {
  return Boolean(
    process.env.PDF_SERVICES_CLIENT_ID?.trim() &&
      process.env.PDF_SERVICES_CLIENT_SECRET?.trim()
  );
}

async function withTempInput<T>(
  input: Uint8Array,
  operation: (inputPath: string) => Promise<T>
) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "digidesk-pdf-"));
  const inputPath = path.join(directory, "input.pdf");

  try {
    await writeFile(inputPath, input);
    return await operation(inputPath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function runNative(
  input: Uint8Array,
  password: string,
  mode: "protect" | "unlock"
) {
  return withTempInput(input, async (inputPath) => {
    const result = mode === "protect"
      ? await encryptPDF({
          file: { name: "input.pdf", path: inputPath, size: input.byteLength },
          password,
        })
      : await decryptPDF({
          file: { name: "input.pdf", path: inputPath, size: input.byteLength },
          password,
        });

    if (!result.success || !result.outputPath) {
      throw new Error(result.message);
    }

    try {
      return await readFile(result.outputPath);
    } finally {
      await unlink(result.outputPath).catch(() => undefined);
    }
  });
}

async function runWorker(
  input: Uint8Array,
  password: string,
  mode: "protect" | "unlock"
) {
  if (!PDF_WORKER_URL) {
    return null;
  }

  const form = new FormData();
  form.append(
    "file",
    new Blob([input as unknown as ArrayBuffer], {
      type: "application/pdf",
    }),
    "input.pdf"
  );
  form.append("password", password);

  const response = await fetch(`${PDF_WORKER_URL}/${mode}`, {
    method: "POST",
    body: form,
    cache: "no-store",
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return new Uint8Array(await response.arrayBuffer());
}

export async function protectPdfWithFallback(
  input: Uint8Array,
  password: string
) {
  try {
    return await runNative(input, password, "protect");
  } catch (error) {
    if (!nativeUnavailable(error)) {
      throw error;
    }
  }

  try {
    const workerResult = await runWorker(input, password, "protect");
    if (workerResult) {
      return workerResult;
    }
  } catch {
    // Continue to the configured provider.
  }

  if (!providerConfigured()) {
    throw new Error(
      "PDF protection requires qpdf installed locally or configured Adobe PDF credentials."
    );
  }

  return protectWithAdobe(input, password);
}

export async function unlockPdfWithFallback(
  input: Uint8Array,
  password: string
) {
  try {
    return await runNative(input, password, "unlock");
  } catch (error) {
    if (!nativeUnavailable(error)) {
      throw error;
    }
  }

  try {
    const workerResult = await runWorker(input, password, "unlock");
    if (workerResult) {
      return workerResult;
    }
  } catch {
    // Continue to the configured provider.
  }

  if (!providerConfigured()) {
    throw new Error(
      "PDF unlocking requires qpdf installed locally or configured Adobe PDF credentials."
    );
  }

  return unlockWithAdobe(input, password);
}