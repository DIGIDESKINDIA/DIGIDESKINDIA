"use client";

import Image from "next/image";
import {
  FileText,
  Eye,
  Maximize2,
} from "lucide-react";

export interface PdfPreviewPage {
  page: number;

  width: number;

  height: number;

  rotation: number;

  aspectRatio: number;

  thumbnail?: string;
}

interface Props {
  pages: PdfPreviewPage[];

  loading?: boolean;

  selectedPages?: number[];

  onSelect?(
    page: number
  ): void;
}

export default function PdfPreview({
  pages,

  loading = false,

  selectedPages = [],

  onSelect,
}: Props) {
  if (loading) {
    return (
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

        {Array.from({
          length: 8,
        }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-3xl border bg-white p-5"
          >
            <div className="aspect-[3/4] rounded-2xl bg-slate-200" />

            <div className="mt-4 h-5 rounded bg-slate-200" />
          </div>
        ))}

      </div>
    );
  }

  if (!pages.length) {
    return (
      <div className="mt-8 rounded-3xl border border-dashed bg-white p-16 text-center">

        <Eye
          className="mx-auto text-slate-300"
          size={60}
        />

        <h3 className="mt-5 text-2xl font-bold">

          PDF Preview

        </h3>

        <p className="mt-3 text-slate-500">

          Upload a PDF to preview pages.

        </p>

      </div>
    );
  }

  return (
    <section className="mt-10">

      <div className="mb-6 flex items-center justify-between">

        <div>

          <h2 className="text-2xl font-bold">

            Page Preview

          </h2>

          <p className="text-slate-500">

            {pages.length} page
            {pages.length > 1
              ? "s"
              : ""}

          </p>

        </div>

      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

        {pages.map((page) => {
          const selected =
            selectedPages.includes(
              page.page
            );

          return (
            <button
              key={page.page}
              onClick={() =>
                onSelect?.(
                  page.page
                )
              }
              className={`group overflow-hidden rounded-3xl border bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl

              ${
                selected
                  ? "border-blue-600 ring-2 ring-blue-200"
                  : "border-slate-200"
              }`}
            >

              <div className="flex aspect-[3/4] items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">

                {page.thumbnail ? (
                  <Image
                    src={page.thumbnail}
                    alt={`Page ${page.page}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <FileText
                    size={70}
                    className="text-red-500"
                  />
                )}

              </div>

              <div className="space-y-2 p-5">

                <div className="flex items-center justify-between">

                  <h3 className="font-bold">

                    Page {page.page}

                  </h3>

                  <Maximize2
                    size={16}
                    className="text-slate-400"
                  />

                </div>

                <div className="space-y-1 text-sm text-slate-500">

                  <div>

                    {page.width} ×{" "}
                    {page.height}

                  </div>

                  <div>

                    Rotation:{" "}
                    {page.rotation}°

                  </div>

                </div>

              </div>

            </button>
          );
        })}

      </div>

    </section>
  );
}