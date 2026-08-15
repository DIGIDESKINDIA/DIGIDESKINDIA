"use client";

import { useCallback, useRef, useState } from "react";

import { PDFApi } from "@/lib/api/pdf";

export type TaskStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";

export interface PDFTaskResult<T = unknown> {
  success: boolean;
  data?: T;
  downloadUrl?: string;
  message?: string;
}

interface UsePDFTaskOptions<T = unknown> {
  endpoint:
    | "merge"
    | "split"
    | "compress"
    | "rotate"
    | "extract"
    | "watermark"
    | "encrypt"
    | "decrypt"
    | "thumbnail"
    | "convert"
    | "ocr";

  onSuccess?: (
    result: PDFTaskResult<T>
  ) => void;

  onError?: (
    error: Error
  ) => void;
}

export default function usePDFTask<
  T = unknown
>({
  endpoint,
  onSuccess,
  onError,
}: UsePDFTaskOptions<T>) {
  const abortRef =
    useRef<AbortController | null>(
      null
    );

  const [status, setStatus] =
    useState<TaskStatus>("idle");

  const [progress, setProgress] =
    useState(0);

  const [error, setError] =
    useState<string>();

  const [result, setResult] =
    useState<
      PDFTaskResult<T> | undefined
    >();

  const run = useCallback(
    async (form: FormData) => {
      try {
        abortRef.current =
          new AbortController();

        setStatus("uploading");
        setProgress(10);
        setError(undefined);
        setResult(undefined);

        await new Promise((r) =>
          setTimeout(r, 150)
        );

        setProgress(30);

        setStatus("processing");

        const response =
          await PDFApi[
            endpoint
          ](form);

        const normalizedResult: PDFTaskResult<T> = {
          success: response.success,
          data: response.data as T | undefined,
          downloadUrl: response.downloadUrl,
          message: response.message,
        };

        setProgress(100);

        setStatus("completed");

        setResult(normalizedResult);

        onSuccess?.(normalizedResult);

        return normalizedResult;
      } catch (e) {
        const err =
          e instanceof Error
            ? e
            : new Error(
                "Unknown error."
              );

        setStatus("failed");

        setError(err.message);

        onError?.(err);

        throw err;
      }
    },
    [
      endpoint,
      onSuccess,
      onError,
    ]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setError(undefined);
    setResult(undefined);
  }, []);

  const cancel =
    useCallback(() => {
      abortRef.current?.abort();

      setStatus("idle");

      setProgress(0);
    }, []);

  return {
    status,

    progress,

    error,

    result,

    run,

    cancel,

    reset,

    busy:
      status ===
        "uploading" ||
      status ===
        "processing",

    completed:
      status ===
      "completed",

    failed:
      status ===
      "failed",
  };
}