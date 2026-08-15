"use client";

import { usePdfStore } from "@/app/pdf-tools/organize-pdf/store/pdf/pdfStore";

export default function OrganizePdfPage() {
  const zoom = usePdfStore((state) => state.zoom);

  const zoomIn = usePdfStore((state) => state.zoomIn);

  const zoomOut = usePdfStore((state) => state.zoomOut);

  const rotateLeft = usePdfStore(
    (state) => state.rotateLeft
  );

  const rotateRight = usePdfStore(
    (state) => state.rotateRight
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Organize PDF</h1>
        <p className="mt-3 text-slate-600">Reorder, rotate, delete and manage PDF pages.</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="rounded-xl border px-4 py-2" onClick={zoomIn}>Zoom In</button>
          <button className="rounded-xl border px-4 py-2" onClick={zoomOut}>Zoom Out</button>
          <button className="rounded-xl border px-4 py-2" onClick={rotateLeft}>Rotate Left</button>
          <button className="rounded-xl border px-4 py-2" onClick={rotateRight}>Rotate Right</button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex min-h-[320px] items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            Viewer integration will be added in a later pass.
          </div>
          <div className="rounded-2xl border border-slate-200 p-5">
            <h2 className="font-semibold">Properties</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div>Zoom: {zoom}%</div>
              <div>Rotation: 0°</div>
              <div>Pages: --</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}