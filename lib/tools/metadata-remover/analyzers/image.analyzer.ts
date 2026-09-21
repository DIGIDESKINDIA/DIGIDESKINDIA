import sharp from "sharp";
import { readFile } from "node:fs/promises";

import { InvalidFileError } from "../errors.ts";
import { normalizeMetadataValue } from "../validation.ts";
import type { MetadataAnalysis, MetadataItem, SupportedFileType } from "../types.ts";

export class ImageMetadataAnalyzer {
  canHandle(type: SupportedFileType): boolean {
    return type === "jpg" || type === "jpeg" || type === "png";
  }

  async analyze(inputPath: string): Promise<MetadataAnalysis> {
    try {
      const bytes = await readFile(inputPath);
      const image = sharp(inputPath);
      const metadata = await image.metadata();
      const items: MetadataItem[] = [];

      if (metadata.exif) {
        items.push({ category: "EXIF", key: "EXIF", value: "present", sensitive: true });
        items.push(...parseExif(bytes));
      }
      if (metadata.xmp || bytes.includes(Buffer.from("http://ns.adobe.com/xap/1.0/"))) {
        items.push({ category: "XMP", key: "XMP", value: "present", sensitive: true });
      }
      if (metadata.icc) {
        items.push({ category: "ICC", key: "ICC", value: "present", sensitive: false });
      }
      if (typeof (metadata as { software?: string | null }).software === "string") {
        items.push({ category: "Software", key: "Software", value: normalizeMetadataValue((metadata as unknown as { software: string }).software), sensitive: true });
      }
      if (typeof (metadata as { orientation?: number | null }).orientation === "number") {
        items.push({ category: "EXIF", key: "Orientation", value: String((metadata as { orientation: number }).orientation), sensitive: true });
      }
      if (metadata.format === "png") {
        items.push(...parsePngText(bytes));
      }

      return {
        hasMetadata: items.length > 0,
        count: items.length,
        items,
        truncated: false,
      };
    } catch {
      throw new InvalidFileError();
    }
  }
}

function parsePngText(bytes: Buffer): MetadataItem[] {
  const items: MetadataItem[] = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "tEXt") {
      const separator = data.indexOf(0);
      if (separator > 0) {
        items.push({ category: "PNG Text", key: data.toString("latin1", 0, separator), value: normalizeMetadataValue(data.toString("latin1", separator + 1)), sensitive: true });
      }
    }
    if (type === "iTXt") {
      const separator = data.indexOf(0);
      if (separator > 0) {
        const rest = data.subarray(separator + 1);
        const first = rest.indexOf(0);
        const second = first < 0 ? -1 : rest.indexOf(0, first + 1);
        const third = second < 0 ? -1 : rest.indexOf(0, second + 1);
        const textStart = third < 0 ? -1 : third + 1;
        if (textStart >= 0) items.push({ category: "PNG Text", key: data.toString("latin1", 0, separator), value: normalizeMetadataValue(data.toString("utf8", separator + 1 + textStart)), sensitive: true });
      }
    }
    offset += 12 + length;
    if (type === "IEND") break;
  }
  return items;
}

function parseExif(bytes: Buffer): MetadataItem[] {
  const marker = Buffer.from("Exif\0\0", "ascii");
  const start = bytes.indexOf(marker);
  if (start < 0) return [];
  const tiff = start + marker.length;
  if (tiff + 8 > bytes.length) return [];
  const littleEndian = bytes.toString("ascii", tiff, tiff + 2) === "II";
  const read16 = (position: number) => littleEndian ? bytes.readUInt16LE(position) : bytes.readUInt16BE(position);
  const read32 = (position: number) => littleEndian ? bytes.readUInt32LE(position) : bytes.readUInt32BE(position);
  const items: MetadataItem[] = [];
  const tagNames: Record<number, [string, string]> = {
    0x010f: ["Make", "Camera"],
    0x0110: ["Model", "Camera"],
    0x0131: ["Software", "Software"],
    0x013b: ["Artist", "EXIF"],
  };

  function readIfd(relativeOffset: number, isGps = false): void {
    const ifd = tiff + relativeOffset;
    if (ifd < tiff || ifd + 2 > bytes.length) return;
    const count = Math.min(read16(ifd), 128);
    for (let index = 0; index < count; index += 1) {
      const entry = ifd + 2 + index * 12;
      if (entry + 12 > bytes.length) break;
      const tag = read16(entry);
      if (tag === 0x8825) {
        readIfd(read32(entry + 8), true);
        items.push({ category: "GPS", key: "GPS", value: "present", sensitive: true });
        continue;
      }
      const named = tagNames[tag];
      if (!named && !isGps) continue;
      const type = read16(entry + 2);
      const countValue = read32(entry + 4);
      if (type !== 2 || countValue === 0) continue;
      const valueOffset = countValue <= 4 ? entry + 8 : tiff + read32(entry + 8);
      if (valueOffset < 0 || valueOffset + countValue > bytes.length) continue;
      const value = bytes.toString("utf8", valueOffset, valueOffset + countValue).replace(/\0+$/, "").trim();
      if (value && named) items.push({ category: named[1], key: named[0], value: normalizeMetadataValue(value), sensitive: true });
    }
  }

  try {
    readIfd(read32(tiff + 4));
  } catch {
    return items;
  }
  return items;
}
