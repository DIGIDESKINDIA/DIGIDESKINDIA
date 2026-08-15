"use client";

import { FileText, Trash2 } from "lucide-react";

interface Props {
  file: File;
  index: number;
  total: number;
  onRemove: () => void;
}

export default function MergeFileItem({
  file,
  index,
  total,
  onRemove,
}: Props) {
  const size = (file.size / 1024 / 1024).toFixed(2);

  return (
    <div className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg">

      <div className="flex items-center gap-5">

        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-100 text-red-600">
          <FileText size={28} />
        </div>

        <div>

          <h3 className="font-bold text-slate-900">
            {file.name}
          </h3>

          <div className="mt-1 flex gap-4 text-sm text-slate-500">

            <span>{size} MB</span>

            <span>
              File {index + 1} / {total}
            </span>

          </div>

        </div>

      </div>

      <button
        onClick={onRemove}
        className="rounded-xl p-3 text-red-600 transition hover:bg-red-100"
      >
        <Trash2 size={18} />
      </button>

    </div>
  );
}