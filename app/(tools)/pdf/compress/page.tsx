"use client";

import { useState } from "react";

import { saveAs } from "file-saver";

import toast from "react-hot-toast";

import {
  Archive,
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

type CompressionLevel =
  | "low"
  | "medium"
  | "high";

export default function CompressPdfPage() {
  const [file, setFile] =
    useState<File | null>(null);

  const [level, setLevel] =
    useState<CompressionLevel>(
      "medium"
    );

  const [processing, setProcessing] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [blob, setBlob] =
    useState<Blob | null>(null);

  const [error, setError] =
    useState("");

  async function compressPdf() {
    if (!file) {
      toast.error(
        "Please select a PDF."
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
          setProgress((old) =>
            old >= 90
              ? old
              : old + 5
          );
        }, 150);

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "level",
        level
      );

      const response =
        await fetch(
          "/api/pdf/compress",
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
            "Compression failed."
        );
      }

      const result =
        await response.blob();

      setBlob(result);

      setProgress(100);

      toast.success(
        "PDF compressed successfully."
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Compression failed."
      );
    } finally {
      setProcessing(false);
    }
  }
    function download() {
    if (!blob) return;

    saveAs(
      blob,
      "Compressed.pdf"
    );
  }

  function reset() {
    setFile(null);

    setBlob(null);

    setError("");

    setProgress(0);

    setLevel("medium");
  }

  const estimatedReduction = {
    low: "Low compression / Best quality",
    medium: "Balanced compression",
    high: "Strong compression",
  };

  return (
    <OperationLayout
      title="Compress PDF"
      description="Reduce PDF file size while maintaining excellent document quality."
      icon={<Archive size={56} />}
    >
      <PdfToolLayout
        title="Compress PDF"
        description="Choose a compression level and optimize your PDF for sharing, email, or storage."
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
              title="Compression Progress"
              description="Optimizing your PDF."
            />

            <SettingsPanel
              title="Compression Settings"
              description="Choose the desired compression level."
            >

              <div className="space-y-3">

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4 hover:border-blue-500">

                  <input
                    type="radio"
                    checked={
                      level === "low"
                    }
                    onChange={() =>
                      setLevel("low")
                    }
                  />

                  <div>

                    <h4 className="font-bold">

                      Low compression / Best quality

                    </h4>

                    <p className="text-sm text-slate-500">

                      Preserves file quality with the smallest practical size reduction.

                    </p>

                  </div>

                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4 hover:border-blue-500">

                  <input
                    type="radio"
                    checked={
                      level ===
                      "medium"
                    }
                    onChange={() =>
                      setLevel(
                        "medium"
                      )
                    }
                  />

                  <div>

                    <h4 className="font-bold">

                      Balanced compression

                    </h4>

                    <p className="text-sm text-slate-500">

                      Balances appearance and file size for typical sharing use.

                    </p>

                  </div>

                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4 hover:border-blue-500">

                  <input
                    type="radio"
                    checked={
                      level ===
                      "high"
                    }
                    onChange={() =>
                      setLevel("high")
                    }
                  />

                  <div>

                    <h4 className="font-bold">

                      Strong compression

                    </h4>

                    <p className="text-sm text-slate-500">

                      More aggressive optimization for a noticeably smaller PDF.

                    </p>

                  </div>

                </label>

              </div>

            </SettingsPanel>

            <div className="rounded-3xl border bg-white p-6 shadow-sm">

              <h3 className="text-lg font-bold">

                Compression Summary

              </h3>

              <div className="mt-5 space-y-4">

                <div className="flex justify-between">

                  <span className="text-slate-500">

                    Level

                  </span>

                  <span className="font-semibold capitalize">

                    {level}

                  </span>

                </div>

                <div className="flex justify-between">

                  <span className="text-slate-500">

                    Estimated Reduction

                  </span>

                  <span className="font-semibold text-green-600">

                    {
                      estimatedReduction[
                        level
                      ]
                    }

                  </span>

                </div>

                {file && (

                  <div className="flex justify-between">

                    <span className="text-slate-500">

                      Original Size

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

                )}

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
          onFilesChange={(files) =>
            setFile(
              files[0] ??
                null
            )
          }
        />

        {!file && (

          <EmptyState
            title="Upload PDF"
            description="Select a PDF document to reduce its file size."
          />

        )}

        <Toolbar
          title="Compress PDF"
          processing={processing}
          canProcess={!!file}
          onProcess={compressPdf}
          onReset={reset}
          onDownload={
            blob
              ? download
              : undefined
          }
        />
                {error && (
          <ErrorCard
            title="Compression Failed"
            message={error}
            onRetry={compressPdf}
          />
        )}

        {blob && (
          <SuccessCard
            title="PDF Compressed Successfully"
            message="Your PDF has been successfully optimized and is ready for download."
            fileName="Compressed.pdf"
            fileSize={blob.size}
            buttonText="Download PDF"
            onDownload={download}
            onContinue={reset}
          />
        )}

        {file && blob && (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

            <h2 className="text-2xl font-bold">

              Compression Result

            </h2>

            <div className="mt-8 grid gap-6 md:grid-cols-3">

              <div className="rounded-2xl bg-slate-50 p-5">

                <p className="text-sm text-slate-500">

                  Original Size

                </p>

                <h3 className="mt-2 text-2xl font-bold">

                  {(
                    file.size /
                    1024 /
                    1024
                  ).toFixed(2)}{" "}
                  MB

                </h3>

              </div>

              <div className="rounded-2xl bg-green-50 p-5">

                <p className="text-sm text-slate-500">

                  Compressed Size

                </p>

                <h3 className="mt-2 text-2xl font-bold text-green-700">

                  {(
                    blob.size /
                    1024 /
                    1024
                  ).toFixed(2)}{" "}
                  MB

                </h3>

              </div>

              <div className="rounded-2xl bg-blue-50 p-5">

                <p className="text-sm text-slate-500">

                  Space Saved

                </p>

                <h3 className="mt-2 text-2xl font-bold text-blue-700">

                  {(
                    ((file.size -
                      blob.size) /
                      file.size) *
                    100
                  ).toFixed(1)}
                  %

                </h3>

              </div>

            </div>

          </section>
        )}

      </PdfToolLayout>

      <LoadingOverlay
        open={processing}
        progress={progress}
        title="Compressing PDF"
        description="Please wait while DigiDesk India optimizes your PDF."
      />
          </OperationLayout>
  );
}