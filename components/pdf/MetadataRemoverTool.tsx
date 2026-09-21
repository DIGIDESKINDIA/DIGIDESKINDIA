"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Download, FileText, Loader2, UploadCloud } from "lucide-react";
import { saveAs } from "file-saver";

type MetadataItem = { category: string; key: string; value: string; sensitive: boolean };
type Analysis = { hasMetadata: boolean; count: number; items: MetadataItem[] };
type RemovalResult = { downloadUrl: string; fileName: string };

const ACCEPTED = ".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png";

export default function MetadataRemoverTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [output, setOutput] = useState<RemovalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Choose a file to analyze.");
  const [error, setError] = useState<string | null>(null);

  async function selectFile(selected: File | null) {
    if (!selected || !/\.(pdf|docx|xlsx|pptx|jpe?g|png)$/i.test(selected.name)) return;
    setFile(selected);
    setAnalysis(null);
    setOutput(null);
    setError(null);
    setLoading(true);
    setStatus("Analyzing metadata...");
    try {
      const form = new FormData();
      form.append("file", selected);
      const response = await fetch("/api/tools/metadata-remover/analyze", { method: "POST", body: form });
      const body = await response.json() as { metadata?: Analysis; error?: { message?: string } };
      if (!response.ok || !body.metadata) throw new Error(body.error?.message || "Unable to analyze this file.");
      setAnalysis(body.metadata);
      setStatus(body.metadata.count ? `${body.metadata.count} metadata item${body.metadata.count === 1 ? "" : "s"} detected.` : "No removable metadata detected.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to analyze this file.");
      setStatus("Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  function change(event: ChangeEvent<HTMLInputElement>) {
    void selectFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  async function removeMetadata() {
    if (!file || !analysis) return;
    setLoading(true);
    setError(null);
    setStatus("Removing metadata and verifying the cleaned file...");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/tools/metadata-remover/remove", { method: "POST", body: form });
      const body = await response.json() as { downloadUrl?: string; error?: { message?: string } };
      if (!response.ok || !body.downloadUrl) throw new Error(body.error?.message || "Unable to remove metadata.");
      setOutput({ downloadUrl: body.downloadUrl, fileName: `${file.name.replace(/\.[^.]+$/, "")}-cleaned${file.name.match(/\.[^.]+$/)?.[0] || ".bin"}` });
      setStatus("Metadata removal verified. Your cleaned file is ready.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to remove metadata.");
      setStatus("Removal failed.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadCleanFile() {
    if (!output) return;
    const response = await fetch(output.downloadUrl);
    if (!response.ok) {
      setError("The cleaned file is no longer available. Please process the file again.");
      return;
    }
    saveAs(await response.blob(), output.fileName);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-3xl">
        <div className="text-center"><p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">DigiDesk Security</p><h1 className="mt-3 text-4xl font-black">Metadata Remover</h1><p className="mt-4 text-slate-600">Remove metadata from PDF, Office, and image files.</p></div>
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-blue-500 hover:bg-blue-50"><UploadCloud size={42} className="text-blue-600" /><span className="mt-4 text-xl font-bold">Choose a file</span><span className="mt-2 text-sm text-slate-600">PDF, DOCX, XLSX, PPTX, JPG, JPEG, or PNG</span><input ref={inputRef} hidden type="file" accept={ACCEPTED} onChange={change} /></button>
          {file && <p className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-4 font-semibold"><FileText size={20} className="text-blue-600" />{file.name}</p>}
          <p className="mt-4 text-sm text-slate-600" aria-live="polite">{status}</p>
          {analysis?.items.length ? <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="font-bold">Metadata detected</p><ul className="mt-2 space-y-1 text-sm text-slate-600">{analysis.items.map((item) => <li key={`${item.category}-${item.key}`}>{item.key}: {item.value}</li>)}</ul></div> : null}
          {error ? <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
          {!output ? <button type="button" onClick={() => void removeMetadata()} disabled={!file || !analysis || loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 font-bold text-white disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />} {loading ? "Processing..." : "Remove Metadata"}</button> : <button type="button" onClick={() => void downloadCleanFile()} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 font-bold text-white"><Download size={20} /> Download Clean File</button>}
        </div>
      </section>
    </main>
  );
}
