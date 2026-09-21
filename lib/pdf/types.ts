export type ConvertFormat =
  | "pdf"
  | "docx"
  | "xlsx"
  | "pptx"
  | "jpg"
  | "jpeg"
  | "png"
  | "webp"
  | "html";

export interface ConvertFile {
  path: string;
  name: string;
  size: number;
}

export interface ConvertOptions {
  input: ConvertFile;
  outputFormat: ConvertFormat;
  outputName?: string;
}

export interface ConvertResult {
  success: boolean;
  outputPath?: string;
  outputName?: string;
  message: string;
  metadata?: Record<string, unknown>;
  errorCode?: string;
}

export interface PdfFile {
  id?: string;
  name: string;
  path?: string;
  size: number;
  type?: string;
  buffer?: Uint8Array | Buffer;
}

export type MergeFile = PdfFile;

export interface MergeOptions {
  files: MergeFile[];
  outputName?: string;
}

export interface PDFOperationResult {
  success: boolean;
  operation: string;
  outputPath?: string;
  outputName?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface CompressOptions {
  file: PdfFile;
  quality?: "low" | "medium" | "high";
}

export type CompressionQuality = NonNullable<CompressOptions["quality"]>;

export interface DecryptOptions {
  file: PdfFile;
  password: string;
}

export interface EncryptOptions {
  file: PdfFile;
  password?: string;
  ownerPassword?: string;
  permissions?: string[];
}

export interface ExtractOptions {
  file: PdfFile;
  pages: number[];
}

export interface ExtractPagesOptions {
  file: PdfFile;
  pages: number[];
}

export interface ThumbnailOptions {
  file: PdfFile;
  dpi?: number;
  format?: string;
}

export interface ProtectOptions {
  file: PdfFile;
  password: string;
}

export interface UnlockOptions {
  file: PdfFile;
  password: string;
}

export interface WatermarkOptions {
  file: PdfFile;
  text: string;
  fontSize?: number;
  opacity?: number;
  rotation?: number;
  imagePath?: string;
  color?: string;
  position?: string;
  pages?: string;
}

export interface PdfToImageOptions {
  file: PdfFile;
  format?: "png" | "jpeg" | "jpg";
  quality?: number;
  pages?: number[];
  scale?: number;
}

export interface DeletePagesOptions {
  file: PdfFile;
  pages: number[];
}

export interface ImageToPdfOptions {
  images: Array<{
    name: string;
    buffer: Uint8Array | ArrayBuffer;
  }>;
  pageSize?: "Auto" | "A4" | "Letter";
  margin?: number;
}

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  keywords?: string[];

  createdAt?: Date;
  modifiedAt?: Date;
}
export interface AddPageNumberOptions {
  file: PdfFile;
  pages?: number[];
  startFrom?: number;
  fontSize?: number;
  position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
  margins?: "narrow" | "default" | "wide";
  x?: number;
  y?: number;
}
export interface RotateOptions {
  file: PdfFile;
  angle: 90 | 180 | 270;
  pages?: number[];
}
export interface SplitOptions {
  file: PdfFile;
  ranges: string;
  pages?: number[];
  outputMode?: "single" | "multiple";
}