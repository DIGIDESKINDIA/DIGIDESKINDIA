# Self-Hosted Architecture Plan

Audit date: 2026-08-20

## 1. Current Architecture

DigiDesk is a Next.js 16 application with React pages, App Router API routes, shared `lib/` engines, Mongoose/MongoDB lead persistence, HMAC-signed admin cookies, Sharp image processing, pdf-lib structural PDF processing, pdfjs-dist browser viewing, and a Groq-backed AI route. OpenAI and Gemini clients are also installed but are not the active AI route. The prior Adobe PDF adapter exists in the current worktree from the preceding phase; it is not used by this self-hosted POC and should be removed during the production PDF migration.

The current app is not yet a job-oriented processing system. Heavy PDF work is coupled to request/response API routes, temporary local files are used in some endpoints, and Vercel's ephemeral runtime is unsuitable for large, CPU-heavy, or native-binary PDF processing.

## 2. All Third-Party Dependencies

The detailed dependency inventory is in [CURRENT_DEPENDENCIES.md](CURRENT_DEPENDENCIES.md). The important external/runtime boundaries are:

- Vercel deployment and build infrastructure.
- npm registry and package distribution.
- MongoDB connection supplied through `MONGODB_URI`.
- Groq API used by `/api/ai`.
- OpenAI and Gemini SDKs installed as alternate clients.
- Adobe PDF Services currently present from the previous phase, but explicitly not selected for the self-hosted architecture.
- Razorpay SDK installed for a possible payment integration; no active route usage was found.
- WhatsApp links used as external communication targets.
- Google font fetching through `next/font` may occur during builds; local font assets are already available and should be preferred for independent builds.

## 3. Dependencies That Can Be Removed

After the self-hosted POC passes and production migration is complete:

- Adobe PDF Services SDK and `lib/pdf/adobe-services.ts`.
- `ghostscript-node` and `@jspawn/ghostscript-wasm` after the legacy test helper is migrated or deleted by explicit decision.
- Unused OpenAI/Gemini SDKs if the AI audit confirms they are not used.
- Razorpay only if payments are not a product requirement.
- Any unused native `canvas` path after a build/import audit.

Do not remove these during the POC phase.

## 4. Dependencies That Must Remain External

Payment networks cannot be replaced by DigiDesk without becoming a payment institution and integrating banking/card rails. Government portals and official government APIs must remain external systems. WhatsApp remains external when DigiDesk provides a link to that communication network.

MongoDB, object storage, email, monitoring, and AI providers are not legally required to be external; they may be self-hosted when their operational cost and maintenance are justified.

## 5. Recommended Architecture

Keep the existing UI and lightweight Next.js application layer. Move heavy file work to an owned Linux processing service:

```text
Browser
  -> Next.js frontend / lightweight API
  -> authenticated processing API
  -> Redis-backed job queue
  -> isolated PDF/Image worker containers
  -> temporary local workspace
  -> optional S3-compatible durable output
  -> download/status endpoint
```

Recommended first deployment:

- Vercel: public Next.js pages, static assets, lightweight auth/admin APIs.
- One dedicated Linux VPS: processing API, worker, Redis, and reverse proxy in Docker Compose.
- MongoDB: keep current MongoDB contract initially; self-host later only when operational ownership is desired.
- MinIO: add only when output retention or multi-worker durable files are required.
- Caddy or Nginx: TLS, request size policy, internal network isolation, and proxying.

## 6. PDF Engine Recommendation

### Option A: qpdf + Poppler in a Linux worker, recommended

- Linux: excellent.
- Docker: excellent; both are packaged in Debian/Ubuntu images.
- Vercel: not suitable for native binaries and long-running work; keep off Vercel.
- Dedicated server: excellent.
- CPU/RAM: qpdf is generally light; Poppler rendering is CPU/RAM proportional to page size and DPI.
- Large files: materially better than serverless request-bound execution; still requires per-job resource limits.
- Speed: fast for structural operations; rendering scales with page count and DPI.
- Security: use fixed executable paths, argument arrays, private temp directories, non-root containers, seccomp/AppArmor, timeouts, and CPU/memory quotas.
- Maintenance: mature distro packages and simple subprocess model.
- License: qpdf is Apache-2.0; Poppler is GPL-2.0-or-later. Review GPL obligations before distributing the worker image or modified binaries.
- Maturity: production-grade, widely used PDF utilities.
- Coverage: merge, split, compression/rewrite, AES encryption/decryption, metadata/checks via qpdf; PDF→JPG/PNG via Poppler.

### Option B: MuPDF tools in a Linux worker

- Linux/Docker/dedicated server: strong.
- Vercel: not appropriate for native execution.
- CPU/RAM/speed: excellent rendering and broad PDF support.
- Security: must still sandbox native subprocesses.
- Maintenance: good technical quality, but licensing must be reviewed carefully. MuPDF is AGPL/commercial depending on use and distribution.
- Coverage: broad rendering and manipulation; qpdf remains simpler for password/security and deterministic structural operations.
- Risk: licensing/commercial obligations are less attractive for DigiDesk's independent platform unless a legal review approves AGPL or a commercial license.

### Decision

Use Option A first: qpdf + Poppler in a dedicated Linux worker. It is easier to package, audit, operate, and license for this project. Keep pdf-lib for existing structural operations that already work; use qpdf/Poppler only where native engines are needed.

## 7. Image Engine Recommendation

Keep Sharp. It is mature, self-hostable, fast, and already owns resize, compression, crop, rotate, conversion, watermarking, passport sheets, and much of image-to-PDF. Run it in the same worker service for large files rather than replacing it merely to change technology.

Remove-background behavior requires a separate audit: if it calls an external model/provider, either deploy a local segmentation model or document that the capability remains optional external functionality.

## 8. AI Recommendation

Do not blindly replace Groq. The active `/api/ai` route uses Groq and has an API-key dependency. First define required model quality, latency, token volume, and concurrency.

- Ollama: best first self-hosted development/small-server option; simple HTTP API and easy model lifecycle.
- vLLM: production GPU option for concurrent traffic and OpenAI-compatible serving; requires more operational work and a capable NVIDIA/AMD GPU setup.
- CPU-only self-hosting is practical for small quantized models but will be slower and may not match the current model quality.

Recommended migration: add an internal AI provider interface, run Ollama on a separate private host, compare responses and latency, then switch by configuration only after acceptance tests pass.

## 9. Search Recommendation

The current search is a local data index in `lib/search/index.ts`. Keep it local. For the current catalog size, a static normalized index plus in-process filtering is simpler and more reliable than Elasticsearch/OpenSearch.

If search grows substantially, use MongoDB text indexes first. Add Meilisearch only when typo tolerance, faceting, or large catalog scale justifies another service.

## 10. Authentication Recommendation

The admin session mechanism is already first-party: HMAC signing via Web Crypto and an HTTP-only cookie. Keep the architecture, but harden it:

- Require `AUTH_SECRET` in production; fail closed if missing.
- Remove `NEXT_PUBLIC_ADMIN_PASSWORD` fallback and any public credential variable.
- Store a password hash in MongoDB or a secret manager, not plaintext environment variables.
- Add login rate limiting and audit events.
- Set secure, HTTP-only, SameSite cookies consistently.

Do not replace it with an external auth SaaS during this migration.

## 11. Database Recommendation

Keep MongoDB/Mongoose initially. Current usage is limited to the Lead model and lead CRUD routes. Add indexes for the fields used by admin filtering/sorting after measuring real queries. Use a private network connection, TLS, least-privilege database credentials, backups, and connection pooling.

Self-host MongoDB in a later infrastructure phase only if the team can own backups, upgrades, replica/restore testing, monitoring, and security patches. Managed MongoDB is operationally safer during the first worker migration, but is optional rather than architecturally required.

## 12. File-Processing Architecture

Use a job contract rather than keeping heavy work inside Next.js requests:

1. Browser uploads to a lightweight authenticated upload endpoint.
2. API validates MIME, extension, magic bytes, and request metadata.
3. API stores the input in private object storage or a worker handoff stream.
4. API creates a job record with operation, owner, status, retry count, and expiry.
5. Redis queue dispatches the job to a worker.
6. Worker creates a random private temp directory, validates again, processes with fixed binaries/libraries, validates output, and writes the result.
7. Status endpoint reports queued/processing/completed/failed.
8. Browser downloads through a short-lived authenticated URL.
9. Worker and cleanup job remove local workspaces and expired outputs.

Do not add an arbitrary application file-size ceiling. Enforce actual infrastructure protections: reverse-proxy request limits, available disk, queue concurrency, worker memory, CPU timeouts, and plan-specific operational quotas. Return a clear infrastructure error when those limits are reached.

## 13. Vercel Responsibilities

Keep on Vercel:

- Public Next.js pages and locked UI.
- Static assets and lightweight route handlers.
- Authentication/session verification after hardening.
- Small CRUD/admin requests.
- Job creation/status requests.

Do not keep on Vercel:

- qpdf/Poppler subprocesses.
- Large PDF rasterization.
- Long-running compression/encryption jobs.
- Large temporary file pipelines.
- AI inference.

## 14. Processing-Server Responsibilities

The dedicated worker host owns Dockerized processing API, Redis queue, PDF/Image worker containers, temporary workspace, optional MinIO, health checks, metrics, retries, and cleanup. Workers should be horizontally scalable after queue metrics justify it.

## 15. Security Architecture

- TLS at Caddy/Nginx; private worker network.
- Internal service authentication between Next.js and worker using rotated HMAC or mTLS.
- No public worker admin/debug endpoints.
- MIME plus magic-byte validation.
- Random UUID workspaces; never use user filenames as paths.
- Fixed executable names and `execFile`/equivalent argument arrays; never shell interpolation.
- Non-root containers with read-only base filesystem and writable temp mount only.
- CPU, memory, process-count, and wall-clock limits.
- PDF parser/render sandboxing with seccomp/AppArmor where available.
- Rate limiting by account/IP and queue concurrency limits.
- SSRF prevention: worker never fetches arbitrary user URLs; input is uploaded bytes only.
- Sanitized client errors; detailed errors stay in private structured logs.
- Automatic temp cleanup on success, failure, cancellation, and scheduled expiry.
- Secrets in Vercel/host secret storage, not browser bundles or git.
- Malware scanning is recommended before retaining durable files; do not assume PDF parsing is harmless.

## 16. Infrastructure Recommendation

Start with one Linux VPS or dedicated host running Docker Compose:

- Caddy/Nginx.
- Processing API.
- One or more worker replicas.
- Redis.
- Optional MinIO only when durable output/object handoff is needed.
- Prometheus-compatible metrics and a lightweight log collector.

A dedicated server is preferable to forcing native PDF processing into Vercel. Add a second worker host and replicated Redis/storage only after measured load requires it.

## 17. Approximate Cost Categories

Exact prices depend on region, provider, bandwidth, storage, and traffic and should be quoted from the selected host.

- Vercel: existing plan plus function/build/bandwidth usage.
- Small CPU VPS for API + one worker + Redis: commonly tens of USD per month, depending on RAM/CPU and region.
- Larger CPU worker host: commonly tens to low hundreds of USD per month as concurrency and rendering workloads grow.
- Durable object storage: usually storage plus egress; MinIO avoids a SaaS storage fee but requires disks/backups.
- Redis: zero incremental license cost self-hosted; operational cost is host RAM and monitoring.
- AI: CPU-only host is cheap but slow; GPU inference can be hundreds of USD/month or more depending on hardware/provider.
- MongoDB: self-hosted avoids service fees but adds backup/operations cost.

Treat bandwidth and backups as first-class costs; PDF/image workloads can be egress-heavy.

## 18. POC Results

The isolated POC is in [poc/self-hosted-pdf](poc/self-hosted-pdf).

Implemented endpoints:

- merge
- split
- qpdf compression/rewrite
- AES-256 protection
- password unlock
- Poppler PDF→JPEG/PNG rendering

`node --check poc/self-hosted-pdf/worker.mjs`: **PASS**.

The POC was not executed against real files in this environment because Docker, qpdf, Poppler, MuPDF, and Ghostscript are not installed. No POC PASS is claimed for real processing. Run the exact Docker/test commands in the POC README on Linux or a Docker host; the test fails on invalid signatures, missing EOF markers, failed qpdf validation, wrong-password acceptance, or incorrect rendered page count.

## 19. Migration Phases

1. Keep production UI and routes unchanged; land the audit and POC.
2. Build a worker API/job contract behind an internal feature flag.
3. Run qpdf/Poppler POC in Docker with real fixtures and large-file benchmarks.
4. Add queue, job records, status polling, cleanup, and internal authentication.
5. Migrate one low-risk production operation, such as PDF→image, behind a server-side feature flag.
6. Migrate compression and security operations after output validation.
7. Move heavy image operations to the worker while keeping Sharp.
8. Harden auth and remove public credential fallbacks.
9. Introduce self-hosted AI only after model acceptance tests.
10. Remove Adobe/Ghostscript dependencies only after all production routes are migrated and regression tests pass.

## 20. Risks

- qpdf and Poppler package licensing obligations need legal review, especially if DigiDesk distributes the worker image.
- Native PDF parsers are security-sensitive and require sandboxing and patch management.
- A self-hosted worker shifts availability, backups, monitoring, and incident response to DigiDesk.
- Large PDF/image traffic can exhaust disk, RAM, CPU, or bandwidth without queue controls.
- Self-hosted AI may have lower quality or higher latency than Groq without GPU hardware.
- Existing production routes currently use the Adobe adapter from the previous phase; migration must not remove it until the POC and credentialed regression suite pass.
- Authentication currently has unsafe fallback behavior if production secrets are missing.
- Google font fetching can make builds network-dependent; local font bundling should be completed for maximum independence.

## 21. Remaining Blockers

- Docker/Linux execution environment for real POC evidence.
- Legal review of qpdf/Poppler licenses and worker distribution.
- Production worker host, TLS, queue, and secret-management choice.
- Credentialed full regression baseline before switching production routes.
- Decision on MongoDB self-hosting versus managed transition.
- AI hardware/model acceptance requirements.
