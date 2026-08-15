"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface DownloadOptions {
  url?: string;
  blob?: Blob;
  filename: string;
}

export type DownloadStatus =
  | "idle"
  | "downloading"
  | "completed"
  | "failed";

export default function useDownload() {
  const objectUrlRef = useRef<string | null>(null);

  const [status, setStatus] =
    useState<DownloadStatus>("idle");

  const [progress, setProgress] =
    useState(0);

  const [error, setError] =
    useState<string>();

  const cleanup = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(
        objectUrlRef.current
      );

      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const saveBlob =
    useCallback(
      (
        blob: Blob,
        filename: string
      ) => {
        cleanup();

        objectUrlRef.current =
          URL.createObjectURL(blob);

        const link =
          document.createElement("a");

        link.href =
          objectUrlRef.current;

        link.download =
          filename;

        document.body.appendChild(
          link
        );

        link.click();

        link.remove();
      },
      [cleanup]
    );

  const download =
    useCallback(
      async ({
        url,
        blob,
        filename,
      }: DownloadOptions) => {
        try {
          setStatus(
            "downloading"
          );

          setProgress(0);

          setError(undefined);

          if (blob) {
            saveBlob(
              blob,
              filename
            );

            setProgress(100);

            setStatus(
              "completed"
            );

            return;
          }

          if (!url)
            throw new Error(
              "Download URL missing."
            );

          const response =
            await fetch(url);

          if (!response.ok)
            throw new Error(
              "Download failed."
            );

          const total =
            Number(
              response.headers.get(
                "content-length"
              ) || 0
            );

          const reader =
            response.body?.getReader();

          if (!reader)
            throw new Error(
              "Readable stream unavailable."
            );

          const chunks: Uint8Array[] =
            [];

          let received = 0;

          while (true) {
            const {
              done,
              value,
            } =
              await reader.read();

            if (done)
              break;

            if (value) {
              chunks.push(value);

              received +=
                value.length;

              if (total) {
                setProgress(
                  Math.round(
                    (received /
                      total) *
                      100
                  )
                );
              }
            }
          }

          const file = new Blob(
            chunks.map((chunk) =>
              new Uint8Array(chunk).buffer as ArrayBuffer
            )
          );

          saveBlob(
            file,
            filename
          );

          setProgress(100);

          setStatus(
            "completed"
          );
        } catch (e) {
          const err =
            e instanceof Error
              ? e
              : new Error(
                  "Download failed."
                );

          setStatus("failed");

          setError(
            err.message
          );

          throw err;
        }
      },
      [saveBlob]
    );

  const reset =
    useCallback(() => {
      setProgress(0);

      setStatus("idle");

      setError(undefined);
    }, []);

  return {
    status,

    progress,

    error,

    download,

    reset,

    downloading:
      status ===
      "downloading",

    completed:
      status ===
      "completed",

    failed:
      status ===
      "failed",
  };
}