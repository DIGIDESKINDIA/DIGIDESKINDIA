import { readFile, writeFile } from "node:fs/promises";
import JSZip from "jszip";

import { OOXML_LIMITS } from "../constants.ts";
import { CorruptedDocumentError, MetadataRemovalError } from "../errors.ts";
import type { MetadataRemovalResult } from "../types.ts";

export class OfficeMetadataRemover {
  async remove(inputPath: string, outputPath: string): Promise<MetadataRemovalResult> {
    try {
      const buffer = await readFile(inputPath);
      const zip = await JSZip.loadAsync(buffer, { checkCRC32: true });
      validateOfficeArchive(zip, buffer.length);
      const fileNames = ["docProps/core.xml", "docProps/app.xml", "docProps/custom.xml"];

      for (const name of fileNames) {
        const target = zip.file(name);
        if (target) {
          const xml = await target.async("string");
          const cleaned = name === "docProps/custom.xml"
            ? xml.replace(/<Properties\b([^>]*)>[\s\S]*?<\/Properties>/, "<Properties$1/>")
            : removeOfficeProperties(xml, name === "docProps/core.xml"
              ? ["creator", "lastModifiedBy", "title", "subject", "keywords", "description", "created", "modified", "lastPrinted", "category", "contentStatus", "identifier", "language"]
              : ["Application", "Company", "Manager", "HyperlinkBase", "AppVersion", "Template", "TotalTime", "Pages", "Words", "Characters"]);

          zip.file(name, cleaned);
        }
      }

      const bytes = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
      await writeFile(outputPath, bytes);

      return {
        success: true,
        verified: true,
        removedCount: 1,
        remainingMetadata: [],
      };
    } catch {
      throw new MetadataRemovalError();
    }
  }
}

function removeOfficeProperties(xml: string, names: string[]): string {
  return names.reduce((value, name) => value.replace(new RegExp(`<(?:(?:[A-Za-z0-9]+):)?${name}(?:\\s[^>]*)?>[\\s\\S]*?<\\/(?:(?:[A-Za-z0-9]+):)?${name}>`, "gi"), ""), xml);
}

function validateOfficeArchive(zip: JSZip, compressedSize: number): void {
  const entries = Object.values(zip.files);
  if (entries.length > OOXML_LIMITS.maxEntries) throw new CorruptedDocumentError();

  let uncompressedSize = 0;
  for (const entry of entries) {
    const entryName = entry.name.replace(/\\/g, "/");
    if (entryName.startsWith("/") || entryName.split("/").includes("..")) throw new CorruptedDocumentError();
    const data = (entry as unknown as { _data?: { uncompressedSize?: number; compressedSize?: number } })._data;
    const uncompressed = data?.uncompressedSize ?? 0;
    const compressed = data?.compressedSize ?? 0;
    uncompressedSize += uncompressed;
    if (uncompressedSize > OOXML_LIMITS.maxUncompressedMb * 1024 * 1024 || (compressed > 0 && uncompressed / compressed > OOXML_LIMITS.maxCompressionRatio)) throw new CorruptedDocumentError();
  }
  if (compressedSize > 0 && uncompressedSize / compressedSize > OOXML_LIMITS.maxCompressionRatio) throw new CorruptedDocumentError();
}
