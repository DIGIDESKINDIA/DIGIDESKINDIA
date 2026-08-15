"use client";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { useState } from "react";

import MergeFileCard from "./MergeFileCard";
import MergeActions from "./MergeActions";

import { Card } from "@/components/ui/Card";
import EmptyState from "@/components/pdf/EmptyState";

interface Props {
  files: {
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
    progress: number;
    status: "waiting" | "uploading" | "completed" | "error";
  }[];

  setFiles(
    files: {
      id: string;
      file: File;
      name: string;
      size: number;
      type: string;
      progress: number;
      status: "waiting" | "uploading" | "completed" | "error";
    }[]
  ): void;

  onMerge(): void;

  loading?: boolean;
}

export default function MergeWorkspace({
  files,
  setFiles,
  onMerge,
  loading,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor)
  );

  const [selected, setSelected] =
    useState<string>();

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;

    if (
      active.id === over.id
    )
      return;

    const oldIndex =
      files.findIndex(
        (f) =>
          f.id === active.id
      );

    const newIndex =
      files.findIndex(
        (f) =>
          f.id === over.id
      );

    setFiles(
      arrayMove(
        files,
        oldIndex,
        newIndex
      )
    );
  }

  if (
    files.length === 0
  ) {
    return (
      <Card className="p-12">
        <EmptyState
          title="No PDF Selected"
          description="Upload PDFs to start merging."
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">

      <div className="border-b p-6">

        <h2 className="text-xl font-bold">

          PDF Files

        </h2>

        <p className="text-sm text-slate-500">

          Drag to reorder before merging.

        </p>

      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={
          closestCenter
        }
        onDragEnd={
          handleDragEnd
        }
      >

        <SortableContext
          items={files.map(
            (f) => f.id
          )}
          strategy={
            verticalListSortingStrategy
          }
        >

          <div className="space-y-3 p-6">

            {files.map(
              (file) => (
                <MergeFileCard
                  key={file.id}
                  file={file}
                  active={
                    selected ===
                    file.id
                  }
                  onClick={() =>
                    setSelected(
                      file.id
                    )
                  }
                />
              )
            )}

          </div>

        </SortableContext>

      </DndContext>

      <MergeActions
        totalFiles={
          files.length
        }
        loading={loading}
        onMerge={
          onMerge
        }
      />

    </Card>
  );
}