"use client";

import { useEffect, useState } from "react";

import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import { FileImage } from "lucide-react";

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
import type { ImageFormat } from "@/lib/image/validation";
import { getDownloadFileName } from "@/lib/image/client";

const FALLBACK_FORMATS: ImageFormat[] = ["jpeg", "png", "webp"];

export default function ConvertImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ImageFormat>("png");
  const [formats, setFormats] = useState<ImageFormat[]>(FALLBACK_FORMATS);
  const [quality, setQuality] = useState(85);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [outputName, setOutputName] = useState("image-converted.png");

  useEffect(() => {
    let cancelled = false;

    async function loadFormats() {
      try {
        const response = await fetch("/api/image/convert", { method: "GET" });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const values = Array.isArray(data.formats) ? data.formats : [];
        const allowed = values.filter(
          (value: unknown): value is ImageFormat =>
            value === "jpeg" || value === "png" || value === "webp" || value === "avif"
        );

        if (!cancelled && allowed.length) {
          setFormats(allowed);

          if (!allowed.includes(format)) {
            setFormat(allowed[0]);
          }
        }
      } catch {
        // Keep fallback formats.
      }
    }

    loadFormats();

    return () => {
      cancelled = true;
    };
  }, [format]);

  async function convert() {
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
      formData.append("format", format);
      formData.append("quality", String(quality));

      const response = await fetch("/api/image/convert", {
        method: "POST",
        body: formData,
      });

      clearInterval(timer);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Unable to convert image.");
      }

      const result = await response.blob();
      setBlob(result);
      setOutputName(getDownloadFileName(response.headers.get("content-disposition"), `image-converted.${format === "jpeg" ? "jpg" : format}`));
      setProgress(100);
      toast.success("Image converted successfully.");
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
    setFormat("png");
    setQuality(85);
    setOutputName("image-converted.png");
  }

  return (
    <OperationLayout title="Convert Image" description="Convert between JPG, PNG and WEBP using sharp." icon={<FileImage size={56} />}>
      <PdfToolLayout
        title="Convert Image"
        description="Upload an image, select the output format and download the converted file."
        sidebar={
          <div className="space-y-6">
            <ProgressBar progress={progress} status={processing ? "processing" : blob ? "completed" : "idle"} title="Conversion Progress" description="Converting your image." />
            <SettingsPanel title="Conversion Settings" description="Select the output format and quality.">
              <div>
                <label className="mb-2 block text-sm font-semibold">Output Format</label>
                <select value={format} onChange={(e) => setFormat(e.target.value as ImageFormat)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600">
                  {formats.map((value) => (
                    <option key={value} value={value}>
                      {value.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Quality ({quality})</label>
                <input type="range" min={10} max={95} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full" />
              </div>
            </SettingsPanel>
          </div>
        }
      >
        <UploadZone multiple={false} maxFiles={1} accept="image/*" maxFileSize={MAX_IMAGE_FILE_SIZE} value={file ? [file] : []} onFilesChange={(files) => setFile(files[0] ?? null)} />
        {!file && <EmptyState title="Upload Image" description="Choose a JPG, PNG or WEBP image to convert." />}
        <ImagePreviewCard file={file} title="Input Preview" />
        <Toolbar title="Convert Image" processing={processing} canProcess={!!file} onProcess={convert} onReset={reset} onDownload={blob ? download : undefined} />
        {error && <ErrorCard title="Conversion Failed" message={error} onRetry={convert} />}
        {blob && <SuccessCard title="Image Converted Successfully" message="Your converted image is ready for download." fileName={outputName} fileSize={blob.size} buttonText="Download Image" onDownload={download} onContinue={reset} />}
      </PdfToolLayout>
      <LoadingOverlay open={processing} progress={progress} title="Converting Image" description="Please wait while DigiDesk India converts your image." />
    </OperationLayout>
  );
}
