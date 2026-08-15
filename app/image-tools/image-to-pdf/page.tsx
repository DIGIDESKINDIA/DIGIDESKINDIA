"use client";

import { useState } from "react";

import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import { FileText } from "lucide-react";

import OperationLayout from "@/components/pdf/OperationLayout";
import PdfToolLayout from "@/components/pdf/PdfToolLayout";
import UploadZone from "@/components/pdf/UploadZone";
import ProgressBar from "@/components/pdf/ProgressBar";
import EmptyState from "@/components/pdf/EmptyState";
import ErrorCard from "@/components/pdf/ErrorCard";
import SuccessCard from "@/components/pdf/SuccessCard";
import Toolbar from "@/components/image/Toolbar";
import LoadingOverlay from "@/components/image/LoadingOverlay";
import ImagePreviewCard from "@/components/image/ImagePreviewCard";

import { MAX_IMAGE_FILE_SIZE } from "@/lib/image/constants";
import { getDownloadFileName } from "@/lib/image/client";

export default function ImageToPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [outputName, setOutputName] = useState("images-to-pdf.pdf");

  async function convert() {
    if (!files.length) {
      toast.error("Please select one or more images.");
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

      for (const file of files) {
        formData.append("files", file);
      }

      const response = await fetch("/api/image/image-to-pdf", {
        method: "POST",
        body: formData,
      });

      clearInterval(timer);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? "Unable to convert images to PDF.");
      }

      const result = await response.blob();
      setBlob(result);
      setOutputName(getDownloadFileName(response.headers.get("content-disposition"), "images-to-pdf.pdf"));
      setProgress(100);
      toast.success("Images converted to PDF successfully.");
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
    setFiles([]);
    setBlob(null);
    setError("");
    setProgress(0);
    setOutputName("images-to-pdf.pdf");
  }

  return (
    <OperationLayout title="Image to PDF" description="Convert images into a PDF using the existing pdf-lib engine." icon={<FileText size={56} />}>
      <PdfToolLayout
        title="Image to PDF"
        description="Upload one or more images and download them as a PDF document."
        sidebar={
          <div className="space-y-6">
            <ProgressBar progress={progress} status={processing ? "processing" : blob ? "completed" : "idle"} title="Conversion Progress" description="Creating the PDF document." />
          </div>
        }
      >
        <UploadZone multiple maxFiles={20} accept="image/*" maxFileSize={MAX_IMAGE_FILE_SIZE} value={files} onFilesChange={setFiles} />
        {!files.length && <EmptyState title="Upload Images" description="Choose JPG, PNG or WEBP files to combine into a PDF." />}
        <ImagePreviewCard file={files[0] ?? null} title={files.length > 1 ? `Preview (1 of ${files.length})` : "Input Preview"} />
        <Toolbar title="Image to PDF" processing={processing} canProcess={files.length > 0} onProcess={convert} onReset={reset} onDownload={blob ? download : undefined} />
        {error && <ErrorCard title="Conversion Failed" message={error} onRetry={convert} />}
        {blob && <SuccessCard title="Images Converted Successfully" message="Your PDF is ready for download." fileName={outputName} fileSize={blob.size} buttonText="Download PDF" onDownload={download} onContinue={reset} />}
      </PdfToolLayout>
      <LoadingOverlay open={processing} progress={progress} title="Creating PDF" description="Please wait while DigiDesk India converts your images into a PDF." />
    </OperationLayout>
  );
}
