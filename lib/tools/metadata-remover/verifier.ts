import { access } from "node:fs/promises";

import { PdfMetadataAnalyzer } from "./analyzers/pdf.analyzer.ts";
import { OfficeMetadataAnalyzer } from "./analyzers/office.analyzer.ts";
import { ImageMetadataAnalyzer } from "./analyzers/image.analyzer.ts";
import { VerificationFailedError } from "./errors.ts";
import type { MetadataAnalysis, MetadataItem, SupportedFileType } from "./types.ts";

export class MetadataVerifier {
  async verifyCleanFile(filePath: string, fileType: SupportedFileType): Promise<{ verified: boolean; remainingMetadata: MetadataItem[]; removedCount: number }> {
    try {
      await access(filePath);
      let analysis: MetadataAnalysis;

      if (fileType === "pdf") {
        analysis = await new PdfMetadataAnalyzer().analyze(filePath);
      } else if (fileType === "docx" || fileType === "xlsx" || fileType === "pptx") {
        analysis = await new OfficeMetadataAnalyzer().analyze(filePath);
      } else {
        analysis = await new ImageMetadataAnalyzer().analyze(filePath);
      }

      const remainingMetadata = analysis.items ?? [];
      const isVerified = !analysis.hasMetadata && remainingMetadata.length === 0;
      if (!isVerified) {
        throw new VerificationFailedError();
      }

      return {
        verified: true,
        remainingMetadata: [],
        removedCount: 0,
      };
    } catch (error) {
      if (error instanceof VerificationFailedError) {
        return {
          verified: false,
          remainingMetadata: [],
          removedCount: 0,
        };
      }
      throw error;
    }
  }
}
