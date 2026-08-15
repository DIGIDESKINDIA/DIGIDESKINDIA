"use client";

import {
  Files,
  Trash2,
  Plus,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface Props {
  totalFiles: number;

  totalSize?: number;

  loading?: boolean;

  onMerge(): void;

  onClear?(): void;

  onAddMore?(): void;
}

export default function MergeActions({
  totalFiles,
  totalSize = 0,
  loading,
  onMerge,
  onClear,
  onAddMore,
}: Props) {
  return (
    <CardFooter className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

      <div className="flex flex-wrap items-center gap-3">

        <Badge variant="primary">

          <Files size={14} />

          {totalFiles} Files

        </Badge>

        <Badge>

          {(totalSize / 1024 / 1024).toFixed(
            2
          )}{" "}
          MB

        </Badge>

      </div>

      <div className="flex flex-wrap gap-3">

        <Button
          variant="outline"
          leftIcon={<Plus size={18} />}
          onClick={onAddMore}
        >
          Add More
        </Button>

        <Button
          variant="danger"
          leftIcon={<Trash2 size={18} />}
          onClick={onClear}
        >
          Clear
        </Button>

        <Button
          loading={loading}
          size="lg"
          rightIcon={
            !loading && (
              <ArrowRight
                size={18}
              />
            )
          }
          onClick={onMerge}
        >
          Merge PDF
        </Button>

      </div>

    </CardFooter>
  );
}