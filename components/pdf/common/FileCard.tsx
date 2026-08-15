"use client";

import {
  FileText,
  Trash2,
  GripVertical,
} from "lucide-react";

interface Props {
  name: string;
  size: number;
  index?: number;
  draggable?: boolean;
  onRemove?: () => void;
}

export default function FileCard({
  name,
  size,
  index,
  draggable,
  onRemove,
}: Props) {

  return (
    <div className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg">

      <div className="flex items-center gap-4">

        {draggable && (

          <GripVertical
            className="text-slate-400"
            size={20}
          />

        )}

        <div className="rounded-xl bg-red-100 p-3">

          <FileText
            className="text-red-600"
            size={26}
          />

        </div>

        <div>

          <h3 className="font-semibold">

            {name}

          </h3>

          <p className="text-sm text-slate-500">

            {(size / 1024 / 1024).toFixed(2)} MB

          </p>

          {index !== undefined && (

            <span className="text-xs text-slate-400">

              Position {index + 1}

            </span>

          )}

        </div>

      </div>

      {onRemove && (

        <button
          onClick={onRemove}
          className="rounded-xl p-3 transition hover:bg-red-100"
        >

          <Trash2
            className="text-red-600"
            size={18}
          />

        </button>

      )}

    </div>
  );
}