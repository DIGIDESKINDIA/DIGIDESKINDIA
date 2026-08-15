"use client";

import { useEffect, useState } from "react";

import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import { Scissors } from "lucide-react";

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

type AspectPreset = "free" | "1:1" | "4:3" | "16:9" | "35:45" | "51:51";

const PRESET_MAP: Record<Exclude<AspectPreset, "free">, number> = {
  "1:1": 1,
  "4:3": 4 / 3,
  "16:9": 16 / 9,
  "35:45": 35 / 45,
  "51:51": 1,
};

export default function CropImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(800);
  const [preset, setPreset] = useState<AspectPreset>("free");
  const [source, setSource] = useState<{ width: number; height: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [outputName, setOutputName] = useState("image-cropped.jpg");

  useEffect(() => {
    async function updateMeta() {
      if (!file) {
        setSource(null);
        return;
      }

      try {
        const dimensions = await getImageDimensions(file);
        setSource(dimensions);
        const defaultWidth = Math.max(1, Math.round(dimensions.width * 0.7));
        const defaultHeight = Math.max(1, Math.round(dimensions.height * 0.7));
        setLeft(Math.max(0, Math.floor((dimensions.width - defaultWidth) / 2)));
        setTop(Math.max(0, Math.floor((dimensions.height - defaultHeight) / 2)));
        setWidth(defaultWidth);
        setHeight(defaultHeight);
      } catch {
        setSource(null);
      }
    }

    updateMeta();
  }, [file]);

  function applyPreset(nextPreset: AspectPreset, baseWidth?: number) {
    setPreset(nextPreset);

    if (nextPreset === "free") {
      return;
    }

    const ratio = PRESET_MAP[nextPreset];
    const currentWidth = baseWidth ?? width;
    const nextHeight = Math.max(1, Math.round(currentWidth / ratio));
    setHeight(nextHeight);
  }

  function onWidthChange(nextWidth: number) {
    setWidth(nextWidth);

    if (preset !== "free" && nextWidth > 0) {
      const ratio = PRESET_MAP[preset];
      setHeight(Math.max(1, Math.round(nextWidth / ratio)));
    }
  }

  function onHeightChange(nextHeight: number) {
    setHeight(nextHeight);

    if (preset !== "free" && nextHeight > 0) {
      const ratio = PRESET_MAP[preset];
      setWidth(Math.max(1, Math.round(nextHeight * ratio)));
    }
  }

  async function crop() {
    if (!file) {
      toast.error("Please select an image.");
      return;
    }

    if (!width || !height) {
      toast.error("Enter crop width and height.");
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
      formData.append("left", String(left));
      formData.append("top", String(top));
      formData.append("width", String(width));
      formData.append("height", String(height));

      const response = await fetch("/api/image/crop", {
        method: "POST",
        body: formData,
      });

      clearInterval(timer);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Unable to crop image.");
      }

      const result = await response.blob();
      setBlob(result);
      setOutputName(getDownloadFileName(response.headers.get("content-disposition"), "image-cropped.jpg"));
      setProgress(100);
      toast.success("Image cropped successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Crop failed.");
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
    setPreset("free");
    setSource(null);
    setLeft(0);
    setTop(0);
    setWidth(800);
    setHeight(800);
    setOutputName("image-cropped.jpg");
  }

  return (
    <OperationLayout title="Crop Image" description="Crop images with real sharp-based processing." icon={<Scissors size={56} />}>
      <PdfToolLayout
        title="Crop Image"
        description="Upload an image, define the crop area and download the cropped result."
        sidebar={
          <div className="space-y-6">
            <ProgressBar progress={progress} status={processing ? "processing" : blob ? "completed" : "idle"} title="Crop Progress" description="Cropping your image." />
            <SettingsPanel title="Crop Settings" description="Define the crop rectangle.">
              <div>
                <label className="mb-2 block text-sm font-semibold">Aspect Ratio</label>
                <select
                  value={preset}
                  onChange={(e) => applyPreset(e.target.value as AspectPreset)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600"
                >
                  <option value="free">Free</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="4:3">4:3</option>
                  <option value="16:9">16:9</option>
                  <option value="35:45">35:45 (India Passport)</option>
                  <option value="51:51">51:51 (India Visa)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold">X</label>
                  <input type="number" min={0} value={left} onChange={(e) => setLeft(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold">Y</label>
                  <input type="number" min={0} value={top} onChange={(e) => setTop(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold">Width</label>
                  <input type="number" min={1} value={width} onChange={(e) => onWidthChange(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold">Height</label>
                  <input type="number" min={1} value={height} onChange={(e) => onHeightChange(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600" />
                </div>
              </div>

              {source && (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  Source: {source.width}x{source.height}px
                </div>
              )}
            </SettingsPanel>
          </div>
        }
      >
        <UploadZone multiple={false} maxFiles={1} accept="image/*" maxFileSize={MAX_IMAGE_FILE_SIZE} value={file ? [file] : []} onFilesChange={(files) => setFile(files[0] ?? null)} />
        {!file && <EmptyState title="Upload Image" description="Choose an image to crop." />}
        <ImagePreviewCard file={file} title="Input Preview" />
        <Toolbar title="Crop Image" processing={processing} canProcess={!!file && !!width && !!height} onProcess={crop} onReset={reset} onDownload={blob ? download : undefined} />
        {error && <ErrorCard title="Crop Failed" message={error} onRetry={crop} />}
        {blob && <SuccessCard title="Image Cropped Successfully" message="Your cropped image is ready for download." fileName={outputName} fileSize={blob.size} buttonText="Download Image" onDownload={download} onContinue={reset} />}
      </PdfToolLayout>
      <LoadingOverlay open={processing} progress={progress} title="Cropping Image" description="Please wait while DigiDesk India crops your image." />
    </OperationLayout>
  );
}
