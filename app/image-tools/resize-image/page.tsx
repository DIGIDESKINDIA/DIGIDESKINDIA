"use client";

import { useEffect, useState } from "react";

import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import { Maximize2 } from "lucide-react";

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
import { getDownloadFileName, getImageDimensions } from "@/lib/image/client";

type ResizeMode = "dimensions" | "percentage";

export default function ResizeImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(1200);
  const [mode, setMode] = useState<ResizeMode>("dimensions");
  const [percentage, setPercentage] = useState(100);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [original, setOriginal] = useState<{ width: number; height: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [outputName, setOutputName] = useState("image-resized.jpg");

  useEffect(() => {
    async function updateMeta() {
      if (!file) {
        setOriginal(null);
        return;
      }

      try {
        const dimensions = await getImageDimensions(file);
        setOriginal(dimensions);
        setWidth(dimensions.width);
        setHeight(dimensions.height);
        setPercentage(100);
      } catch {
        setOriginal(null);
      }
    }

    updateMeta();
  }, [file]);

  function onWidthChange(nextWidth: number) {
    setWidth(nextWidth);

    if (lockAspectRatio && original && nextWidth > 0) {
      const ratio = original.height / original.width;
      setHeight(Math.max(1, Math.round(nextWidth * ratio)));
    }
  }

  function onHeightChange(nextHeight: number) {
    setHeight(nextHeight);

    if (lockAspectRatio && original && nextHeight > 0) {
      const ratio = original.width / original.height;
      setWidth(Math.max(1, Math.round(nextHeight * ratio)));
    }
  }

  function onPercentageChange(nextPercentage: number) {
    setPercentage(nextPercentage);

    if (original) {
      setWidth(Math.max(1, Math.round((original.width * nextPercentage) / 100)));
      setHeight(Math.max(1, Math.round((original.height * nextPercentage) / 100)));
    }
  }

  async function resize() {
    if (!file) {
      toast.error("Please select an image.");
      return;
    }

    if (!width || !height || width < 1 || height < 1) {
      toast.error("Enter width and height.");
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
      formData.append("width", String(width));
      formData.append("height", String(height));

      const response = await fetch("/api/image/resize", {
        method: "POST",
        body: formData,
      });

      clearInterval(timer);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Unable to resize image.");
      }

      const result = await response.blob();
      setBlob(result);
      setOutputName(getDownloadFileName(response.headers.get("content-disposition"), "image-resized.jpg"));
      setProgress(100);
      toast.success("Image resized successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resize failed.");
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
    setMode("dimensions");
    setPercentage(100);
    setLockAspectRatio(true);
    setOriginal(null);
    setWidth(1200);
    setHeight(1200);
    setOutputName("image-resized.jpg");
  }

  return (
    <OperationLayout
      title="Resize Image"
      description="Resize images using the existing sharp-based processing pipeline."
      icon={<Maximize2 size={56} />}
    >
      <PdfToolLayout
        title="Resize Image"
        description="Upload an image, set the target size and download the resized result."
        sidebar={
          <div className="space-y-6">
            <ProgressBar progress={progress} status={processing ? "processing" : blob ? "completed" : "idle"} title="Resize Progress" description="Resizing your image." />
            <SettingsPanel title="Resize Settings" description="Choose the target width and height.">
              <div>
                <label className="mb-2 block text-sm font-semibold">Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as ResizeMode)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600"
                >
                  <option value="dimensions">Custom Dimensions</option>
                  <option value="percentage">Percentage Resize</option>
                </select>
              </div>

              <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={lockAspectRatio}
                  onChange={(e) => setLockAspectRatio(e.target.checked)}
                />
                Lock Aspect Ratio
              </label>

              {mode === "percentage" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold">Resize Percentage ({percentage}%)</label>
                  <input
                    type="range"
                    min={10}
                    max={200}
                    step={1}
                    value={percentage}
                    onChange={(e) => onPercentageChange(Number(e.target.value))}
                    className="w-full"
                    disabled={!original}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold">Width</label>
                  <input type="number" min={1} value={width} onChange={(e) => onWidthChange(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold">Height</label>
                  <input type="number" min={1} value={height} onChange={(e) => onHeightChange(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600" />
                </div>
              </div>

              {original && (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  Original: {original.width}x{original.height}px
                </div>
              )}
            </SettingsPanel>
          </div>
        }
      >
        <UploadZone multiple={false} maxFiles={1} accept="image/*" maxFileSize={MAX_IMAGE_FILE_SIZE} value={file ? [file] : []} onFilesChange={(files) => setFile(files[0] ?? null)} />
        {!file && <EmptyState title="Upload Image" description="Choose a JPG, PNG or WEBP image to resize." />}
        <ImagePreviewCard file={file} title="Input Preview" />
        <Toolbar title="Resize Image" processing={processing} canProcess={!!file && !!width && !!height} onProcess={resize} onReset={reset} onDownload={blob ? download : undefined} />
        {error && <ErrorCard title="Resize Failed" message={error} onRetry={resize} />}
        {blob && <SuccessCard title="Image Resized Successfully" message="Your resized image is ready for download." fileName={outputName} fileSize={blob.size} buttonText="Download Image" onDownload={download} onContinue={reset} />}
      </PdfToolLayout>
      <LoadingOverlay open={processing} progress={progress} title="Resizing Image" description="Please wait while DigiDesk India resizes your image." />
    </OperationLayout>
  );
}
