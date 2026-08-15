"use client";

import { useState } from "react";

import { saveAs } from "file-saver";

import toast from "react-hot-toast";

import {
  Scissors,
} from "lucide-react";

import OperationLayout from "@/components/pdf/OperationLayout";
import PdfToolLayout from "@/components/pdf/PdfToolLayout";
import UploadZone from "@/components/pdf/UploadZone";
import Toolbar from "@/components/pdf/Toolbar";
import ProgressBar from "@/components/pdf/ProgressBar";
import LoadingOverlay from "@/components/pdf/LoadingOverlay";
import SuccessCard from "@/components/pdf/SuccessCard";
import ErrorCard from "@/components/pdf/ErrorCard";
import EmptyState from "@/components/pdf/EmptyState";

export default function SplitPdfPage() {
  const [file, setFile] =
    useState<File | null>(null);

  const [processing, setProcessing] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [blob, setBlob] =
    useState<Blob | null>(null);

  const [error, setError] =
    useState("");

  async function splitPdf() {
    if (!file) {
      toast.error(
        "Please select a PDF."
      );
      return;
    }

    setProcessing(true);
    setError("");
    setBlob(null);
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

      const response =
        await fetch(
          "/api/pdf/split",
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
            "Unable to split PDF."
        );
      }

      const zip =
        await response.blob();

      setBlob(zip);

      setProgress(100);

      toast.success(
        "PDF split successfully."
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Split failed."
      );
    } finally {
      setProcessing(false);
    }
  }
    function download() {
    if (!blob) return;

    saveAs(
      blob,
      "Split-PDF.zip"
    );
  }

  function reset() {
    setFile(null);
    setBlob(null);
    setError("");
    setProgress(0);
  }

  return (
    <OperationLayout
      title="Split PDF"
      description="Split your PDF into separate pages or page ranges while preserving the original quality."
      icon={<Scissors size={56} />}
    >
      <PdfToolLayout
        title="Split PDF"
        description="Upload a PDF and extract each page into individual PDF files packaged as a ZIP archive."
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
              title="Split Progress"
              description="Preparing your PDF pages."
            />

            <div className="rounded-3xl border bg-white p-6 shadow-sm">

              <h3 className="text-lg font-bold">

                File Summary

              </h3>

              {file ? (
                <div className="mt-5 space-y-4">

                  <div className="flex justify-between">

                    <span className="text-slate-500">

                      Name

                    </span>

                    <span className="max-w-[180px] truncate font-semibold">

                      {file.name}

                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-slate-500">

                      Size

                    </span>

                    <span className="font-semibold">

                      {(
                        file.size /
                        1024 /
                        1024
                      ).toFixed(2)}{" "}
                      MB

                    </span>

                  </div>

                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">

                  No PDF selected.

                </p>
              )}

            </div>

          </div>
        }
      >

        <UploadZone
          value={
            file
              ? [file]
              : []
          }
          multiple={false}
          accept=".pdf"
          maxFiles={1}
          onFilesChange={(files) =>
            setFile(
              files[0] ??
                null
            )
          }
        />

        {!file && (
          <EmptyState
            title="Upload a PDF"
            description="Select a PDF document to split into individual pages."
          />
        )}

        <Toolbar
          title="Split Operation"
          processing={processing}
          canProcess={!!file}
          onProcess={splitPdf}
          onReset={reset}
          onDownload={
            blob
              ? download
              : undefined
          }
        />        {error && (
          <ErrorCard
            title="Split Failed"
            message={error}
            onRetry={splitPdf}
          />
        )}

        {blob && (
          <SuccessCard
            title="PDF Split Completed"
            message="Your PDF has been successfully split into individual pages. The output ZIP file is ready for download."
            fileName="Split-PDF.zip"
            fileSize={blob.size}
            buttonText="Download ZIP"
            onDownload={download}
            onContinue={reset}
          />
        )}

      </PdfToolLayout>

      <LoadingOverlay
        open={processing}
        progress={progress}
        title="Splitting PDF"
        description="Please wait while DigiDesk India securely splits your PDF into individual pages."
      />

    </OperationLayout>
  );
}