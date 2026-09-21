import { readFile } from "node:fs/promises";
import JSZip from "jszip";

import { OOXML_LIMITS } from "../constants.ts";
import { CorruptedDocumentError, InvalidFileError } from "../errors.ts";
import { normalizeMetadataValue } from "../validation.ts";
import type { MetadataAnalysis, MetadataItem, SupportedFileType } from "../types.ts";

export class OfficeMetadataAnalyzer {
  canHandle(type: SupportedFileType): boolean {
    return type === "docx" || type === "xlsx" || type === "pptx";
  }

  async analyze(inputPath: string): Promise<MetadataAnalysis> {
    try {
      const buffer = await readFile(inputPath);
      const zip = await JSZip.loadAsync(buffer, { checkCRC32: true });
      validateOfficeArchive(zip, buffer.length);
      const metadata: MetadataItem[] = [];

      const xmlNames = ["docProps/core.xml", "docProps/app.xml", "docProps/custom.xml"];
      for (const name of xmlNames) {
        const file = zip.file(name);
        if (!file) continue;
        const xml = await file.async("string");
        const propertyNames = name === "docProps/core.xml"
          ? ["creator", "lastModifiedBy", "title", "subject", "keywords", "description", "created", "modified", "lastPrinted", "category", "contentStatus", "identifier", "language"]
          : ["Application", "Company", "Manager", "HyperlinkBase", "AppVersion", "Template", "TotalTime", "Pages", "Words", "Characters"];
        for (const key of propertyNames) {
          const match = xml.match(new RegExp(`<(?:[A-Za-z0-9]+:)?${key}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[A-Za-z0-9]+:)?${key}>`, "i"));
          const value = match?.[1];
          if (!value) continue;
          metadata.push({
            category: "Office Properties",
            key,
            value: normalizeMetadataValue(value.replace(/<[^>]+>/g, "").trim()),
            sensitive: ["creator", "lastModifiedBy", "title", "subject", "description", "company", "author"].includes(key.toLowerCase()),
          });
        }

        if (name === "docProps/custom.xml") {
          for (const match of xml.matchAll(/<property\b[^>]*\bname="([^"]+)"[^>]*>([\s\S]*?)<\/property>/g)) {
            const value = match[2].replace(/<[^>]+>/g, "").trim();
            if (value) {
              metadata.push({ category: "Custom Properties", key: match[1], value: normalizeMetadataValue(value), sensitive: true });
            }
          }
        }
      }

      return {
        hasMetadata: metadata.length > 0,
        count: metadata.length,
        items: metadata,
        truncated: false,
      };
    } catch (error) {
      if (error instanceof Error && /zip|crc|parse|xml/i.test(error.message)) {
        throw new CorruptedDocumentError();
      }
      throw new InvalidFileError();
    }
  }
}

function validateOfficeArchive(zip: JSZip, compressedSize: number): void {
  const entries = Object.values(zip.files);
  if (entries.length > OOXML_LIMITS.maxEntries) {
    throw new CorruptedDocumentError();
  }

  let uncompressedSize = 0;
  for (const entry of entries) {
    const entryName = entry.name.replace(/\\/g, "/");
    if (entryName.startsWith("/") || entryName.split("/").includes("..")) {
      throw new CorruptedDocumentError();
    }

    const data = (entry as unknown as { _data?: { uncompressedSize?: number; compressedSize?: number } })._data;
    const uncompressed = data?.uncompressedSize ?? 0;
    const compressed = data?.compressedSize ?? 0;
    uncompressedSize += uncompressed;
    if (uncompressedSize > OOXML_LIMITS.maxUncompressedMb * 1024 * 1024 || (compressed > 0 && uncompressed / compressed > OOXML_LIMITS.maxCompressionRatio)) {
      throw new CorruptedDocumentError();
    }
  }

  if (compressedSize > 0 && uncompressedSize / compressedSize > OOXML_LIMITS.maxCompressionRatio) {
    throw new CorruptedDocumentError();
  }
}
