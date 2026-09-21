"use client";

import { useState } from "react";

import { saveAs } from "file-saver";

import toast from "react-hot-toast";

import {
  FileOutput,
  FileText,
  ScanText,
} from "lucide-react";

import OperationLayout from "@/components/pdf/OperationLayout";
import PdfToolLayout from "@/components/pdf/PdfToolLayout";
import UploadZone from "@/components/pdf/UploadZone";
import Toolbar from "@/components/pdf/Toolbar";
import ProgressBar from "@/components/pdf/ProgressBar";
import LoadingOverlay from "@/components/pdf/LoadingOverlay";
import SettingsPanel from "@/components/pdf/SettingsPanel";
import SuccessCard from "@/components/pdf/SuccessCard";
import ErrorCard from "@/components/pdf/ErrorCard";
import EmptyState from "@/components/pdf/EmptyState";

type ConversionMode = "standard" | "ocr";
type OcrLanguage = "eng" | "hin" | "eng+hin";

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ConversionMode>("standard");
  const [language, setLanguage] = useState<OcrLanguage>("eng");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [outputName, setOutputName] = useState("document.docx");
  const [error, setError] = useState("");

  function safeBaseName(name: string) {
    return (
      name
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9._ -]/g, "-")
        .trim() || "document"
    );
  }

  async function convert() {
    if (!file) {
      toast.error("Please select a PDF.");
      return;
    }

    setProcessing(true);
    setError("");
    setBlob(null);
    setProgress(5);

    try {
      const timer = setInterval(() => {
        setProgress((p) => (p >= 90 ? p : p + 5));
      }, 150);

      const formData = new FormData();

      formData.append("file", file);
      formData.append("mode", mode);
      formData.append("language", language);

      const response = await fetch("/api/pdf/pdf-to-word", {
        method: "POST",
        body: formData,
      });

      clearInterval(timer);

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(
          data?.message ?? "Unable to convert PDF to Word."
        );
      }

      const resultBlob = await response.blob();

      setBlob(resultBlob);
      setOutputName(`${safeBaseName(file.name)}.docx`);
      setProgress(100);

      toast.success("PDF converted to Word successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
    } finally {
      setProcessing(false);
    }
  }

  function download() {
    if (!blob) return;

    saveAs(blob, outputName);
  }

  function reset() {
    setFile(null);
    setBlob(null);
    setError("");
    setProgress(0);
  }

  return (
    <OperationLayout
      title="PDF to Word"
      description="Convert PDF files into editable Microsoft Word documents. Preserve text, headings and structure, or enable Advanced OCR to extract text from scanned PDFs."
      icon={<FileOutput size={56} />}
    >
      <PdfToolLayout
        title="PDF to Word"
        description="Upload a PDF and download an editable DOCX file with the original text, headings and page layout."
        sidebar={
          <div className="space-y-6">
            <SettingsPanel
              title="Convert Settings"
              description="Choose the conversion mode and OCR language."
            >
<div>
                <h3 className="text-sm font-bold text-slate-700">
                  Conversion Mode
                </h3>

                <div className="mt-3 grid gap-3">
                  <button
                    type="button"
                    onClick={() => setMode("standard")}
                    className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition ${
                      mode === "standard"
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <div
                      className={`rounded-xl p-3 ${
                        mode === "standard"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <FileText size={22} />
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900">
                        Standard
                      </h4>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Fast and common for most documents.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("ocr")}
                    className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition ${
                      mode === "ocr"
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <div
                      className={`rounded-xl p-3 ${
                        mode === "ocr"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <ScanText size={22} />
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900">
                        Advanced (OCR)
                      </h4>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Recognize text from scanned or image-based PDF
                        pages.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-700">
                  OCR Language
                </h3>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-2">
                  {(
                    [
                      ["eng", "English"],
                      ["hin", "Hindi"],
                      ["eng+hin", "English + Hindi"],
                    ] as [OcrLanguage, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLanguage(value)}
                      className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                        language === value
                          ? "bg-blue-600 text-white"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {label}

                      {language === value && (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                          Selected
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </SettingsPanel>
<ProgressBar
              progress={progress}
              status={
                processing
                  ? "processing"
                  : blob
                  ? "completed"
                  : "idle"
              }
              title="Conversion Progress"
              description="Building your Word document."
            />

            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold">File Summary</h3>

              {file ? (
                <div className="mt-5 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Name</span>
                    <span className="max-w-[180px] truncate font-semibold">
                      {file.name}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Size</span>
                    <span className="font-semibold">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Mode</span>
                    <span className="font-semibold">
                      {mode === "ocr" ? "Advanced (OCR)" : "Standard"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  No PDF selected.
                </p>
              )}
            </div>
          </div>
        }
      >
<UploadZone
          value={file ? [file] : []}
          multiple={false}
          accept=".pdf"
          maxFiles={1}
          onFilesChange={(files) =>
            setFile(files[0] ?? null)
          }
        />

        {!file && (
          <EmptyState
            title="Upload a PDF"
            description="Select a PDF document to convert into an editable Word file."
          />
        )}

        <Toolbar
          title="Convert Operation"
          processing={processing}
          canProcess={!!file}
          onProcess={convert}
          onReset={reset}
          onDownload={blob ? download : undefined}
        />

        {error && (
          <ErrorCard
            title="Conversion Failed"
            message={error}
            onRetry={convert}
          />
        )}

        {blob && (
          <SuccessCard
            title="Word Document Ready"
            message="Your PDF has been successfully converted into an editable Word document. Download the DOCX file below."
            fileName={outputName}
            fileSize={blob.size}
            buttonText="Download DOCX"
            onDownload={download}
            onContinue={reset}
          />
        )}
      </PdfToolLayout>

      <LoadingOverlay
        open={processing}
        progress={progress}
        title="Converting PDF to Word"
        description="Please wait while DigiDesk India securely converts your PDF into an editable Word document."
      />
    </OperationLayout>
  );
}