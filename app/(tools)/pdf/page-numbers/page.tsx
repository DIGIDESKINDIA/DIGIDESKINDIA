"use client";

import { useState } from "react";

import { saveAs } from "file-saver";

import toast from "react-hot-toast";

import {
  Hash,
} from "lucide-react";

import OperationLayout from "@/components/pdf/OperationLayout";
import PdfToolLayout from "@/components/pdf/PdfToolLayout";
import UploadZone from "@/components/pdf/UploadZone";
import PageSelector from "@/components/pdf/PageSelector";
import Toolbar from "@/components/pdf/Toolbar";
import ProgressBar from "@/components/pdf/ProgressBar";
import LoadingOverlay from "@/components/pdf/LoadingOverlay";
import SettingsPanel from "@/components/pdf/SettingsPanel";
import EmptyState from "@/components/pdf/EmptyState";
import ErrorCard from "@/components/pdf/ErrorCard";
import SuccessCard from "@/components/pdf/SuccessCard";

export default function PageNumbersPage() {
  const [file, setFile] =
    useState<File | null>(null);

  const [totalPages, setTotalPages] =
    useState(1);

  const [pages, setPages] =
    useState<number[]>([]);

  const [startFrom, setStartFrom] =
    useState(1);

  const [fontSize, setFontSize] =
    useState(12);

  const [position, setPosition] =
    useState<"top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right">("bottom-center");

  const [margins, setMargins] =
    useState<"narrow" | "default" | "wide">("default");

  const [processing, setProcessing] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [blob, setBlob] =
    useState<Blob | null>(null);

  const [error, setError] =
    useState("");

  async function addNumbers() {
    if (!file) {
      toast.error(
        "Please select a PDF."
      );
      return;
    }

    setProcessing(true);
    setBlob(null);
    setError("");
    setProgress(5);

    try {
      const timer =
        setInterval(() => {
          setProgress((p) =>
            p >= 90
              ? p
              : p + 5
          );
        }, 150);

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "pages",
        pages.join(",")
      );

      formData.append(
        "startFrom",
        String(startFrom)
      );

      formData.append(
        "fontSize",
        String(fontSize)
      );

      formData.append("position", position);
      formData.append("margins", margins);

      const response =
        await fetch(
          "/api/pdf/page-numbers",
          {
            method: "POST",
            body: formData,
          }
        );

      clearInterval(timer);

      if (!response.ok) {
        const data =
          await response.json();

        throw new Error(
          data.message ??
            "Unable to add page numbers."
        );
      }

      const result =
        await response.blob();

      setBlob(result);

      setProgress(100);

      toast.success(
        "Page numbers added successfully."
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Operation failed."
      );
    } finally {
      setProcessing(false);
    }
  }
    function download() {
    if (!blob) return;

    saveAs(
      blob,
      "Page-Numbers.pdf"
    );
  }

  function reset() {
    setFile(null);
    setBlob(null);
    setError("");
    setProgress(0);

    setPages([]);
    setTotalPages(1);

    setStartFrom(1);
    setFontSize(12);
    setPosition("bottom-center");
    setMargins("default");
  }

  async function loadPreview(
    selected: File
  ) {
    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        selected
      );

      const response =
        await fetch(
          "/api/pdf/preview",
          {
            method: "POST",
            body: formData,
          }
        );

      if (!response.ok) return;

      const data =
        await response.json();

      setTotalPages(
        data.totalPages ?? 1
      );
    } catch {
      setTotalPages(1);
    }
  }

  return (
    <OperationLayout
      title="Add Page Numbers"
      description="Insert professional page numbers into your PDF with customizable position, font size and starting number."
      icon={<Hash size={56} />}
    >
      <PdfToolLayout
        title="Page Numbers"
        description="Upload your PDF, choose where numbering should begin, customize the appearance and generate the final document."
        sidebar={
          <div className="space-y-6">

            <ProgressBar
              progress={progress}
              status={
                processing
                  ? "processing"
                  : blob
                  ? "completed"
                  : "idle"
              }
              title="Processing"
              description="Adding page numbers to your PDF."
            />

            <SettingsPanel
              title="Number Settings"
              description="Customize numbering options."
            >

              <div>

                <label className="mb-2 block text-sm font-semibold">

                  Start Number

                </label>

                <input
                  type="number"
                  min={1}
                  value={startFrom}
                  onChange={(e) =>
                    setStartFrom(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-600 focus:outline-none"
                />

              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Position</label>
                <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-300">
                  {(["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-label={option}
                      aria-pressed={position === option}
                      onClick={() => setPosition(option)}
                      className={`h-12 border-b border-r border-slate-200 transition ${position === option ? "bg-blue-600 text-white" : "bg-white hover:bg-blue-50"}`}
                    >
                      <span className={`mx-auto block h-5 w-5 rounded-full border-2 ${position === option ? "border-white bg-blue-600 ring-2 ring-white ring-inset" : "border-slate-400"}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Margins</label>
                <select
                  value={margins}
                  onChange={(e) => setMargins(e.target.value as typeof margins)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 focus:border-blue-600 focus:outline-none"
                >
                  <option value="narrow">Narrow</option>
                  <option value="default">Default</option>
                  <option value="wide">Wide</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Font Size</label>
                <input
                  type="number"
                  min={8}
                  max={72}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-600 focus:outline-none"
                />
              </div>

            </SettingsPanel>

          </div>
        }
      >

        <UploadZone
          multiple={false}
          maxFiles={1}
          accept=".pdf"
          value={
            file
              ? [file]
              : []
          }
          onFilesChange={async (
            files
          ) => {
            const selected =
              files[0] ?? null;

            setFile(selected);

            setPages([]);

            if (selected) {
              await loadPreview(
                selected
              );
            }
          }}
        />

        {!file ? (
          <EmptyState
            title="Upload PDF"
            description="Upload a PDF document to add page numbers."
          />
        ) : (
          <PageSelector
            totalPages={totalPages}
            value={pages}
            onChange={setPages}
          />
        )}

        <Toolbar
          title="Add Page Numbers"
          processing={processing}
          canProcess={!!file}
          onProcess={addNumbers}
          onReset={reset}
          onDownload={
            blob
              ? download
              : undefined
          }
        />
                {error && (
          <ErrorCard
            title="Page Numbering Failed"
            message={error}
            onRetry={addNumbers}
          />
        )}

        {blob && (
          <SuccessCard
            title="Page Numbers Added"
            message={`Page numbering has been successfully applied${
              pages.length
                ? ` to ${pages.length} selected page${
                    pages.length > 1 ? "s" : ""
                  }`
                : " to all pages"
            }. Your PDF is ready for download.`}
            fileName="Page-Numbers.pdf"
            fileSize={blob.size}
            buttonText="Download PDF"
            onDownload={download}
            onContinue={reset}
          />
        )}

      </PdfToolLayout>

      <LoadingOverlay
        open={processing}
        progress={progress}
        title="Adding Page Numbers"
        description="Please wait while DigiDesk India inserts page numbers into your PDF securely."
      />

    </OperationLayout>
  );
}