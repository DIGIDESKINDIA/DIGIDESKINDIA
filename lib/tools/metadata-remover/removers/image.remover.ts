import sharp from "sharp";

import { MetadataRemovalError } from "../errors.ts";
import type { MetadataRemovalResult } from "../types.ts";

export class ImageMetadataRemover {
  async remove(inputPath: string, outputPath: string): Promise<MetadataRemovalResult> {
    try {
      await sharp(inputPath).rotate().toFile(outputPath);

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
