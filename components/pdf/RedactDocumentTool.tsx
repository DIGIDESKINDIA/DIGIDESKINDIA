"use client";

import { useCallback, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { getPdfWorkerSource } from "@/lib/pdf/pdf-worker";
import { AlertTriangle, Download, FileText, Loader2, Redo2, RotateCw, ShieldCheck, Undo2, UploadCloud, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "react-hot-toast";

import { type RedactionRect, validateRedactionRectangle } from "@/lib/pdf/redaction-utils";

pdfjs.GlobalWorkerOptions.workerSrc = getPdfWorkerSource(pdfjs.version);

type PdfPageSize = { width: number; height: number };

type RedactionDraft = {
  page: number;
  startX: number;
  startY: number;
  width: number;
  height: number;
};

type RedactionInteraction =
  | { kind: "draw"; startX: number; startY: number }
  | { kind: "move" | "resize"; id: string; startX: number; startY: number; original: RedactionRect };

const MAX_FILE_SIZE = 25 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 2)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
}

export default function RedactDocumentTool() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [toolMode, setToolMode] = useState<"select" | "draw">("draw");
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string>("");
  const [pageSizes, setPageSizes] = useState<Record<number, PdfPageSize>>({});
  const [redactions, setRedactions] = useState<RedactionRect[]>([]);
  const [draft, setDraft] = useState<RedactionDraft | null>(null);
  const [interaction, setInteraction] = useState<RedactionInteraction | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>("redacted-document.pdf");

  const pageTexture = useMemo(() => pageSizes[pageNumber] ?? { width: 612, height: 792 }, [pageNumber, pageSizes]);

  const redactionsForCurrentPage = useMemo(
    () => redactions.filter((item) => item.page === pageNumber),
    [pageNumber, redactions]
  );

  const validateUpload = useCallback((candidate: File | null) => {
    if (!candidate) return "Please select a PDF file.";
    if (candidate.size <= 0) return "The PDF is empty.";
    if (candidate.size > MAX_FILE_SIZE) return "PDF files must be 25 MB or smaller.";
    if (candidate.type !== "application/pdf" && !/\.pdf$/i.test(candidate.name)) return "Only PDF files are supported.";
    return "";
  }, []);

  function handleFileSelect(candidate: File | null) {
    const message = validateUpload(candidate);
    if (message) {
      setError(message);
      return;
    }

    setFile(candidate);
    setError("");
    setDownloadUrl(null);
    setPageNumber(1);
    setRedactions([]);
    setDraft(null);
    setPageSizes({});
  }

  function onPageLoaded(page: { width: number; height: number }, pageIndex: number) {
    setPageSizes((current) => ({
      ...current,
      [pageIndex]: { width: page.width / zoom, height: page.height / zoom },
    }));
  }

  function toPageRect(rect: RedactionRect) {
    const size = pageSizes[rect.page] ?? { width: 612, height: 792 };
    return {
      left: (rect.x / size.width) * 100,
      top: (rect.y / size.height) * 100,
      width: (rect.width / size.width) * 100,
      height: (rect.height / size.height) * 100,
    };
  }

  function getPagePoint(event: ReactPointerEvent<HTMLElement>) {
    const pageSurface = event.currentTarget.closest("div.relative");
    const bounds = (pageSurface ?? event.currentTarget).getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    return {
      x: Math.max(0, Math.min((x / bounds.width) * pageTexture.width, pageTexture.width)),
      y: Math.max(0, Math.min((y / bounds.height) * pageTexture.height, pageTexture.height)),
    };
  }

  function startDraft(event: ReactPointerEvent<HTMLDivElement>) {
    if (!file || toolMode !== "draw") return;
    const point = getPagePoint(event);

    setDraft({
      page: pageNumber,
      startX: point.x,
      startY: point.y,
      width: 0,
      height: 0,
    });
    setInteraction({ kind: "draw", startX: point.x, startY: point.y });
  }

  function updateDraft(event: React.PointerEvent<HTMLDivElement>) {
    if (!interaction) return;
    const point = getPagePoint(event);

    if (interaction.kind === "draw") {
      setDraft({
        page: pageNumber,
        startX: interaction.startX,
        startY: interaction.startY,
        width: point.x - interaction.startX,
        height: point.y - interaction.startY,
      });
      return;
    }

    setRedactions((current) => current.map((redaction) => {
      if (redaction.id !== interaction.id) return redaction;
      const deltaX = point.x - interaction.startX;
      const deltaY = point.y - interaction.startY;

      if (interaction.kind === "move") {
        return {
          ...redaction,
          x: Math.max(0, Math.min(pageTexture.width - redaction.width, interaction.original.x + deltaX)),
          y: Math.max(0, Math.min(pageTexture.height - redaction.height, interaction.original.y + deltaY)),
        };
      }

      return {
        ...redaction,
        width: Math.max(2, Math.min(pageTexture.width - redaction.x, interaction.original.width + deltaX)),
        height: Math.max(2, Math.min(pageTexture.height - redaction.y, interaction.original.height + deltaY)),
      };
    }));
  }

  function finishDraft() {
    if (!draft || !interaction || interaction.kind !== "draw" || (Math.abs(draft.width) < 2 && Math.abs(draft.height) < 2)) {
      setDraft(null);
      setInteraction(null);
      return;
    }

    const nextRect: RedactionRect = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      page: draft.page,
      x: Math.min(draft.startX, draft.startX + draft.width),
      y: Math.min(draft.startY, draft.startY + draft.height),
      width: Math.abs(draft.width),
      height: Math.abs(draft.height),
      label: "REDACTED",
    };

    validateRedactionRectangle(nextRect, pageTexture.width, pageTexture.height);
    setRedactions((current) => [...current, nextRect]);
    setDraft(null);
    setInteraction(null);
  }

  function finishInteraction() {
    if (interaction?.kind === "draw") finishDraft();
    else setInteraction(null);
  }

  function startRedactionInteraction(event: ReactPointerEvent<HTMLElement>, redaction: RedactionRect, kind: "move" | "resize") {
    event.stopPropagation();
    const point = getPagePoint(event);
    setInteraction({ kind, id: redaction.id, startX: point.x, startY: point.y, original: { ...redaction } });
  }

  function removeRedaction(id: string) {
    setRedactions((current) => current.filter((item) => item.id !== id));
  }

  async function finalizeRedaction() {
    if (!file || redactions.length === 0) {
      toast.error("Add at least one redaction before finalizing.");
      return;
    }

    setIsFinalizing(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("redactions", JSON.stringify(redactions));

      const response = await fetch("/api/tools/redact-document/process", {
        method: "POST",
        body: formData,
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message ?? "Redaction failed.");
      }

      setDownloadUrl(json.downloadUrl ?? null);
      setDownloadName(json.fileName ?? "redacted-document.pdf");
      toast.success("Redaction complete. Download the final PDF.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to finalize redaction.";
      setError(message);
      toast.error(message);
    } finally {
      setIsFinalizing(false);
    }
  }

  async function downloadFinalPdf() {
    if (!downloadUrl) return;
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      setError("The generated PDF is no longer available.");
      return;
    }
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = downloadName;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">DigiDesk Security</p>
            <h1 className="mt-2 text-4xl font-black">Redact Document</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Hide sensitive information from your document.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Permanent redaction workflow
          </div>
        </header>

        {!file ? (
          <section className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex min-h-[280px] w-full cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-blue-300 bg-blue-50/60 p-8 text-center transition hover:border-blue-500 hover:bg-blue-100/80 dark:border-blue-600/60 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <UploadCloud className="h-14 w-14 text-blue-600 dark:text-blue-400" />
              <h2 className="mt-4 text-2xl font-black">Upload PDF</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Drag and drop or browse for your document.</p>
              <span className="mt-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-200">PDF only · up to 25 MB</span>
              <input ref={inputRef} hidden type="file" accept="application/pdf" onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)} />
            </button>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <p>Redaction is permanent and irreversible. The final exported PDF removes the original content from the document stream so it is not recoverable through text extraction, copy, search, or hidden overlays.</p>
              </div>
            </div>
          </section>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-50 p-2 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Document</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{file.name}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setFile(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">×</button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Size</div>
                    <div className="mt-1 font-semibold text-slate-900 dark:text-white">{formatBytes(file.size)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Pages</div>
                    <div className="mt-1 font-semibold text-slate-900 dark:text-white">{pageCount || 0}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Tools</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { key: "draw", label: "Redact Area" },
                    { key: "select", label: "Select" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setToolMode(item.key as "draw" | "select")}
                      className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${toolMode === item.key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <button type="button" onClick={() => setZoom((current) => Math.min(2, Number((current + 0.1).toFixed(1))))} className="flex w-full items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"><span className="inline-flex items-center gap-2"><ZoomIn className="h-4 w-4" /> Zoom in</span><span>+</span></button>
                  <button type="button" onClick={() => setZoom((current) => Math.max(0.5, Number((current - 0.1).toFixed(1))))} className="flex w-full items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"><span className="inline-flex items-center gap-2"><ZoomOut className="h-4 w-4" /> Zoom out</span><span>-</span></button>
                  <button type="button" onClick={() => setZoom(1)} className="flex w-full items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"><span className="inline-flex items-center gap-2"><RotateCw className="h-4 w-4" /> Fit width</span><span>100%</span></button>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Page navigation</p>
                <div className="mt-4 flex items-center gap-2">
                  <button type="button" disabled={pageNumber <= 1} onClick={() => setPageNumber((current) => Math.max(1, current - 1))} className="rounded-xl bg-slate-100 p-2 text-slate-700 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200"><Undo2 className="h-4 w-4" /></button>
                  <div className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-center text-sm font-semibold dark:bg-slate-800">{pageNumber}/{pageCount || 1}</div>
                  <button type="button" disabled={pageNumber >= pageCount} onClick={() => setPageNumber((current) => Math.min(pageCount, current + 1))} className="rounded-xl bg-slate-100 p-2 text-slate-700 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200"><Redo2 className="h-4 w-4" /></button>
                </div>
              </div>
            </aside>

            <section className="space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Editor</p>
                    <h2 className="text-xl font-black">Redaction workspace</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setDraft(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Clear draft</button>
                    <button type="button" onClick={finalizeRedaction} disabled={isFinalizing || redactions.length === 0} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{isFinalizing ? "Finalizing..." : "Start Redacting"}</button>
                  </div>
                </div>

                {error ? <p className="mb-4 rounded-2xl bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}

                <div className="overflow-auto rounded-[20px] bg-slate-100 p-4 dark:bg-slate-800">
                  <div className="mx-auto flex min-h-[640px] w-full items-center justify-center">
                    <Document file={file} onLoadSuccess={({ numPages }) => setPageCount(numPages)} loading={<div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200"><Loader2 className="h-4 w-4 animate-spin" />Loading PDF...</div>} error={<div className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">Unable to load this PDF.</div>}>
                      <div
                        className="relative"
                        style={{ width: `${Math.max(480, pageTexture.width * zoom)}px` }}
                        onPointerMove={updateDraft}
                        onPointerUp={finishInteraction}
                      >
                        <Page
                          pageNumber={pageNumber}
                          scale={zoom}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          onLoadSuccess={(page) => onPageLoaded(page, pageNumber)}
                          className="rounded-[18px] shadow-lg"
                          width={Math.max(480, pageTexture.width * zoom)}
                          loading={<div className="flex h-[760px] w-[612px] items-center justify-center rounded-[18px] bg-white text-sm font-semibold text-slate-700">Rendering...</div>}
                          canvasBackground="white"
                        />

                        <div
                          className="absolute inset-0 z-10 cursor-crosshair"
                          onPointerDown={startDraft}
                        />

                        {redactionsForCurrentPage.map((redaction) => (
                          <div key={redaction.id} className="absolute z-20 cursor-move rounded border border-slate-900/30 bg-black shadow-[0_0_0_1px_rgba(0,0,0,0.2)]" onPointerDown={(event) => startRedactionInteraction(event, redaction, "move")} style={{ left: `${toPageRect(redaction).left}%`, top: `${toPageRect(redaction).top}%`, width: `${toPageRect(redaction).width}%`, height: `${toPageRect(redaction).height}%` }}>
                            <button type="button" onClick={() => removeRedaction(redaction.id)} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white shadow-sm">×</button>
                            <span className="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize rounded-sm border border-white bg-blue-600" onPointerDown={(event) => startRedactionInteraction(event, redaction, "resize")} />
                          </div>
                        ))}

                        {draft && draft.page === pageNumber ? (
                          <div className="pointer-events-none absolute z-30 rounded border border-blue-500 bg-blue-500/15" style={{ left: `${(Math.min(draft.startX, draft.startX + draft.width) / (pageTexture.width || 612)) * 100}%`, top: `${(Math.min(draft.startY, draft.startY + draft.height) / (pageTexture.height || 792)) * 100}%`, width: `${(Math.abs(draft.width) / (pageTexture.width || 612)) * 100}%`, height: `${(Math.abs(draft.height) / (pageTexture.height || 792)) * 100}%` }} />
                        ) : null}
                      </div>
                    </Document>
                  </div>
                </div>
              </div>

              {downloadUrl ? (
                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-700 dark:bg-emerald-950/40">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Redaction complete</p>
                      <h3 className="mt-2 text-2xl font-black text-emerald-900 dark:text-white">Final PDF ready</h3>
                    </div>
                    <button type="button" onClick={downloadFinalPdf} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm"><Download className="h-4 w-4" /> Download PDF</button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
