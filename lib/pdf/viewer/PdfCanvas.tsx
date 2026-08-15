"use client";

import { useEffect, useRef } from "react";

import type { PDFPageProxy } from "pdfjs-dist";

interface PdfCanvasProps {
  page: PDFPageProxy;

  scale: number;

  rotation?: number;

  className?: string;

  onRendered?(): void;
}

export default function PdfCanvas({
  page,
  scale,
  rotation = 0,
  className,
  onRendered,
}: PdfCanvasProps) {
  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    const renderTaskRef: {
      current?: {
        cancel: () => void;
        promise: Promise<void>;
      };
    } = {};

    async function render() {
      const canvas =
        canvasRef.current;

      if (!canvas) return;

      const viewport =
        page.getViewport({
          scale,
          rotation,
        });

      const context =
        canvas.getContext("2d");

      if (!context) return;

      canvas.width =
        Math.floor(viewport.width);

      canvas.height =
        Math.floor(viewport.height);

      canvas.style.width =
        `${viewport.width}px`;

      canvas.style.height =
        `${viewport.height}px`;

      const task = page.render({
        canvasContext: context,
        viewport,
        canvas,
      });

      renderTaskRef.current = task;

      try {
        await task.promise;

        if (!cancelled) {
          onRendered?.();
        }
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          error.name === "RenderingCancelledException"
        ) {
          return;
        }

        console.error(
          "PDF render failed",
          error
        );
      }
    }

    render();

    return () => {
      cancelled = true;

      renderTaskRef.current?.cancel();
    };
  }, [
    page,
    scale,
    rotation,
    onRendered,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={
        className ??
        "rounded-xl bg-white shadow-xl"
      }
    />
  );
}