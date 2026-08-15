"use client";

import { useState } from "react";

import { saveAs } from "file-saver";

import toast from "react-hot-toast";

import { PDFApi } from "@/lib/api/pdf";

interface ProcessorOptions {
  endpoint: string;

  outputName: string;
}

export function usePdfProcessor({
  endpoint,
  outputName,
}: ProcessorOptions) {
  const [processing, setProcessing] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [blob, setBlob] =
    useState<{ url?: string; name?: string } | Blob | null>(null);

  const [error, setError] =
    useState("");

  async function process(
    formData: FormData
  ) {
    setProcessing(true);

    setProgress(5);

    setBlob(null);

    setError("");

    try {
      const timer =
        setInterval(() => {
          setProgress((old) =>
            old >= 90
              ? old
              : old + 5
          );
        }, 150);

      const result =
        await PDFApi[endpoint as keyof typeof PDFApi](formData);

      clearInterval(timer);

      const normalizedResult =
        result.downloadUrl || result.data
          ? {
              url:
                typeof result.data === "string"
                  ? result.data
                  : result.downloadUrl,
              name: outputName,
            }
          : null;

      setBlob(normalizedResult);

      setProgress(100);

      toast.success(
        "Operation completed successfully."
      );

      return result;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong.";

      setError(message);

      toast.error(message);

      throw err;
    } finally {
      setProcessing(false);
    }
  }

  function download(
    name = outputName
  ) {
    if (!blob) return;

    if (blob instanceof Blob) {
      saveAs(blob, name);
      return;
    }

    if (blob.url) {
      const link = document.createElement("a");
      link.href = blob.url;
      link.download = blob.name || name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }

  function reset() {
    setProcessing(false);

    setProgress(0);

    setBlob(null);

    setError("");
  }

  return {
    processing,

    progress,

    blob,

    error,

    process,

    download,

    reset,
  };
}