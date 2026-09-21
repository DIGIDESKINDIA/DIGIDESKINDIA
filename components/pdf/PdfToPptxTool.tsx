"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Download, FileText, Loader2, UploadCloud } from "lucide-react";
import { saveAs } from "file-saver";

import { PDF_TO_PPTX_MAX_FILE_SIZE } from "@/lib/pdf/pdf-to-pptx-config";

type Props = {
  title: string;
  description: string;
};

type ProgressState = {
  progress: number;
  currentPage: number;
  totalPages: number;
  phase: string;
  message: string;
};

const INITIAL_PROGRESS: ProgressState = {
  progress: 0,
  currentPage: 0,
  totalPages: 0,
  phase: "loading",
  message: "Uploading PDF...",
};

export default function PdfToPptxTool({ title, description }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [output, setOutput] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressState>(INITIAL_PROGRESS);
  const [jobId, setJobId] = useState("");

  function selectFile(selected: File | null) {
    if (!selected) return;
    if ((!selected.type || selected.type !== "application/pdf") && !/\.pdf$/i.test(selected.name)) {
      setError("Please select a valid PDF file.");
      return;
    }
    if (selected.size === 0) {
      setError("Selected PDF is empty.");
      return;
    }
    if (selected.size > PDF_TO_PPTX_MAX_FILE_SIZE) {
      setError("The PDF exceeds the 100 MB conversion limit.");
      return;
    }
    setFile(selected);
    setOutput(null);
    setJobId("");
    setError("");
    setProgress(INITIAL_PROGRESS);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  async function convert() {
    if (!file) {
      setError("Please select a PDF first.");
      return;
    }

    setLoading(true);
    setError("");
    setJobId("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/pdf/pdf-to-pptx?async=1", { method: "POST", body: form });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "PDF to PowerPoint conversion failed.");
      }
      let job = await response.json() as { jobId?: string };
      if (!job.jobId) throw new Error("Conversion job could not be started.");
      let activeJobId = job.jobId;
      setJobId(activeJobId);
      let jobRecoveryAttempted = false;

      while (true) {
        const statusResponse = await fetch(`/api/pdf/pdf-to-pptx/status?id=${encodeURIComponent(activeJobId)}`, { cache: "no-store" });
        if (statusResponse.status === 404 && !jobRecoveryAttempted) {
          jobRecoveryAttempted = true;
          const recoveryResponse = await fetch("/api/pdf/pdf-to-pptx?async=1", { method: "POST", body: form });
          const recoveryJob = await recoveryResponse.json().catch(() => null) as { jobId?: string; message?: string } | null;
          if (!recoveryResponse.ok || !recoveryJob?.jobId) throw new Error(recoveryJob?.message ?? "Conversion job expired and could not be restarted.");
          job = recoveryJob;
          activeJobId = recoveryJob.jobId;
          setJobId(activeJobId);
          continue;
        }
        const statusData = await statusResponse.json().catch(() => null);
        if (!statusResponse.ok || !statusData?.job) throw new Error(statusData?.message ?? "Conversion status is unavailable.");
        setProgress({
          progress: Number(statusData.job.progress) || 0,
          currentPage: Number(statusData.job.currentPage) || 0,
          totalPages: Number(statusData.job.totalPages) || 0,
          phase: String(statusData.job.phase || "processing-pages"),
          message: String(statusData.job.message || "Processing PDF..."),
        });
        if (statusData.job.status === "failed") throw new Error(statusData.job.message || "PDF to PowerPoint conversion failed.");
        if (statusData.job.status === "completed" && statusData.job.outputReady) break;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      const resultResponse = await fetch(`/api/pdf/pdf-to-pptx/result?id=${encodeURIComponent(activeJobId)}`, { cache: "no-store" });
      if (!resultResponse.ok) {
        const data = await resultResponse.json().catch(() => null);
        throw new Error(data?.message ?? "The completed PowerPoint could not be downloaded.");
      }
      setProgress((current) => ({ ...current, progress: 100, phase: "completed", message: "Conversion complete." }));
      setOutput(await resultResponse.blob());
    } catch (conversionError) {
      setProgress((current) => ({ ...current, phase: "failed", message: conversionError instanceof Error ? conversionError.message : "Conversion failed." }));
      setError(conversionError instanceof Error ? conversionError.message : "PDF to PowerPoint conversion failed.");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!output || !file) return;

    const fileName = `${file.name.replace(/\.pdf$/i, "") || "document"}.pptx`;

    if (jobId) {
      const anchor = document.createElement("a");
      anchor.href = `/api/pdf/pdf-to-pptx/result?id=${encodeURIComponent(jobId)}`;
      anchor.download = fileName;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return;
    }

    try {
      const objectUrl = URL.createObjectURL(output);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      return;
    } catch {
      saveAs(output, fileName);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">DigiDesk PDF Tools</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">{description}</p>
        </div>
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); selectFile(event.dataTransfer.files?.[0] ?? null); }}
            onClick={() => inputRef.current?.click()}
            className="flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 text-center hover:border-blue-400 hover:bg-blue-50/50"
          >
            <UploadCloud size={42} className="text-blue-600" />
            <h2 className="mt-5 text-xl font-bold">Drag & drop your PDF here</h2>
            <p className="mt-2 text-sm text-slate-600">or click to choose from your device</p>
            <button type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }} className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700">Choose File</button>
            <input ref={inputRef} hidden type="file" accept="application/pdf,.pdf" onChange={handleChange} />
          </div>
          {file && <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><FileText className="shrink-0 text-blue-600" size={22} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{file.name}</p><p className="text-sm text-slate-600">{(file.size / 1024).toFixed(1)} KB</p></div></div>}
          {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          {loading && <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4" aria-live="polite">
            <div className="flex items-center justify-between gap-3 text-sm font-bold text-blue-900">
              <span>{progress.message}</span>
              <span>{progress.progress}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-blue-100" role="progressbar" aria-label="PDF conversion progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.progress}>
              <div className="h-full rounded-full bg-blue-600 transition-[width] duration-200" style={{ width: `${progress.progress}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-semibold text-blue-800">
              <span>{progress.totalPages > 0 ? `Page ${progress.currentPage} of ${progress.totalPages}` : "Reading PDF..."}</span>
              <span className="capitalize">{progress.phase.replaceAll("-", " ")}</span>
            </div>
          </div>}
          {!output ? <button type="button" onClick={convert} disabled={loading || !file} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{loading ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}{loading ? "Converting PDF to PowerPoint" : "Convert to PowerPoint"}</button> : <button type="button" onClick={download} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 font-bold text-white hover:bg-emerald-700"><Download size={20} /> Download PPTX</button>}
        </div>
      </section>
    </main>
  );
}
