# Metadata Remover

## Overview

The DigiDesk Metadata Remover is a server-side pipeline for removing metadata from PDF, Office Open XML, and image files while preserving the original document format and verifying the cleaned output.

## Supported Formats

- PDF (.pdf)
- DOCX (.docx)
- XLSX (.xlsx)
- PPTX (.pptx)
- JPG / JPEG (.jpg, .jpeg)
- PNG (.png)

## API Endpoints

- POST /api/tools/metadata-remover/analyze
- POST /api/tools/metadata-remover/remove
- GET /api/tools/metadata-remover/download/[token]
- GET /api/tools/metadata-remover/health

## Environment Variables

- METADATA_REMOVER_MAX_PDF_MB
- METADATA_REMOVER_MAX_DOCX_MB
- METADATA_REMOVER_MAX_XLSX_MB
- METADATA_REMOVER_MAX_PPTX_MB
- METADATA_REMOVER_MAX_IMAGE_MB
- METADATA_TEMP_DIR
- JOB_TTL_MINUTES
- QPDF_PATH

## Security Model

- files are stored in private temporary directories
- filenames are sanitized before reuse
- uploads are validated by extension, MIME type, magic bytes, and parser checks
- qpdf is invoked through an executable path and argument array, not shell interpolation
- temporary files are removed after processing and on failure

## Verification Strategy

After removal, the cleaned file is re-analyzed to confirm metadata is absent before the download is issued.

## Notes

This implementation relies on qpdf for PDF sanitization and on JSZip plus Sharp for office/image metadata handling.
