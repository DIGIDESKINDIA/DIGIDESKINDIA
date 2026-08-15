"use client";

import { useState } from "react";

import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import { ShieldCheck } from "lucide-react";

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

export default function WatermarkImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("DigiDesk India");
  const [opacity, setOpacity] = useState(0.25);
  const [fontSize, setFontSize] = useState(42);
  const [position, setPosition] = useState<"center" | "top-left" | "top-right" | "bottom-left" | "bottom-right">("center");
  const [color, setColor] = useState("#ffffff");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [outputName, setOutputName] = useState("image-watermarked.jpg");

  async function watermark() {
    if (!file) {
      toast.error("Please select an image.");
      return;
    }

    if (!text.trim()) {
      toast.error("Enter watermark text.");
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
      formData.append("text", text);
      formData.append("opacity", String(opacity));
      formData.append("fontSize", String(fontSize));
      formData.append("position", position);
      formData.append("color", color);

      const response = await fetch("/api/image/watermark", {
        method: "POST",
        body: formData,
      });

      clearInterval(timer);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Unable to watermark image.");
      }

      const result = await response.blob();
      setBlob(result);
      setOutputName(getDownloadFileName(response.headers.get("content-disposition"), "image-watermarked.jpg"));
      setProgress(100);
      toast.success("Image watermarked successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Watermark failed.");
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
    setText("DigiDesk India");
    setOpacity(0.25);
    setFontSize(42);
    setPosition("center");
    setColor("#ffffff");
    setOutputName("image-watermarked.jpg");
  }

  return (
    <OperationLayout title="Watermark Image" description="Add a real text watermark to your image with sharp." icon={<ShieldCheck size={56} />}>
      <PdfToolLayout
        title="Watermark Image"
        description="Upload an image, customize the watermark and download the updated file."
        sidebar={
          <div className="space-y-6">
            <ProgressBar progress={progress} status={processing ? "processing" : blob ? "completed" : "idle"} title="Watermark Progress" description="Applying watermark to your image." />
            <SettingsPanel title="Watermark Settings" description="Customize the watermark text and placement.">
              <div>
                <label className="mb-2 block text-sm font-semibold">Watermark Text</label>
                <input type="text" value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Opacity ({opacity})</label>
                <input type="range" min={0.05} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Font Size</label>
                <input type="number" min={12} max={120} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold">Position</label>
                  <select value={position} onChange={(e) => setPosition(e.target.value as typeof position)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600">
                    <option value="center">Center</option>
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold">Color</label>
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-[52px] w-full rounded-xl border border-slate-300 px-2 py-2 outline-none transition focus:border-blue-600" />
                </div>
              </div>
            </SettingsPanel>
          </div>
        }
      >
        <UploadZone multiple={false} maxFiles={1} accept="image/*" maxFileSize={MAX_IMAGE_FILE_SIZE} value={file ? [file] : []} onFilesChange={(files) => setFile(files[0] ?? null)} />
        {!file && <EmptyState title="Upload Image" description="Choose an image to add a watermark." />}
        <ImagePreviewCard file={file} title="Input Preview" />
        <Toolbar title="Watermark Image" processing={processing} canProcess={!!file && !!text.trim()} onProcess={watermark} onReset={reset} onDownload={blob ? download : undefined} />
        {error && <ErrorCard title="Watermark Failed" message={error} onRetry={watermark} />}
        {blob && <SuccessCard title="Image Watermarked Successfully" message="Your watermarked image is ready for download." fileName={outputName} fileSize={blob.size} buttonText="Download Image" onDownload={download} onContinue={reset} />}
      </PdfToolLayout>
      <LoadingOverlay open={processing} progress={progress} title="Watermarking Image" description="Please wait while DigiDesk India adds the watermark." />
    </OperationLayout>
  );
}
