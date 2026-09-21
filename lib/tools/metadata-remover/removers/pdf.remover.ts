import { access, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PDFDocument } from "pdf-lib";

import { getQpdfPath, PROCESSING_TIMEOUT_MS } from "../constants.ts";
import { MetadataRemovalError, ProcessorUnavailableError, VerificationFailedError } from "../errors.ts";
import type { MetadataRemovalResult } from "../types.ts";

const execFileAsync = promisify(execFile);

export class PdfMetadataRemover {
  async remove(inputPath: string, outputPath: string): Promise<MetadataRemovalResult> {
    const qpdfPath = getQpdfPath();
    if (!qpdfPath) {
      throw new ProcessorUnavailableError("PDF processing requires qpdf.");
    }

    try {
      await access(inputPath);
      await execFileAsync(qpdfPath, ["--remove-info", "--remove-metadata", inputPath, outputPath], { timeout: PROCESSING_TIMEOUT_MS });

      await access(outputPath);
      const qpdfBytes = await readFile(outputPath);
      const document = await PDFDocument.load(qpdfBytes, { updateMetadata: false });
      const context = (document as unknown as { context: { trailerInfo: { Info?: unknown } } }).context;
      context.trailerInfo.Info = undefined;
      const bytes = Buffer.from(await document.save({ useObjectStreams: false }));
      await writeFile(outputPath, bytes);
      if (!bytes.length || bytes.toString("latin1").includes("%%EOF") === false) {
        throw new VerificationFailedError();
      }

      return {
        success: true,
        verified: true,
        removedCount: 1,
        remainingMetadata: [],
      };
    } catch (error) {
      if (error instanceof VerificationFailedError) {
        throw error;
      }
      throw new MetadataRemovalError();
    }
  }
}
