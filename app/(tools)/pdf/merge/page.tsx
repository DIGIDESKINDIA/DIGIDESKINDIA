"use client";

import { useMemo, useState } from "react";

import { saveAs } from "file-saver";

import toast from "react-hot-toast";

import {
  Layers3,
} from "lucide-react";

import OperationLayout from "@/components/pdf/OperationLayout";
import PdfToolLayout from "@/components/pdf/PdfToolLayout";
import UploadZone from "@/components/pdf/UploadZone";
import FileList from "@/components/pdf/FileList";
import Toolbar from "@/components/pdf/Toolbar";
import ProgressBar from "@/components/pdf/ProgressBar";
import LoadingOverlay from "@/components/pdf/LoadingOverlay";
import EmptyState from "@/components/pdf/EmptyState";
import SuccessCard from "@/components/pdf/SuccessCard";
import ErrorCard from "@/components/pdf/ErrorCard";

export default function MergePdfPage() {
  const [files, setFiles] =
    useState<File[]>([]);

  const [processing, setProcessing] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [error, setError] =
    useState("");

  const [blob, setBlob] =
    useState<Blob | null>(null);

  const totalSize = useMemo(
    () =>
      files.reduce(
        (t, f) => t + f.size,
        0
      ),
    [files]
  );

  async function mergePdf() {
    if (files.length < 2) {
      toast.error(
        "Select at least 2 PDFs."
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

      files.forEach((file) =>
        formData.append(
          "files",
          file
        )
      );

      const response =
        await fetch(
          "/api/pdf/merge",
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
            "Merge failed."
        );
      }

      const result =
        await response.blob();

      setBlob(result);

      setProgress(100);

      toast.success(
        "PDF merged successfully."
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Merge failed."
      );
    } finally {
      setProcessing(false);
    }
  }
    function download() {
    if (!blob) return;

    saveAs(
      blob,
      "Merged.pdf"
    );
  }

  function reset() {
    setFiles([]);
    setBlob(null);
    setError("");
    setProgress(0);
  }

  return (
    <OperationLayout
      title="Merge PDF"
      description="Combine multiple PDF files into one professional document while preserving quality."
      icon={<Layers3 size={56} />}
    >
      <PdfToolLayout
        title="Merge PDF Files"
        description="Upload two or more PDF files, arrange them in the required order, and merge them into a single PDF."
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
              title="Merge Progress"
              description="Processing uploaded PDFs."
            />

            <div className="rounded-3xl border bg-white p-6 shadow-sm">

              <h3 className="text-lg font-bold">

                Summary

              </h3>

              <div className="mt-5 space-y-4">

                <div className="flex justify-between">

                  <span className="text-slate-500">
                    Files
                  </span>

                  <span className="font-semibold">
                    {files.length}
                  </span>

                </div>

                <div className="flex justify-between">

                  <span className="text-slate-500">
                    Total Size
                  </span>

                  <span className="font-semibold">

                    {(
                      totalSize /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB

                  </span>

                </div>

              </div>

            </div>

          </div>
        }
      >

        <UploadZone
          multiple
          value={files}
          accept=".pdf"
          onFilesChange={setFiles}
        />

        {files.length > 0 ? (

          <FileList
            files={files}
            onRemove={(index) =>
              setFiles((old) =>
                old.filter(
                  (_, i) =>
                    i !== index
                )
              )
            }
          />

        ) : (

          <EmptyState
            title="No PDF Uploaded"
            description="Upload at least two PDF files to begin merging."
          />

        )}

        <Toolbar
          title="Merge Operation"
          processing={processing}
          canProcess={
            files.length >= 2
          }
          onProcess={mergePdf}
          onReset={reset}
          onDownload={
            blob
              ? download
              : undefined
          }
        />
                    {error && (
          <ErrorCard
            message={error}
            onRetry={mergePdf}
          />
        )}

        {blob && (
          <SuccessCard
            title="PDF Merge Completed"
            message="Your PDF files have been merged successfully and are ready to download."
            fileName="Merged.pdf"
            fileSize={blob.size}
            onDownload={download}
            onContinue={reset}
          />
        )}

      </PdfToolLayout>

      <LoadingOverlay
        open={processing}
        progress={progress}
        title="Merging PDF Files"
        description="Please wait while DigiDesk India merges your PDF files securely."
      />

    </OperationLayout>
  );
}