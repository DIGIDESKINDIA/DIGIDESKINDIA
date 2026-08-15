"use client";

import { useState } from "react";

import { saveAs } from "file-saver";

import toast from "react-hot-toast";

import {
  Stamp,
} from "lucide-react";

import OperationLayout from "@/components/pdf/OperationLayout";
import PdfToolLayout from "@/components/pdf/PdfToolLayout";
import UploadZone from "@/components/pdf/UploadZone";
import Toolbar from "@/components/pdf/Toolbar";
import ProgressBar from "@/components/pdf/ProgressBar";
import LoadingOverlay from "@/components/pdf/LoadingOverlay";
import SettingsPanel from "@/components/pdf/SettingsPanel";
import EmptyState from "@/components/pdf/EmptyState";
import ErrorCard from "@/components/pdf/ErrorCard";
import SuccessCard from "@/components/pdf/SuccessCard";

export default function WatermarkPdfPage() {
  const [file, setFile] =
    useState<File | null>(null);

  const [text, setText] =
    useState("DigiDesk India");

  const [opacity, setOpacity] =
    useState(0.25);

  const [fontSize, setFontSize] =
    useState(42);

  const [rotation, setRotation] =
    useState(45);

  const [processing, setProcessing] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [blob, setBlob] =
    useState<Blob | null>(null);

  const [error, setError] =
    useState("");

  async function applyWatermark() {
    if (!file) {
      toast.error(
        "Please select a PDF."
      );
      return;
    }

    if (!text.trim()) {
      toast.error(
        "Enter watermark text."
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
        "text",
        text
      );

      formData.append(
        "opacity",
        String(opacity)
      );

      formData.append(
        "fontSize",
        String(fontSize)
      );

      formData.append(
        "rotation",
        String(rotation)
      );

      const response =
        await fetch(
          "/api/pdf/watermark",
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
            "Unable to apply watermark."
        );
      }

      const result =
        await response.blob();

      setBlob(result);

      setProgress(100);

      toast.success(
        "Watermark applied successfully."
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Watermark failed."
      );
    } finally {
      setProcessing(false);
    }
  }
    function download() {
    if (!blob) return;

    saveAs(
      blob,
      "Watermarked.pdf"
    );
  }

  function reset() {
    setFile(null);
    setBlob(null);
    setError("");
    setProgress(0);

    setText("DigiDesk India");
    setOpacity(0.25);
    setFontSize(42);
    setRotation(45);
  }

  return (
    <OperationLayout
      title="Add Watermark"
      description="Protect your documents by adding a professional text watermark without reducing PDF quality."
      icon={<Stamp size={56} />}
    >
      <PdfToolLayout
        title="Watermark PDF"
        description="Upload a PDF, customize the watermark, and generate a professionally watermarked document."
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
              title="Watermark Progress"
              description="Applying watermark to your PDF."
            />

            <SettingsPanel
              title="Watermark Settings"
              description="Customize the watermark appearance."
            >

              <div>

                <label className="mb-2 block text-sm font-semibold">

                  Watermark Text

                </label>

                <input
                  type="text"
                  value={text}
                  onChange={(e) =>
                    setText(
                      e.target.value
                    )
                  }
                  placeholder="Enter watermark text"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-semibold">

                  Opacity ({opacity})

                </label>

                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={opacity}
                  onChange={(e) =>
                    setOpacity(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="w-full"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-semibold">

                  Font Size

                </label>

                <input
                  type="number"
                  value={fontSize}
                  min={12}
                  max={100}
                  onChange={(e) =>
                    setFontSize(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-semibold">

                  Rotation

                </label>

                <select
                  value={rotation}
                  onChange={(e) =>
                    setRotation(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600"
                >
                  <option value={0}>
                    0°
                  </option>

                  <option value={45}>
                    45°
                  </option>

                  <option value={90}>
                    90°
                  </option>

                  <option value={135}>
                    135°
                  </option>

                  <option value={180}>
                    180°
                  </option>

                </select>

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
          onFilesChange={(files) =>
            setFile(
              files[0] ?? null
            )
          }
        />

        {!file && (
          <EmptyState
            title="Upload PDF"
            description="Choose a PDF document to apply a custom watermark."
          />
        )}

        <Toolbar
          title="Watermark PDF"
          processing={processing}
          canProcess={
            !!file &&
            !!text.trim()
          }
          onProcess={applyWatermark}
          onReset={reset}
          onDownload={
            blob
              ? download
              : undefined
          }
        />
                {error && (
          <ErrorCard
            title="Watermark Failed"
            message={error}
            onRetry={applyWatermark}
          />
        )}

        {blob && (
          <SuccessCard
            title="Watermark Applied Successfully"
            message="Your PDF has been successfully watermarked and is ready for download."
            fileName="Watermarked.pdf"
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
        title="Applying Watermark"
        description="Please wait while DigiDesk India securely applies the watermark to your PDF."
      />

    </OperationLayout>
  );
}