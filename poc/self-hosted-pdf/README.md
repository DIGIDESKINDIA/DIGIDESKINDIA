# Self-Hosted PDF Worker POC

This isolated proof of concept does not modify DigiDesk production routes or UI.

## Engines

- `qpdf`: PDF merge, split, object/stream compression, AES-256 encryption, password removal, and structural validation.
- `Poppler`: PDF page rendering through `pdftoppm`.

Both run inside a Linux container. No shell input is derived from filenames or user values; command names and arguments are fixed/validated. Each request gets a private temporary directory that is deleted in `finally`.

## Run With Docker

From this directory:

```powershell
docker build -t digidesk-pdf-poc .
docker run --rm -p 8080:8080 digidesk-pdf-poc
```

Health check:

```powershell
Invoke-RestMethod http://localhost:8080/health
```

## Endpoints

All operations accept `multipart/form-data`:

- `POST /merge`: repeated `files` PDF parts; returns a merged PDF.
- `POST /split`: `file` PDF plus optional `ranges` field; returns a selected-page PDF.
- `POST /compress`: `file` PDF; returns a qpdf-rewritten PDF.
- `POST /protect`: `file` PDF plus `password`; returns AES-256 encrypted PDF.
- `POST /unlock`: `file` PDF plus `password`; returns decrypted PDF.
- `POST /render`: `file` PDF plus optional `format=jpg|png`; returns JSON containing base64 page images for POC validation.

The production worker should later return streamed downloads and a job/status contract rather than base64 render JSON.

## Validate Real Outputs

With the container running:

```powershell
node poc/self-hosted-pdf/test.mjs http://localhost:8080
```

The test uses `test-files/small.pdf` and `test-files/multi-page.pdf`, checks output signatures, asks qpdf-backed endpoints to process real documents, checks render image signatures, and verifies wrong-password rejection. It exits nonzero on any invalid output.

## Current POC Scope

Image-to-PDF remains in the existing `pdf-lib`/Sharp path and is intentionally not migrated by this POC. Production migration should add it to the worker only after the core queue/storage contract is established.
