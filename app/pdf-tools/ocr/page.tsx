"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FileText, Loader2, RefreshCcw, ScanText, UploadCloud, XCircle } from "lucide-react";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";

import OperationLayout from "@/components/pdf/OperationLayout";
import PdfToolLayout from "@/components/pdf/PdfToolLayout";
import SettingsPanel from "@/components/pdf/SettingsPanel";
import { OCR_LANGUAGES, type OcrLanguage } from "@/lib/pdf/ocr-constants";

type OcrProgress = {
  message: string;
  progress: number;
  currentPage?: number;
  totalPages?: number;
  status: "idle" | "processing" | "completed";
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 2)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
}

export default function OcrToolPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<OcrLanguage[]>(["eng"]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OcrProgress>({ message: "Waiting for PDF upload.", progress: 0, status: "idle" });
  const [result, setResult] = useState<{ blob: Blob; fileName: string } | null>(null);
  const [error, setError] = useState<string>("");

  const pageCountLabel = useMemo(() => {
    if (!file) return "No file selected";
    return "Ready for OCR";
  }, [file]);

  function validateFile(candidate: File | null) {
    if (!candidate) return "Please select a PDF file.";
    if (candidate.size <= 0) return "The PDF is empty.";
    if (!(candidate.type === "application/pdf" || /\.pdf$/i.test(candidate.name))) return "Only PDF files are supported.";
    return "";
  }

  function onSelectFile(candidate: File | null) {
    const validationError = validateFile(candidate);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(candidate);
    setError("");
    setProgress({ message: "PDF ready. Choose OCR language and start processing.", progress: 0, status: "idle" });
    setResult(null);
  }

  function toggleLanguage(language: OcrLanguage) {
    if (language === "eng+hin") {
      setSelectedLanguages(["eng+hin"]);
      return;
    }

    setSelectedLanguages((current) => {
      if (current.includes(language)) {
        return current.filter((value) => value !== language);
      }
      const next = [...current.filter((item) => item !== "eng+hin"), language];
      return next.length ? next : ["eng"];
    });
  }

  async function startOcr() {
    if (!file) {
      toast.error("Please select a PDF first.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setResult(null);
    setProgress({ message: "Preparing PDF for OCR", progress: 5, currentPage: 0, totalPages: 0, status: "processing" });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", selectedLanguages.join(","));

    try {
      const response = await fetch("/api/pdf/ocr", {
        method: "POST",
        body: formData,
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? "OCR failed to start.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          const eventName = lines.find((line) => line.startsWith("event:"))?.replace("event:", "").trim();
          const dataLine = lines.find((line) => line.startsWith("data:"));
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine.replace("data:", "").trim());

          if (eventName === "progress") {
            setProgress({
              message: payload.message ?? "Processing PDF",
              progress: Number(payload.progress ?? 0),
              currentPage: payload.currentPage,
              totalPages: payload.totalPages,
              status: "processing",
            });
            continue;
          }

          if (eventName === "result") {
            const nextBlob = new Blob([Uint8Array.from(Buffer.from(payload.pdfBase64, "base64"))], { type: "application/pdf" });
            setResult({ blob: nextBlob, fileName: payload.outputName ?? `${file.name.replace(/\.pdf$/i, "")}-ocr.pdf` });
            setProgress({
              message: "Completed. Your searchable PDF is ready.",
              progress: 100,
              currentPage: payload.pages,
              totalPages: payload.pages,
              status: "completed",
            });
            toast.success("OCR complete. Your searchable PDF is ready.");
            continue;
          }

          if (eventName === "error") {
            throw new Error(payload.message ?? "OCR failed while processing this PDF.");
          }
        }
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unexpected OCR failure.";
      setError(message);
      setProgress({ message: message, progress: 0, status: "idle" });
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDownload() {
    if (!result) return;
    saveAs(result.blob, result.fileName);
  }

  return (
    <OperationLayout
      title="OCR PDF"
      description="Make scanned PDFs searchable and selectable using a local Tesseract-based OCR pipeline."
      icon={<ScanText size={56} />}
    >
      <PdfToolLayout
        title="OCR PDF"
        description="Make scanned PDFs searchable and selectable while preserving the original page appearance."
        sidebar={
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">OCR language</p>
                  <h3 className="mt-2 text-xl font-black text-slate-900">Document language</h3>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {OCR_LANGUAGES.map((language) => {
                  const label = language === "eng" ? "English" : language === "hin" ? "Hindi" : "English + Hindi";
                  const selected = selectedLanguages.includes(language as OcrLanguage);
                  return (
                    <button
                      key={language}
                      type="button"
                      onClick={() => toggleLanguage(language as OcrLanguage)}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${selected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
                    >
                      <span className="font-semibold">{label}</span>
                      {selected ? <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">Selected</span> : null}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Status</p>
                  <h3 className="mt-2 text-xl font-black text-slate-900">Processing details</h3>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span>Stage</span>
                  <span className="font-semibold text-slate-900">{progress.message}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span>Progress</span>
                  <span className="font-semibold text-blue-700">{progress.progress}%</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span>PDF pages</span>
                  <span className="font-semibold text-slate-900">{progress.currentPage ?? 0} / {progress.totalPages ?? (file ? 1 : 0)}</span>
                </div>
              </div>
            </section>
          </div>
        }
        uploader={
          <div className="space-y-4">
            <div
              className="cursor-pointer rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center transition hover:border-blue-500 hover:bg-slate-50"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => { event.preventDefault(); }}
              onDrop={(event) => {
                event.preventDefault();
                onSelectFile(event.dataTransfer.files?.[0] ?? null);
              }}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <UploadCloud size={32} />
              </div>
              <h3 className="mt-5 text-2xl font-black text-slate-900">Upload PDF</h3>
              <p className="mt-2 text-sm text-slate-500">Drag and drop or click to select a PDF</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">PDF only · up to 50 MB</p>
            </div>

            <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)} />

            {file && (
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
                      <FileText size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">{file.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatBytes(file.size)} • {pageCountLabel}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setFile(null)} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200" aria-label="Remove selected file">
                    <XCircle size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        }
        progress={
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Progress</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">{progress.status === "completed" ? "Completed" : isProcessing ? "OCR in progress" : "Ready"}</h2>
              </div>
              {isProcessing ? <Loader2 className="animate-spin text-blue-600" size={28} /> : null}
            </div>
            <p className="mt-3 text-sm text-slate-600">{progress.message}</p>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, progress.progress))}%` }} />
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <span>{progress.currentPage ?? 0} / {progress.totalPages ?? (file ? 1 : 0)} pages</span>
              <span className="font-bold text-blue-700">{Math.round(progress.progress)}%</span>
            </div>
          </section>
        }
        result={
          result ? (
            <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-500">Success</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">Searchable PDF ready</h2>
                  <p className="mt-2 text-sm text-slate-600">{result.fileName}</p>
                </div>
                <button type="button" onClick={() => handleDownload()} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500 px-5 py-3 text-sm font-bold text-white shadow-lg">
                  <Download size={18} /> Download
                </button>
              </div>
            </section>
          ) : null
        }
        children={
          <div className="space-y-6">
            <SettingsPanel title="OCR settings" description="Choose the language set to recognize in your PDF.">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">Selected languages</p>
                  <p className="mt-2 text-sm text-slate-500">{selectedLanguages.length ? selectedLanguages.join(" + ") : "English"}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li>• Page-by-page OCR processing preserves the original PDF layout.</li>
                    <li>• Searchable text is embedded as an invisible text layer.</li>
                    <li>• English and Hindi language packs are handled locally without remote uploads.</li>
                  </ul>
                </div>
              </div>
            </SettingsPanel>

            {error ? (
              <section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
                <div className="flex items-start gap-3">
                  <XCircle className="mt-0.5" size={20} />
                  <div>
                    <h3 className="font-black">OCR failed</h3>
                    <p className="mt-2 text-sm">{error}</p>
                  </div>
                </div>
              </section>
            ) : null}

            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={startOcr}
                disabled={!file || isProcessing}
                className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500 px-8 py-4 text-lg font-bold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <ScanText size={20} />}
                {isProcessing ? "Processing..." : "Start OCR"}
              </button>

              <button type="button" onClick={() => { setFile(null); setResult(null); setError(""); setProgress({ message: "Waiting for PDF upload.", progress: 0, status: "idle" }); }} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-4 text-lg font-bold text-slate-700">
                <RefreshCcw size={18} /> Reset
              </button>
            </div>
          </div>
        }
      />
    </OperationLayout>
  );
}
