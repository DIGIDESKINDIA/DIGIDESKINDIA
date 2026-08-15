"use client";

import { useState } from "react";

import { saveAs } from "file-saver";

import toast from "react-hot-toast";

import {
  Trash2,
} from "lucide-react";

import OperationLayout from "@/components/pdf/OperationLayout";
import PdfToolLayout from "@/components/pdf/PdfToolLayout";
import UploadZone from "@/components/pdf/UploadZone";
import PageSelector from "@/components/pdf/PageSelector";
import Toolbar from "@/components/pdf/Toolbar";
import ProgressBar from "@/components/pdf/ProgressBar";
import LoadingOverlay from "@/components/pdf/LoadingOverlay";
import EmptyState from "@/components/pdf/EmptyState";
import ErrorCard from "@/components/pdf/ErrorCard";
import SuccessCard from "@/components/pdf/SuccessCard";

export default function DeletePagesPage() {
  const [file, setFile] =
    useState<File | null>(null);

  const [totalPages, setTotalPages] =
    useState(1);

  const [selectedPages, setSelectedPages] =
    useState<number[]>([]);

  const [processing, setProcessing] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [blob, setBlob] =
    useState<Blob | null>(null);

  const [error, setError] =
    useState("");

  async function deletePages() {
    if (!file) {
      toast.error(
        "Please select a PDF."
      );
      return;
    }

    if (!selectedPages.length) {
      toast.error(
        "Select pages to delete."
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
        "pages",
        selectedPages.join(",")
      );

      const response =
        await fetch(
          "/api/pdf/delete-pages",
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
            "Unable to delete pages."
        );
      }

      const result =
        await response.blob();

      setBlob(result);

      setProgress(100);

      toast.success(
        "Pages deleted successfully."
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Delete failed."
      );
    } finally {
      setProcessing(false);
    }
  }
    function download() {
    if (!blob) return;

    saveAs(
      blob,
      "Pages-Deleted.pdf"
    );
  }

  function reset() {
    setFile(null);
    setBlob(null);
    setError("");
    setProgress(0);
    setSelectedPages([]);
    setTotalPages(1);
  }

  async function loadPreview(
    selected: File
  ) {
    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        selected
      );

      const response =
        await fetch(
          "/api/pdf/preview",
          {
            method: "POST",
            body: formData,
          }
        );

      if (!response.ok) return;

      const data =
        await response.json();

      setTotalPages(
        data.totalPages ?? 1
      );
    } catch {
      setTotalPages(1);
    }
  }

  return (
    <OperationLayout
      title="Delete PDF Pages"
      description="Remove unwanted pages from your PDF while preserving the remaining pages exactly as they are."
      icon={<Trash2 size={56} />}
    >
      <PdfToolLayout
        title="Delete Pages"
        description="Upload a PDF, choose the pages you want to remove, and download the updated document."
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
              title="Delete Progress"
              description="Removing selected pages."
            />

            <div className="rounded-3xl border bg-white p-6 shadow-sm">

              <h3 className="text-lg font-bold">

                Selection

              </h3>

              <div className="mt-5 space-y-4">

                <div className="flex justify-between">

                  <span className="text-slate-500">

                    Total Pages

                  </span>

                  <span className="font-semibold">

                    {totalPages}

                  </span>

                </div>

                <div className="flex justify-between">

                  <span className="text-slate-500">

                    Selected

                  </span>

                  <span className="font-semibold text-red-600">

                    {selectedPages.length}

                  </span>

                </div>

              </div>

            </div>

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
          onFilesChange={async (
            files
          ) => {
            const selected =
              files[0] ?? null;

            setFile(selected);

            setSelectedPages([]);

            if (selected) {
              await loadPreview(
                selected
              );
            }
          }}
        />

        {!file ? (
          <EmptyState
            title="Upload PDF"
            description="Select a PDF document to remove unwanted pages."
          />
        ) : (
          <PageSelector
            totalPages={
              totalPages
            }
            value={
              selectedPages
            }
            onChange={
              setSelectedPages
            }
          />
        )}

        <Toolbar
          title="Delete Pages"
          processing={processing}
          canProcess={
            !!file &&
            selectedPages.length >
              0
          }
          onProcess={deletePages}
          onReset={reset}
          onDownload={
            blob
              ? download
              : undefined
          }
        />
                {error && (
          <ErrorCard
            title="Delete Pages Failed"
            message={error}
            onRetry={deletePages}
          />
        )}

        {blob && (
          <SuccessCard
            title="Pages Deleted Successfully"
            message={`${selectedPages.length} page${
              selectedPages.length > 1 ? "s have" : " has"
            } been removed from your PDF. Your updated document is ready to download.`}
            fileName="Pages-Deleted.pdf"
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
        title="Deleting Pages"
        description="Please wait while DigiDesk India removes the selected pages from your PDF securely."
      />

    </OperationLayout>
  );
}