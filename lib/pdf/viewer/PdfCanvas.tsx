"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type { PDFPageProxy } from "pdfjs-dist";

interface EditableTextItem {
  id: string;
  text: string;
  left: number;
  top: number;
  fontFamily: string;
  fontSize: number;
}

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

  const [textItems, setTextItems] =
    useState<EditableTextItem[]>([]);

  const [viewportSize, setViewportSize] =
    useState({ width: 0, height: 0 });

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

      const textContent =
        await page.getTextContent();

      if (cancelled) return;

      setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      const nextTextItems = textContent.items
        .filter(
          (item) =>
            "str" in item &&
            "transform" in item
        )
        .map((item, index) => {
          const transformed =
            viewport.transform
              ? [
                  viewport.transform[0] *
                    item.transform[0] +
                    viewport.transform[2] *
                    item.transform[1],
                  viewport.transform[1] *
                    item.transform[0] +
                    viewport.transform[3] *
                    item.transform[1],
                  viewport.transform[0] *
                    item.transform[2] +
                    viewport.transform[2] *
                    item.transform[3],
                  viewport.transform[1] *
                    item.transform[2] +
                    viewport.transform[3] *
                    item.transform[3],
                  viewport.transform[0] *
                    item.transform[4] +
                    viewport.transform[2] *
                    item.transform[5] +
                    viewport.transform[4],
                  viewport.transform[1] *
                    item.transform[4] +
                    viewport.transform[3] *
                    item.transform[5] +
                    viewport.transform[5],
                ]
              : item.transform;

          const fontSize = Math.hypot(
            transformed[2],
            transformed[3]
          );

          return {
            id: `${item.fontName ?? "text"}-${index}`,
            text: item.str,
            left: transformed[4],
            top: transformed[5] - fontSize,
            fontFamily:
              textContent.styles[item.fontName]
                ?.fontFamily ??
              "sans-serif",
            fontSize,
          };
        });

      setTextItems(nextTextItems);

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
    <div
      className="relative"
      style={{
        width: viewportSize.width || undefined,
        height: viewportSize.height || undefined,
      }}
    >
      <canvas
        ref={canvasRef}
        className={
          className ??
          "rounded-xl bg-white shadow-xl"
        }
      />

      <div
        className="pdf-inline-text-layer pointer-events-none absolute left-0 top-0"
        style={{
          width: viewportSize.width,
          height: viewportSize.height,
        }}
        aria-label="Editable PDF text"
      >
        {textItems.map((item) => (
          <div
            key={item.id}
            className="pdf-inline-text pointer-events-auto absolute whitespace-pre"
            contentEditable
            suppressContentEditableWarning
            onBlur={(event) => {
              const text =
                event.currentTarget.textContent ??
                "";

              setTextItems((currentItems) =>
                currentItems.map((currentItem) =>
                  currentItem.id === item.id
                    ? { ...currentItem, text }
                    : currentItem
                )
              );
            }}
            style={{
              left: item.left,
              top: item.top,
              fontFamily: item.fontFamily,
              fontSize: item.fontSize,
              lineHeight: 1,
            }}
          >
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}