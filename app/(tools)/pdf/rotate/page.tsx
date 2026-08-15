"use client";

import { useState } from "react";

import { saveAs } from "file-saver";

import toast from "react-hot-toast";

import {
  RotateCw,
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

export default function RotatePdfPage() {
  const [file, setFile] =
    useState<File | null>(null);

  const [angle, setAngle] =
    useState<90 | 180 | 270>(90);

  const [processing, setProcessing] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [blob, setBlob] =
    useState<Blob | null>(null);

  const [error, setError] =
    useState("");

  async function rotatePdf() {
    if (!file) {
      toast.error(
        "Please select a PDF."
      );
      return;
    }

    setProcessing(true);
    setProgress(5);
    setBlob(null);
    setError("");

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
        "angle",
        String(angle)
      );

      const response =
        await fetch(
          "/api/pdf/rotate",
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
            "Rotation failed."
        );
      }

      const result =
        await response.blob();

      setBlob(result);

      setProgress(100);

      toast.success(
        "PDF rotated successfully."
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to rotate PDF."
      );
    } finally {
      setProcessing(false);
    }
  }
    function download() {
    if (!blob) return;

    saveAs(
      blob,
      `Rotated-${angle}.pdf`
    );
  }

  function reset() {
    setFile(null);
    setBlob(null);
    setError("");
    setProgress(0);
    setAngle(90);
  }

  return (
    <OperationLayout
      title="Rotate PDF"
      description="Rotate one or all pages of your PDF while preserving the original quality."
      icon={<RotateCw size={56} />}
    >
      <PdfToolLayout
        title="Rotate PDF"
        description="Upload a PDF, choose the rotation angle, and create a correctly oriented document."
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
              title="Rotation Progress"
              description="Rotating your PDF securely."
            />

            <SettingsPanel
              title="Rotation Settings"
              description="Choose how much the PDF should rotate."
            >

              <div>

                <label className="mb-3 block text-sm font-semibold text-slate-700">

                  Rotation Angle

                </label>

                <select
                  value={angle}
                  onChange={(e) =>
                    setAngle(
                      Number(
                        e.target.value
                      ) as
                        | 90
                        | 180
                        | 270
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                >
                  <option value={90}>
                    90°
                  </option>

                  <option value={180}>
                    180°
                  </option>

                  <option value={270}>
                    270°
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
              files[0] ??
                null
            )
          }
        />

        {!file && (
          <EmptyState
            title="No PDF Selected"
            description="Upload a PDF document to rotate."
          />
        )}

        <Toolbar
          title="Rotate Operation"
          processing={processing}
          canProcess={!!file}
          onProcess={rotatePdf}
          onReset={reset}
          onDownload={
            blob
              ? download
              : undefined
          }
        />        {error && (
          <ErrorCard
            title="Rotation Failed"
            message={error}
            onRetry={rotatePdf}
          />
        )}

        {blob && (
          <SuccessCard
            title="PDF Rotation Completed"
            message={`Your PDF has been successfully rotated by ${angle}°. The processed document is ready for download.`}
            fileName={`Rotated-${angle}.pdf`}
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
        title="Rotating PDF"
        description={`Please wait while DigiDesk India rotates your PDF by ${angle}°.`}
      />

    </OperationLayout>
  );
}