"use client";

import { CSS } from "@dnd-kit/utilities";
import {
  useSortable,
} from "@dnd-kit/sortable";

import {
  GripVertical,
  Trash2,
  FileText,
  Eye,
  Copy,
} from "lucide-react";

import Image from "next/image";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface Props {
  file: {
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
    progress: number;
    status: "waiting" | "uploading" | "completed" | "error";
  };

  active?: boolean;

  thumbnail?: string;

  pages?: number;

  onDelete?(): void;

  onPreview?(): void;

  onDuplicate?(): void;

  onClick?(): void;
}

export default function MergeFileCard({
  file,
  active,
  thumbnail,
  pages,
  onDelete,
  onPreview,
  onDuplicate,
  onClick,
}: Props) {

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: file.id,
  });

  return (

    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(
          transform
        ),
        transition,
      }}
      onClick={onClick}
      className={`cursor-pointer p-4 transition-all

${
  active
    ? "border-blue-600 ring-2 ring-blue-200"
    : ""
}

${
  isDragging
    ? "opacity-70 shadow-2xl"
    : ""
}`}
    >

      <div className="flex items-center gap-4">

        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded-lg p-2 hover:bg-slate-100 active:cursor-grabbing"
        >
          <GripVertical
            size={20}
          />
        </button>

        <div className="h-20 w-16 overflow-hidden rounded-lg border bg-slate-100">

          {thumbnail ? (

            <Image
              src={thumbnail}
              alt={file.file.name}
              width={64}
              height={80}
              className="h-full w-full object-cover"
            />

          ) : (

            <div className="flex h-full items-center justify-center">

              <FileText
                size={32}
                className="text-red-600"
              />

            </div>

          )}

        </div>

        <div className="flex-1">

          <h3 className="truncate font-semibold">

            {file.file.name}

          </h3>

          <p className="mt-1 text-sm text-slate-500">

            {(
              file.file.size /
              1024 /
              1024
            ).toFixed(2)}{" "}
            MB

          </p>

          <div className="mt-3 flex gap-2">

            <Badge>

              {pages ?? "--"} Pages

            </Badge>

            <Badge
              variant="primary"
            >

              PDF

            </Badge>

          </div>

        </div>

        <div className="flex gap-2">

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onPreview?.();
            }}
          >

            <Eye size={18} />

          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate?.();
            }}
          >

            <Copy size={18} />

          </Button>

          <Button
            variant="danger"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
          >

            <Trash2 size={18} />

          </Button>

        </div>

      </div>

    </div>

  );

}