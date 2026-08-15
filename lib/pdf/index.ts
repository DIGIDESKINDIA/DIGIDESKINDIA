export * from "./types";

export { compressPDF } from "./compress";
export { decryptPDF } from "./decrypt";
export { encryptPDF } from "./encrypt";
export { extractPDF, extractAllPages } from "./extract";
export {
  mergePDF,
  mergeMetadata,
  validateMergeFiles,
  mergePdfBuffers,
} from "./merge";
export { generateThumbnail, generateAllThumbnails } from "./thumbnails";
export { getPdfPreview } from "./preview";
export { protectPdf } from "./protect";
export { pdfToImages } from "./pdf-to-image";
export { getPdfThumbnailInfo } from "./thumbnail";
export { rotatePDF, rotateAllPages, rotateSinglePage } from "./rotate";
export { splitPDF, parseRanges } from "./split";
export { addWatermark, validateWatermark, watermarkPDF } from "./watermark";
export {
  officeConverter,
  officeFormats,
  officeFormatLabels,
  detectOfficeType,
  officeMetadata,
} from "./convert/office";
export { imageToPDF } from "./convert/image";
export {
  PdfEngineError,
  ValidationError,
  UnsupportedPdfError,
  PasswordProtectedPdfError,
  EmptyPdfError,
  InvalidPageError,
  DuplicateFileError,
  FileLimitExceededError,
  FileTooLargeError,
  MergePdfError,
  SplitPdfError,
  RotatePdfError,
  WatermarkPdfError,
  CompressionError,
} from "./errors";

export async function convertHTMLToPDF(_options?: unknown) {
  return {
    success: false,
    message: "HTML to PDF conversion is not available in this build.",
  };
}

export async function convertPDFToImage(_options?: unknown) {
  return {
    success: false,
    message: "PDF to image conversion is not available in this build.",
  };
}