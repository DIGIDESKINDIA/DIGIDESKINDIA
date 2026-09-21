# PDF Processing Architecture Report

## 1. Current Architecture

The public DigiDesk UI and URLs remain unchanged. Existing PDF pages call binary-response routes under `/api/pdf/*`. `pdf-lib` continues to handle local structural operations such as merge, split, delete, rotate, watermark, and the client-side JPG-to-PDF page. Sharp continues to handle image tools. The legacy Ghostscript helper remains only for the standalone historical `test-large-files.ts` script; it is not used by the active PDF-to-image API route.

The four previously blocked server operations now use a server-only adapter in `lib/pdf/adobe-services.ts`:

- Compress PDF: Adobe Compress PDF job.
- PDF to JPG/PNG: Adobe Export PDF to Images job, ZIP of page images.
- Protect PDF: Adobe Protect PDF job with AES-256 user-password encryption.
- Unlock PDF: Adobe Remove Protection job using the supplied password.

Credentials are read only from `PDF_SERVICES_CLIENT_ID` and `PDF_SERVICES_CLIENT_SECRET`. They are never sent to the browser.

## 2. Failed Ghostscript Approach

The prior implementation invoked `gswin64c`, `gswin32c`, or `gs` with `child_process`. Those executables are not part of Vercel's Node runtime and are absent from this development environment. The approach is therefore not a production-compatible Vercel solution.

## 3. Failed WASM Approach

The bundled `@jspawn/ghostscript-wasm` package was tested and rejected. Next/Turbopack initially attempted to resolve its Emscripten imports as modules. After bypassing static resolution, real requests still took several minutes and exceeded practical request timeouts. That implementation was removed and is not used here.

## 4. Options Investigated

| Option | Coverage | Vercel | Assessment |
|---|---|---|---|
| OS Ghostscript/Poppler/qpdf | Compression/rendering/security depending on binaries | No reliable binary guarantee | Rejected |
| `pdf-lib` | Structural PDF edits and client JPG-to-PDF | Yes | Cannot genuinely encrypt/decrypt or render pages |
| Sharp | Image conversion | Yes | Does not render PDF pages in this architecture |
| Ghostscript WASM package | Potentially broad | Bundling/runtime problems; multi-minute execution observed | Rejected |
| PDF.co | Compression documented; temporary URLs and async jobs | Yes via HTTPS | Does not provide one verified operation set here for all four required operations |
| Adobe Acrobat Services | Compression, PDF-to-images, AES protection, remove protection | Yes via server-side Node SDK/HTTPS | Selected |

## 5. Selected Solution

Adobe Acrobat Services PDF Services API is selected because its current official documentation and installed Node SDK cover all four missing operations. The SDK uses HTTPS and Node streams, not host-installed PDF executables. Jobs are submitted asynchronously and polled by the SDK. Input and result assets are explicitly deleted in `finally` after download.

## 6. Why Selected

Adobe is the only investigated option with verified official documentation for all of:

- compression levels;
- JPEG/PNG page-image ZIP export;
- AES-128/AES-256 password protection;
- password-based protection removal.

The official Node SDK requires Node 18+ and exposes the exact job classes used by the adapter. This project already uses the Node runtime for these API routes.

## 7. Vercel Compatibility Evidence

Adobe's official documentation provides a Node.js SDK and REST API. Vercel's official Node runtime documentation states that Node.js functions support Node APIs and npm dependencies. The selected implementation uses HTTPS through the SDK and Node streams; it does not invoke a shell, executable path, or native PDF binary.

Vercel-compatible: **Yes, subject to configured Adobe credentials and Adobe service quotas.**

The implementation still inherits platform request duration, memory, and request-body constraints. Adobe documents a default one-transaction limit of up to 50 pages for the relevant operations; larger jobs require product/plan confirmation or an asynchronous architecture.

## 8. Privacy Implications

Uploaded documents leave DigiDesk infrastructure and are processed in Adobe Document Cloud. Adobe documents TLS 1.2+ in transit and temporary user-generated-content storage. SDK-uploaded assets may remain available for up to 24 hours in the documented SDK flow; the adapter calls `deleteAsset` for input and output assets after downloading them. Adobe credentials remain server-side.

This must be disclosed in the product privacy policy before enabling the provider in production. No document contents are logged by the new adapter.

## 9. Security Implications

- No user-controlled executable path or shell command is used by the new operations.
- API credentials are read server-side only.
- Input MIME, extension, non-empty checks, and PDF parsing remain in the routes/engines.
- Requested PDF image pages are range-checked and copied into a new PDF before export.
- Adobe input/output assets are deleted in `finally` blocks.
- Provider errors are not returned verbatim to clients; routes return sanitized messages.
- Incorrect unlock passwords are delegated to Adobe and return an error rather than bypassing protection.
- No arbitrary application-level file-size limit was added.

## 10. Cost Implications

Adobe documents a free tier of 500 Document Transactions per month. Paid credentials and higher quotas require Adobe's paid plans or agreement. Operations are charged per document transaction, so compression, image export, protection, and removal each consume provider quota.

## 11. Compress PDF Result

Implementation: **Complete, provider execution not locally verified.**

The route preserves binary PDF download behavior and returns original/output size headers. Adobe may return an output that is not smaller for already optimized input; this is documented provider behavior and is not treated as a fake compression claim.

Local output evidence: **Not available** because Adobe credentials are not configured in this workspace.

## 12. PDF to Image Result

Implementation: **Complete, provider execution not locally verified.**

The route returns the provider's ZIP of page images with the existing `application/zip` contract. Explicit page selections are preserved by creating a temporary selected-page PDF with `pdf-lib` before Adobe export.

Local output evidence: **Not available** because Adobe credentials are not configured in this workspace.

## 13. Protect PDF Result

Implementation: **Complete, provider execution not locally verified.**

The adapter requests AES-256 encryption with the user password. This is genuine password protection according to Adobe's documented Protect PDF operation, unlike the previous metadata-only implementation.

Validation still required with credentials: open output without password must fail; open with the selected password must succeed.

## 14. Unlock PDF Result

Implementation: **Complete, provider execution not locally verified.**

The adapter uses Adobe Remove Protection with the supplied password. Adobe documents that the owner password is required. Incorrect passwords must fail.

Validation still required with credentials: protected output must open with the password, unlocked output must open without it, and an incorrect password must be rejected.

## 15. Large-File Test Results

No provider-backed large-file test was run because credentials were unavailable. No 20 MB, 50 MB, 100 MB, or 150 MB application limit was introduced. Adobe's documented operation/page and account quota limits remain real external constraints and must be tested against the production plan.

## 16. Mobile Test Results

No visual UI changes were made. Existing responsive pages were not redesigned. Provider-backed upload/process/download testing at 320, 375, 390, 414, 768, and 1440 pixels remains pending credentialed E2E execution.

## 17. Regression Test Results

The existing local `pdf-lib`, Sharp, and client-side tool implementations were not intentionally changed. Full regression execution remains pending after configuring Adobe credentials. The build route inventory remains intact, including merge, split, delete pages, extract pages, organize, rotate, watermark, JPG-to-PDF, and image tools.

## 18. TypeScript Result

`npx tsc --noEmit`: **PASS**.

## 19. Lint Result

`npm run lint`: **PASS with 20 pre-existing warnings**. Warnings include unused variables in existing test scripts and the locked Hero `<img>` warning. No new lint errors remain in the Adobe implementation.

## 20. Build Result

An earlier `npm run build` run after adding the Adobe SDK: **PASS**. The final rerun was blocked by a network-dependent `next/font` fetch for Google Manrope (`fonts.gstatic.com`) and failed before application compilation. This is unrelated to the PDF adapter; rerun with network access or the existing font cache before deployment.

## 21. Remaining Blockers

1. Configure `PDF_SERVICES_CLIENT_ID` and `PDF_SERVICES_CLIENT_SECRET` in Vercel production and local test environments.
2. Run credentialed E2E validation against real output files for compression, PDF-to-image, protection, and unlock.
3. Add a truthful privacy notice/policy update before sending user documents to Adobe.
4. Confirm Adobe plan limits for the intended large-file/page-count workload.
5. Run mobile and full regression suites after provider credentials are available.
