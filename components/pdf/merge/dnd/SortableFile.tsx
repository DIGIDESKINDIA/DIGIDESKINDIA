"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, FileText } from "lucide-react";

interface Props {
  id: string;
  file: File;
  onRemove: () => void;
}

export default function SortableFile({
  id,
  file,
  onRemove,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="mb-4 flex items-center justify-between rounded-2xl border bg-white p-5 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-slate-400"
        >
          <GripVertical />
        </button>

        <div className="rounded-xl bg-red-100 p-3">
          <FileText className="text-red-600" />
        </div>

        <div>
          <h3 className="font-semibold">
            {file.name}
          </h3>

          <p className="text-sm text-slate-500">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>

      <button
        onClick={onRemove}
        className="rounded-xl p-3 hover:bg-red-100"
      >
        <Trash2 className="text-red-600" />
      </button>
    </div>
  );
}