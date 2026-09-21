export type SupportedFileType = "pdf" | "docx" | "xlsx" | "pptx" | "jpg" | "jpeg" | "png";

export interface MetadataItem {
  category: string;
  key: string;
  value: string;
  sensitive: boolean;
}

export interface MetadataAnalysis {
  hasMetadata: boolean;
  count: number;
  items: MetadataItem[];
  truncated: boolean;
  total?: number;
  shown?: number;
}

export interface MetadataRemovalResult {
  success: boolean;
  verified: boolean;
  removedCount: number;
  remainingMetadata: MetadataItem[];
}

export interface MetadataFileInfo {
  name: string;
  type: SupportedFileType;
  size: number;
  mimeType: string;
}

export interface JobState {
  jobId: string;
  createdAt: string;
  expiresAt: string;
  fileName: string;
  fileType: SupportedFileType;
  mimeType: string;
  originalSize: number;
  inputPath: string;
  outputPath?: string;
  outputName?: string;
  downloadToken?: string;
  downloadUrl?: string;
  analysis?: MetadataAnalysis;
  removal?: MetadataRemovalResult;
  status: "created" | "analyzed" | "removed" | "downloaded" | "failed";
  verified?: boolean;
}
