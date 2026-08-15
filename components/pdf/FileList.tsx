"use client";

import {
  FileText,
  GripVertical,
  Trash2,
} from "lucide-react";

interface Props {
  files: File[];

  onRemove(
    index: number
  ): void;

  onMove?(
    from: number,
    to: number
  ): void;
}

export default function FileList({
  files,
  onRemove,
}: Props) {
  if (!files.length) return null;

  return (
    <div className="mt-8 space-y-4">

      {files.map(
        (file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-400 hover:shadow-md"
          >
            <div className="flex items-center gap-4">

              <button
                className="cursor-grab rounded-xl bg-slate-100 p-3 transition group-hover:bg-blue-100"
                title="Reorder"
              >
                <GripVertical
                  size={20}
                />
              </button>

              <div className="rounded-xl bg-red-100 p-3">

                <FileText
                  size={28}
                  className="text-red-600"
                />

              </div>

              <div>

                <h3 className="font-semibold text-slate-800">

                  {file.name}

                </h3>

                <p className="mt-1 text-sm text-slate-500">

                  {(
                    file.size /
                    1024 /
                    1024
                  ).toFixed(2)}
                  {" "}
                  MB

                </p>

              </div>

            </div>

            <button
              onClick={() =>
                onRemove(index)
              }
              className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              <Trash2
                size={18}
              />

              Remove
            </button>

          </div>
        )
      )}

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">

        <div className="flex items-center justify-between">

          <div>

            <h4 className="font-semibold">

              Total Files

            </h4>

            <p className="text-sm text-slate-500">

              {files.length} PDF
              {files.length > 1
                ? "s"
                : ""}

            </p>

          </div>

          <div className="text-right">

            <div className="text-lg font-bold text-blue-600">

              {(
                files.reduce(
                  (
                    total,
                    file
                  ) =>
                    total +
                    file.size,
                  0
                ) /
                1024 /
                1024
              ).toFixed(2)}
              {" "}
              MB

            </div>

            <p className="text-xs text-slate-500">

              Total Upload Size

            </p>

          </div>

        </div>

      </div>

    </div>
  );
}