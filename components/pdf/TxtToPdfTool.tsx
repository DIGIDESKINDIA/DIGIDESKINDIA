"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Download, FileText, Loader2, UploadCloud } from "lucide-react";
import { saveAs } from "file-saver";

export default function TxtToPdfTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<Blob | null>(null);
  const [error, setError] = useState("");

  async function chooseFile(selected: File | null) {
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".txt")) {
      setError("Please select a TXT file.");
      return;
    }
    setFile(selected);
    setOutput(null);
    setError("");
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    void chooseFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  async function convert() {
    if (!file) {
      setError("Please select a TXT file first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "txt-to-pdf");
      const response = await fetch("/api/pdf/convert", { method: "POST", body: form });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "Conversion failed.");
      }
      setOutput(await response.blob());
    } catch (conversionError) {
      setError(conversionError instanceof Error ? conversionError.message : "Conversion failed.");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (output) saveAs(output, `${file?.name.replace(/\.txt$/i, "") || "document"}.pdf`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">DigiDesk PDF Tools</p>
          <h1 className="mt-3 text-4xl font-black">TXT to PDF</h1>
          <p className="mt-4 text-slate-600">Convert a plain text file into a readable PDF.</p>
        </div>
        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 text-center hover:border-blue-500 hover:bg-blue-50">
            <UploadCloud size={42} className="text-blue-600" />
            <span className="mt-4 text-xl font-bold">Choose a TXT file</span>
            <span className="mt-2 text-sm text-slate-600">Upload a text file to convert it to PDF</span>
            <input ref={inputRef} hidden type="file" accept=".txt,text/plain" onChange={handleChange} />
          </button>
          {file && <p className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 p-4 font-semibold"><FileText size={20} className="text-blue-600" />{file.name}</p>}
          {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
          {!output ? <button type="button" onClick={() => void convert()} disabled={loading || !file} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 font-bold text-white disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />} {loading ? "Creating PDF..." : "Convert to PDF"}</button> : <button type="button" onClick={download} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 font-bold text-white"><Download size={20} /> Download PDF</button>}
        </div>
      </section>
    </main>
  );
}
