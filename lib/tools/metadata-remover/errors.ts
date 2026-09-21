export class MetadataRemoverError extends Error {
  statusCode = 500;
  code = "METADATA_REMOVER_ERROR";

  constructor(message: string, code = "METADATA_REMOVER_ERROR", statusCode = 500) {
    super(message);
    this.name = "MetadataRemoverError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class UnsupportedFileTypeError extends MetadataRemoverError {
  constructor(message = "Unsupported file type.") {
    super(message, "UNSUPPORTED_FILE_TYPE", 400);
  }
}

export class FileTooLargeError extends MetadataRemoverError {
  constructor(message = "The uploaded file is too large.") {
    super(message, "FILE_TOO_LARGE", 413);
  }
}

export class InvalidFileError extends MetadataRemoverError {
  constructor(message = "The file appears to be corrupted or invalid.") {
    super(message, "INVALID_FILE", 400);
  }
}

export class CorruptedDocumentError extends MetadataRemoverError {
  constructor(message = "The uploaded file is corrupted or invalid.") {
    super(message, "CORRUPTED_DOCUMENT", 400);
  }
}

export class PasswordProtectedFileError extends MetadataRemoverError {
  constructor(message = "Password-protected PDFs cannot be processed without the correct password.") {
    super(message, "PASSWORD_PROTECTED", 400);
  }
}

export class ProcessingTimeoutError extends MetadataRemoverError {
  constructor(message = "The file could not be processed in time.") {
    super(message, "PROCESSING_TIMEOUT", 408);
  }
}

export class MetadataRemovalError extends MetadataRemoverError {
  constructor(message = "We could not safely remove the metadata from this file.") {
    super(message, "METADATA_REMOVAL_FAILED", 422);
  }
}

export class VerificationFailedError extends MetadataRemoverError {
  constructor(message = "Metadata removal could not be verified.") {
    super(message, "VERIFICATION_FAILED", 422);
  }
}

export class TemporaryStorageError extends MetadataRemoverError {
  constructor(message = "Temporary storage is unavailable.") {
    super(message, "TEMPORARY_STORAGE_ERROR", 500);
  }
}

export class ProcessorUnavailableError extends MetadataRemoverError {
  constructor(message = "This processor is currently unavailable.") {
    super(message, "PROCESSOR_UNAVAILABLE", 503);
  }
}
