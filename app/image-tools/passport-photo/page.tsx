"use client";

import { useState } from "react";

import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import { ScanFace } from "lucide-react";

import OperationLayout from "@/components/pdf/OperationLayout";
import PdfToolLayout from "@/components/pdf/PdfToolLayout";
import UploadZone from "@/components/pdf/UploadZone";
import ProgressBar from "@/components/pdf/ProgressBar";
import SettingsPanel from "@/components/pdf/SettingsPanel";
import EmptyState from "@/components/pdf/EmptyState";
import ErrorCard from "@/components/pdf/ErrorCard";
import SuccessCard from "@/components/pdf/SuccessCard";
import Toolbar from "@/components/image/Toolbar";
import LoadingOverlay from "@/components/image/LoadingOverlay";
import ImagePreviewCard from "@/components/image/ImagePreviewCard";

import { MAX_IMAGE_FILE_SIZE } from "@/lib/image/constants";
import { getDownloadFileName } from "@/lib/image/client";

type PassportTarget = "india-passport" | "india-visa";
type PassportOutput = "jpg" | "pdf";

export default function PassportPhotoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState<PassportTarget>("india-passport");
  const [outputFormat, setOutputFormat] = useState<PassportOutput>("jpg");
  const [copies, setCopies] = useState(8);
  const [yOffset, setYOffset] = useState(0);
  const [quality, setQuality] = useState(92);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [outputName, setOutputName] = useState("passport-sheet.jpg");

  async function generateSheet() {
    if (!file) {
      toast.error("Please select an image.");
      return;
    }

    setProcessing(true);
    setBlob(null);
    setError("");
    setProgress(5);

    try {
      const timer = setInterval(() => {
        setProgress((value) => (value >= 90 ? value : value + 5));
      }, 150);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("target", target);
      formData.append("outputFormat", outputFormat);
      formData.append("copies", String(copies));
      formData.append("yOffset", String(yOffset));
      formData.append("quality", String(quality));

      const response = await fetch("/api/image/passport-photo", {
        method: "POST",
        body: formData,
      });

      clearInterval(timer);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Unable to generate passport photo sheet.");
      }

      const result = await response.blob();
      const name = getDownloadFileName(
        response.headers.get("content-disposition"),
        outputFormat === "pdf" ? "passport-sheet.pdf" : "passport-sheet.jpg"
      );

      setBlob(result);
      setOutputName(name);
      setProgress(100);
      toast.success("Passport photo sheet generated successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Passport sheet generation failed.");
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
    setTarget("india-passport");
    setOutputFormat("jpg");
    setCopies(8);
    setYOffset(0);
    setQuality(92);
    setOutputName("passport-sheet.jpg");
  }

  return (
    <OperationLayout
      title="Passport Photo Maker"
      description="Generate a printable passport-photo sheet with real server-side processing and downloadable JPG/PDF output."
      icon={<ScanFace size={56} />}
    >
      <PdfToolLayout
        title="Passport Photo"
        description="Upload a source image, choose Indian passport or visa dimensions, and download a multi-copy printable sheet."
        sidebar={
          <div className="space-y-6">
            <ProgressBar
              progress={progress}
              status={processing ? "processing" : blob ? "completed" : "idle"}
              title="Generation Progress"
              description="Preparing passport photo sheet."
            />

            <SettingsPanel
              title="Passport Settings"
              description="Configure target size, alignment and sheet output format."
            >
              <div>
                <label className="mb-2 block text-sm font-semibold">Photo Standard</label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value as PassportTarget)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600"
                >
                  <option value="india-passport">India Passport (35x45 mm)</option>
                  <option value="india-visa">India Visa (51x51 mm)</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Output Format</label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value as PassportOutput)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600"
                >
                  <option value="jpg">Printable JPG Sheet</option>
                  <option value="pdf">Printable PDF Sheet</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Copies ({copies})</label>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={copies}
                  onChange={(e) => setCopies(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Vertical Offset ({yOffset})</label>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={1}
                  value={yOffset}
                  onChange={(e) => setYOffset(Number(e.target.value))}
                  className="w-full"
                />
                <p className="mt-2 text-xs text-slate-500">Use negative values to move crop upward, positive values to move it downward.</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Quality ({quality})</label>
                <input
                  type="range"
                  min={60}
                  max={100}
                  step={1}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </SettingsPanel>
          </div>
        }
      >
        <UploadZone
          multiple={false}
          maxFiles={1}
          accept="image/*"
          maxFileSize={MAX_IMAGE_FILE_SIZE}
          value={file ? [file] : []}
          onFilesChange={(files) => setFile(files[0] ?? null)}
        />

        {!file && (
          <EmptyState
            title="Upload Portrait"
            description="Choose a clear front-facing image to generate your passport sheet."
          />
        )}

        <ImagePreviewCard file={file} title="Input Preview" />

        <Toolbar
          title="Generate Passport Sheet"
          processing={processing}
          canProcess={!!file}
          onProcess={generateSheet}
          onReset={reset}
          onDownload={blob ? download : undefined}
        />

        {error && (
          <ErrorCard
            title="Passport Sheet Failed"
            message={error}
            onRetry={generateSheet}
          />
        )}

        {blob && (
          <SuccessCard
            title="Passport Sheet Ready"
            message="Your printable passport-photo sheet has been generated successfully."
            fileName={outputName}
            fileSize={blob.size}
            buttonText="Download Sheet"
            onDownload={download}
            onContinue={reset}
          />
        )}
      </PdfToolLayout>

      <LoadingOverlay
        open={processing}
        progress={progress}
        title="Generating Passport Sheet"
        description="Please wait while DigiDesk India prepares your printable photo sheet."
      />
    </OperationLayout>
  );
}