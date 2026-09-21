import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";

import { InvalidFileError, PasswordProtectedFileError } from "../errors.ts";
import { normalizeMetadataValue } from "../validation.ts";
import type { MetadataAnalysis, MetadataItem, SupportedFileType } from "../types.ts";

export class PdfMetadataAnalyzer {
  canHandle(type: SupportedFileType): boolean {
    return type === "pdf";
  }

  async analyze(inputPath: string): Promise<MetadataAnalysis> {
    try {
      const bytes = await readFile(inputPath);
      const text = bytes.toString("latin1");
      const metadata: MetadataItem[] = [];
      const document = await PDFDocument.load(bytes, { updateMetadata: false });

      const values: Array<[string, string | undefined]> = [
        ["Title", document.getTitle()],
        ["Author", document.getAuthor()],
        ["Subject", document.getSubject()],
        ["Keywords", document.getKeywords()],
        ["Creator", document.getCreator()],
        ["Producer", document.getProducer()],
        ["CreationDate", document.getCreationDate()?.toISOString()],
        ["ModDate", document.getModificationDate()?.toISOString()],
      ];
      for (const [key, value] of values) {
        if (value) {
          metadata.push({
            category: "PDF Info",
            key,
            value: normalizeMetadataValue(value),
            sensitive: ["Author", "Creator", "Title", "Subject"].includes(key),
          });
        }
      }

      if (/<x:xmpmeta\b|<rdf:RDF\b|\/Metadata\b/i.test(text)) {
        metadata.push({ category: "PDF XMP", key: "XMP", value: "present", sensitive: true });
      }

      const hasMetadata = metadata.length > 0;
      return {
        hasMetadata,
        count: metadata.length,
        items: metadata,
        truncated: false,
      };
    } catch (error) {
      if (error instanceof Error && /password|encrypted/i.test(error.message)) {
        throw new PasswordProtectedFileError();
      }
      throw new InvalidFileError();
    }
  }
}
