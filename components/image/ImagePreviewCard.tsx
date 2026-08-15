"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";

import { formatBytes } from "@/lib/image/client";

interface ImagePreviewCardProps {
  file: File | null;
  title?: string;
  width?: number;
  height?: number;
}

export default function ImagePreviewCard({
  file,
  title = "Image Preview",
  width,
  height,
}: ImagePreviewCardProps) {
  const src = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  useEffect(() => {
    return () => {
      if (src) {
        URL.revokeObjectURL(src);
      }
    };
  }, [src]);

  if (!file || !src) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>

      <div className="mt-4 flex justify-center rounded-2xl border bg-slate-50 p-4">
        <Image
          src={src}
          alt={file.name}
          width={width ?? 720}
          height={height ?? 540}
          unoptimized
          className="max-h-[360px] w-auto rounded-xl object-contain"
        />
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-slate-500">File</p>
          <p className="truncate font-semibold text-slate-900">{file.name}</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-slate-500">Type</p>
          <p className="font-semibold text-slate-900">{file.type || "Unknown"}</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-slate-500">Size</p>
          <p className="font-semibold text-slate-900">{formatBytes(file.size)}</p>
        </div>
      </div>
    </section>
  );
}
