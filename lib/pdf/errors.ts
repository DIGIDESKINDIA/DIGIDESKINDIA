/* ==========================================
   DigiDesk India PDF Engine
   Error Classes v1
========================================== */

export class PdfEngineError extends Error {
  public readonly statusCode: number;

  public readonly code: string;

  constructor(
    message: string,
    statusCode = 500,
    code = "PDF_ENGINE_ERROR"
  ) {
    super(message);

    this.name = "PdfEngineError";

    this.statusCode = statusCode;

    this.code = code;

    Error.captureStackTrace?.(
      this,
      this.constructor
    );
  }
}

export class ValidationError extends PdfEngineError {
  constructor(message: string) {
    super(
      message,
      400,
      "VALIDATION_ERROR"
    );
  }
}

export class UnsupportedPdfError extends PdfEngineError {
  constructor(
    message = "Unsupported or corrupted PDF file."
  ) {
    super(
      message,
      422,
      "UNSUPPORTED_PDF"
    );
  }
}

export class PasswordProtectedPdfError extends PdfEngineError {
  constructor() {
    super(
      "Password protected PDF is not supported for this operation.",
      401,
      "PASSWORD_PROTECTED_PDF"
    );
  }
}

export class EmptyPdfError extends PdfEngineError {
  constructor() {
    super(
      "PDF does not contain any pages.",
      422,
      "EMPTY_PDF"
    );
  }
}

export class InvalidPageError extends PdfEngineError {
  constructor(page: number) {
    super(
      `Invalid page number: ${page}.`,
      422,
      "INVALID_PAGE"
    );
  }
}

export class DuplicateFileError extends PdfEngineError {
  constructor(fileName: string) {
    super(
      `Duplicate file detected: "${fileName}".`,
      409,
      "DUPLICATE_FILE"
    );
  }
}

export class FileLimitExceededError extends PdfEngineError {
  constructor(limit: number) {
    super(
      `Maximum ${limit} PDF files are allowed.`,
      413,
      "FILE_LIMIT_EXCEEDED"
    );
  }
}

export class FileTooLargeError extends PdfEngineError {
  constructor(fileName: string) {
    super(
      `"${fileName}" exceeds the allowed file size.`,
      413,
      "FILE_TOO_LARGE"
    );
  }
}

export class MergePdfError extends PdfEngineError {
  constructor(
    message = "Unable to merge PDF files."
  ) {
    super(
      message,
      500,
      "MERGE_FAILED"
    );
  }
}

export class SplitPdfError extends PdfEngineError {
  constructor(
    message = "Unable to split PDF."
  ) {
    super(
      message,
      500,
      "SPLIT_FAILED"
    );
  }
}

export class RotatePdfError extends PdfEngineError {
  constructor(
    message = "Unable to rotate PDF."
  ) {
    super(
      message,
      500,
      "ROTATE_FAILED"
    );
  }
}

export class WatermarkPdfError extends PdfEngineError {
  constructor(
    message = "Unable to apply watermark."
  ) {
    super(
      message,
      500,
      "WATERMARK_FAILED"
    );
  }
}

export class CompressionError extends PdfEngineError {
  constructor(
    message = "Unable to compress PDF."
  ) {
    super(
      message,
      500,
      "COMPRESS_FAILED"
    );
  }
}