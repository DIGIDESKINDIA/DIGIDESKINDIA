"use client";

import { useEffect, useState } from "react";

import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import { Minimize2 } from "lucide-react";

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
import { formatBytes, getDownloadFileName } from "@/lib/image/client";
import type { ImageFormat } from "@/lib/image/validation";

type CompressionFormat = "auto" | ImageFormat;

type CompressionStats = {
  originalSize: number;
  outputSize: number;
  reductionPercent: number;
};

export default function CompressImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState(82);
  const [format, setFormat] = useState<CompressionFormat>("auto");
  const [formats, setFormats] = useState<CompressionFormat[]>(["auto", "jpeg", "png", "webp"]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [outputName, setOutputName] = useState("image-compressed.jpg");
  const [stats, setStats] = useState<CompressionStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFormats() {
      try {
        const response = await fetch("/api/image/compress", { method: "GET" });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const values = Array.isArray(data.formats) ? data.formats : [];
        const allowed = values.filter(
          (value: unknown): value is CompressionFormat =>
            value === "auto" || value === "jpeg" || value === "png" || value === "webp" || value === "avif"
        );

        if (!cancelled && allowed.length) {
          setFormats(allowed);

          if (!allowed.includes(format)) {
            setFormat("auto");
          }
        }
      } catch {
        // Use defaults if capability endpoint is unavailable.
      }
    }

    loadFormats();

    return () => {
      cancelled = true;
    };
  }, [format]);

  async function compress() {
    if (!file) {
      toast.error("Please select an image.");
      return;
    }

    setProcessing(true);
    setBlob(null);
    setError("");
    setProgress(5);
    setStats(null);

    try {
      const timer = setInterval(() => {
        setProgress((value) => (value >= 90 ? value : value + 5));
      }, 150);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("quality", String(quality));
      formData.append("format", format);

      const response = await fetch("/api/image/compress", {
        method: "POST",
        body: formData,
      });

      clearInterval(timer);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Unable to compress image.");
      }

      const result = await response.blob();
      const fileName = getDownloadFileName(
        response.headers.get("content-disposition"),
        "image-compressed.jpg"
      );

      const originalSize = Number(response.headers.get("x-original-size") ?? file.size);
      const outputSize = Number(response.headers.get("x-output-size") ?? result.size);
      const reductionPercent = Number(response.headers.get("x-reduction-percent") ?? 0);

      setBlob(result);
      setOutputName(fileName);
      setStats({
        originalSize,
        outputSize,
        reductionPercent,
      });
      setProgress(100);
      toast.success("Image compressed successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compression failed.");
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
    setQuality(82);
    setFormat("auto");
    setOutputName("image-compressed.jpg");
    setStats(null);
  }

  return (
    <OperationLayout
      title="Compress Image"
      description="Reduce image size with real server-side compression while preserving the existing Digital Desk India styling."
      icon={<Minimize2 size={56} />}
    >
      <PdfToolLayout
        title="Compress Image"
        description="Upload an image, choose the compression quality, and download the optimized result."
        sidebar={
          <div className="space-y-6">
            <ProgressBar
              progress={progress}
              status={processing ? "processing" : blob ? "completed" : "idle"}
              title="Compression Progress"
              description="Compressing your image with sharp."
            />

            <SettingsPanel
              title="Compression Settings"
              description="Choose how aggressively the image should be compressed."
            >
              <div>
                <label className="mb-2 block text-sm font-semibold">Output Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as CompressionFormat)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600"
                >
                  {formats.map((value) => (
                    <option key={value} value={value}>
                      {value === "auto" ? "AUTO (Keep original)" : value.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Quality ({quality})</label>
                <input
                  type="range"
                  min={10}
                  max={95}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {stats && (
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-slate-500">Original</p>
                    <p className="font-semibold text-slate-900">{formatBytes(stats.originalSize)}</p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-slate-500">Compressed</p>
                    <p className="font-semibold text-slate-900">{formatBytes(stats.outputSize)}</p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-slate-500">Reduction</p>
                    <p className="font-semibold text-green-700">{stats.reductionPercent.toFixed(2)}%</p>
                  </div>
                </div>
              )}
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
            title="Upload Image"
            description="Choose a JPG, PNG or WEBP image to compress."
          />
        )}

        <ImagePreviewCard file={file} title="Input Preview" />

        <Toolbar
          title="Compress Image"
          processing={processing}
          canProcess={!!file}
          onProcess={compress}
          onReset={reset}
          onDownload={blob ? download : undefined}
        />

        {error && <ErrorCard title="Compression Failed" message={error} onRetry={compress} />}

        {blob && (
          <SuccessCard
            title="Image Compressed Successfully"
            message="Your compressed image is ready for download."
            fileName={outputName}
            fileSize={blob.size}
            buttonText="Download Image"
            onDownload={download}
            onContinue={reset}
          />
        )}
      </PdfToolLayout>

      <LoadingOverlay
        open={processing}
        progress={progress}
        title="Compressing Image"
        description="Please wait while DigiDesk India compresses your image."
      />
    </OperationLayout>
  );
}
