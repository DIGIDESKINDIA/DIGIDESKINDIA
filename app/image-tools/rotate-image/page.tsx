"use client";

import { useState } from "react";

import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import { RotateCw } from "lucide-react";

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

export default function RotateImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [angle, setAngle] = useState<90 | 180 | 270>(90);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [outputName, setOutputName] = useState("image-rotated.jpg");

  async function rotate() {
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
      formData.append("angle", String(angle));
      formData.append("flipHorizontal", String(flipHorizontal));
      formData.append("flipVertical", String(flipVertical));

      const response = await fetch("/api/image/rotate", {
        method: "POST",
        body: formData,
      });

      clearInterval(timer);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Unable to rotate image.");
      }

      const result = await response.blob();
      setBlob(result);
      setOutputName(getDownloadFileName(response.headers.get("content-disposition"), "image-rotated.jpg"));
      setProgress(100);
      toast.success("Image rotated successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rotation failed.");
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
    setAngle(90);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setOutputName("image-rotated.jpg");
  }

  return (
    <OperationLayout title="Rotate Image" description="Rotate images with the existing sharp pipeline." icon={<RotateCw size={56} />}>
      <PdfToolLayout
        title="Rotate Image"
        description="Upload an image, choose the angle and download the rotated output."
        sidebar={
          <div className="space-y-6">
            <ProgressBar progress={progress} status={processing ? "processing" : blob ? "completed" : "idle"} title="Rotation Progress" description="Rotating your image." />
            <SettingsPanel title="Rotation Settings" description="Choose the rotation angle.">
              <div>
                <label className="mb-2 block text-sm font-semibold">Angle</label>
                <div className="grid grid-cols-3 gap-3">
                  {[90, 180, 270].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAngle(value as 90 | 180 | 270)}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                        angle === value
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-300 text-slate-700 hover:border-blue-400"
                      }`}
                    >
                      {value}°
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={flipHorizontal}
                    onChange={(e) => setFlipHorizontal(e.target.checked)}
                  />
                  Flip Horizontal
                </label>

                <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={flipVertical}
                    onChange={(e) => setFlipVertical(e.target.checked)}
                  />
                  Flip Vertical
                </label>
              </div>
            </SettingsPanel>
          </div>
        }
      >
        <UploadZone multiple={false} maxFiles={1} accept="image/*" maxFileSize={MAX_IMAGE_FILE_SIZE} value={file ? [file] : []} onFilesChange={(files) => setFile(files[0] ?? null)} />
        {!file && <EmptyState title="Upload Image" description="Choose an image to rotate." />}
        <ImagePreviewCard file={file} title="Input Preview" />
        <Toolbar title="Rotate Image" processing={processing} canProcess={!!file} onProcess={rotate} onReset={reset} onDownload={blob ? download : undefined} />
        {error && <ErrorCard title="Rotation Failed" message={error} onRetry={rotate} />}
        {blob && <SuccessCard title="Image Rotated Successfully" message="Your rotated image is ready for download." fileName={outputName} fileSize={blob.size} buttonText="Download Image" onDownload={download} onContinue={reset} />}
      </PdfToolLayout>
      <LoadingOverlay open={processing} progress={progress} title="Rotating Image" description="Please wait while DigiDesk India rotates your image." />
    </OperationLayout>
  );
}
