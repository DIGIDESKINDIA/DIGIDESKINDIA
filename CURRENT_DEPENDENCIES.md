# Current Dependencies Audit

Audit date: 2026-08-20

This inventory is based on the current source tree, `package.json`, API routes, libraries, models, configuration, and scripts. The audit does not change production behavior.

## Runtime and Framework

| Name | Purpose | Current location | Self-hostable? | Can replace? | Recommended replacement | Difficulty | Risk | Notes |
|---|---|---|---|---|---|---|---|---|
| Next.js | Frontend, routing, server API routes | `package.json`, `app/` | Yes | No immediate need | Keep Next.js; deploy frontend on Vercel or own Node server | Low | Medium | Framework/runtime, not SaaS |
| React / React DOM | Browser UI | `package.json`, `app/`, `components/` | Yes | No | Keep | Low | Low | First-party application code runs on client |
| TypeScript | Build-time type checking | `package.json`, `tsconfig.json` | Yes | No | Keep | Low | Low | Development tool |
| Tailwind/PostCSS | CSS build | `postcss.config.mjs`, `app/globals.css` | Yes | No | Keep | Low | Low | No runtime service |
| Framer Motion | UI animation | `package.json`, components | Yes | No | Keep | Low | Low | Bundled client library |
| Lucide React | Icons | `package.json`, components | Yes | No | Keep | Low | Low | Bundled library |
| Radix UI | UI primitives | `package.json`, components | Yes | No | Keep | Low | Low | Bundled library |
| dnd-kit | Drag/reorder UI | `package.json`, organize tools | Yes | No | Keep | Low | Low | Bundled library |
| Zustand | Local UI state | `package.json`, PDF organizer | Yes | No | Keep | Low | Low | Bundled library |
| React Query | Client request state | `package.json` | Yes | No | Keep if used | Low | Low | No external service by itself |

## PDF and Image Processing

| Name | Purpose | Current location | Self-hostable? | Can replace? | Recommended replacement | Difficulty | Risk | Notes |
|---|---|---|---|---|---|---|---|---|
| pdf-lib | Merge, split, delete, rotate, watermark, metadata, image-to-PDF and structural operations | `lib/pdf/`, `lib/image/operations.ts`, JPG-to-PDF page | Yes | Keep | Keep for structural PDF operations | Low | Medium | Does not provide full rendering or robust encryption/decryption |
| pdfjs-dist | Browser/server PDF parsing and viewer support | `lib/pdf/renderer.ts`, viewer components | Yes | Keep | Keep for browser viewing and metadata/render experiments | Low | Medium | Browser worker configuration needs care |
| Sharp/libvips | Resize, compress, crop, rotate, convert, watermark, passport-photo and image-to-PDF support | `lib/image/operations.ts`, image API routes | Yes | Keep | Keep Sharp on a processing worker | Low | Low | Mature native library; install platform binaries in Docker |
| canvas | Raster support used by some PDF/image code | `package.json`, processing/tests | Yes | Maybe | Keep only where imports require it; otherwise remove after dependency tracing | Medium | Medium | Native build dependency can complicate deploys |
| `@jspawn/ghostscript-wasm` | Previous attempted portable Ghostscript | `package.json`, lockfile | Technically self-hostable, rejected in practice | Yes | Remove after migration POC proves replacement | Medium | High | Previous experiment had bundling and multi-minute runtime failures |
| `ghostscript-node` | Ghostscript integration dependency | `package.json`, lockfile | Requires Ghostscript/native runtime | Yes | Remove from production app after worker migration | Medium | High | Not suitable as a Vercel function dependency |
| Adobe PDF Services SDK | Previous external PDF processing adapter | `lib/pdf/adobe-services.ts`, four API routes, `package.json` | No, SaaS | Yes | Replace with the self-hosted qpdf/Poppler worker after POC | Medium | High | Sends documents to Adobe; intentionally not the target architecture |
| qpdf | Recommended self-hosted PDF structural/security engine | POC only initially | Yes | N/A | Run in isolated Linux worker container | Medium | Low | Apache-2.0; supports merge/split, stream/object compression, AES encryption/decryption |
| Poppler utilities | Recommended PDF raster engine | POC only initially | Yes | N/A | Run `pdftoppm`/`pdftocairo` in worker container | Medium | Medium | GPL-2.0-or-later; verify distribution obligations and sandbox subprocesses |

## AI and External APIs

| Name | Purpose | Current location | Self-hostable? | Can replace? | Recommended replacement | Difficulty | Risk | Notes |
|---|---|---|---|---|---|---|---|---|
| Groq API / groq-sdk | Current AI assistant provider | `lib/groq.ts`, `app/api/ai/route.ts` | No, provider is external | Yes | Ollama for development/small deployments; vLLM for GPU production | High | High | Requires `GROQ_API_KEY`; documents leave DigiDesk for inference |
| OpenAI / openai SDK | Alternate AI client | `lib/openai.ts` | No | Yes | Same Ollama/vLLM migration path | High | High | Current route appears Groq-backed; audit usage before removing |
| Google Gemini / @google/genai | Alternate AI client/model configuration | `lib/gemini.ts` | No | Yes | Self-hosted model through Ollama/vLLM | High | High | Requires `GEMINI_API_KEY`; verify actual call sites before removal |
| Ollama | Candidate local model server | Not currently installed | Yes | N/A | Recommended first self-hosted AI target | Medium | Medium | CPU-only models are slower; GPU strongly preferred |
| vLLM | Candidate high-throughput inference server | Not currently installed | Yes | N/A | Use when GPU server and concurrent inference justify it | High | Medium | More operational complexity than Ollama |

## Database, Authentication, and CRM

| Name | Purpose | Current location | Self-hostable? | Can replace? | Recommended replacement | Difficulty | Risk | Notes |
|---|---|---|---|---|---|---|---|---|
| MongoDB driver / Mongoose | Leads/CRM persistence | `lib/mongodb.ts`, `models/Lead.ts`, lead API routes | Yes | Do not replace now | Self-host MongoDB in Docker or keep managed MongoDB temporarily | Medium | Medium | Current connection caches Mongoose and uses `digitaldesk` database; inspect indexes before scale |
| HMAC Web Crypto | Admin session signing | `lib/auth/core.ts`, auth routes, middleware | Yes | Keep | Keep, but require a strong `AUTH_SECRET` | Low | High | Current fallback secret is unsafe for production if env is missing |
| Admin username/password env vars | Admin login credential source | `app/api/auth/login/route.ts` | Yes | Improve | Store password hash in DB or secret manager; remove `NEXT_PUBLIC_ADMIN_PASSWORD` | Medium | High | Current fallback permits public env naming and should be hardened |
| Admin/CRM leads | Lead capture and admin listing | `app/api/leads`, `models/Lead.ts`, `app/admin` | Yes | Keep | Own API + MongoDB | Low | Medium | Already first-party application logic |

## Payments, Email, Analytics, and Storage

| Name | Purpose | Current location | Self-hostable? | Can replace? | Recommended replacement | Difficulty | Risk | Notes |
|---|---|---|---|---|---|---|---|---|
| Razorpay SDK | Payment integration dependency | `package.json` | No, payment network is external | No, if payments remain | Keep as official payment integration | Medium | High | No active usage was found in the audited source; remove only after confirming no planned payment route |
| MongoDB storage | Lead data storage | `MONGODB_URI` | Yes | Keep | Self-host MongoDB or use a managed provider during transition | Medium | Medium | Not a document-file store |
| Local filesystem | Temporary/output/upload storage | `storage/`, API routes | Yes | Improve | Worker-local temp directories plus S3-compatible object storage only for durable outputs | Low | High | Vercel filesystem is ephemeral; dedicated worker is appropriate |
| Email provider | No active implementation found | No active route/library found | N/A | N/A | Add self-hosted SMTP only when a real email workflow exists; otherwise do not add | Medium | Medium | Do not invent a dependency |
| Analytics provider | No active implementation found | No active route/library found | N/A | N/A | Self-host Plausible/Umami only if analytics becomes a requirement | Medium | Medium | Not currently present |
| WhatsApp link/service | Contact/CTA integration | `components/WhatsAppButton.tsx`, related components | Partly | No need | Keep as a user-selected external communication link | Low | Low | WhatsApp itself cannot be replaced by DigiDesk; no API credential is required for a link |

## CDN and External Assets

| Name | Purpose | Current location | Self-hostable? | Can replace? | Recommended replacement | Difficulty | Risk | Notes |
|---|---|---|---|---|---|---|---|---|
| Google Fonts / next/font Google | Font download/build asset | `app/layout.tsx` or related layout | Yes | Yes | Bundle approved font files locally or use `@fontsource` already present | Low | Medium | Build can fail when Google font fetch is unavailable |
| npm registry | Dependency distribution | `package-lock.json` | Not a runtime dependency | No immediate need | Vendor/lock dependencies for reproducible builds | Medium | Low | Build-time external network dependency |
| Vercel | Current deployment target | Project deployment context | No | Yes | Keep frontend on Vercel or move entire Next app to own Node host | Medium | Medium | Recommended to keep for frontend while workers move self-hosted |

## Classification Summary

### A. Must Keep

Next.js, React, TypeScript, pdf-lib, pdfjs-dist, Sharp, and UI libraries are reasonable bundled open-source dependencies. They are not SaaS dependencies and are already part of the application architecture.

### B. Can Self-Host

PDF heavy processing, image processing, queues, temporary storage, object storage, search indexing, MongoDB, AI inference, logging, and monitoring can run on DigiDesk-controlled infrastructure.

### C. External Official Integrations

Payment processing must remain connected to a regulated payment network such as Razorpay if DigiDesk accepts payments. WhatsApp remains an external communication network when users choose it. Government portals, if later integrated, must remain official external systems.

### D. Optional External Services

Groq, OpenAI, Gemini, Adobe PDF Services, managed MongoDB, hosted object storage, hosted email, analytics, and hosted monitoring are optional. They can be replaced or self-hosted subject to operational cost, hardware, licensing, and reliability requirements.
