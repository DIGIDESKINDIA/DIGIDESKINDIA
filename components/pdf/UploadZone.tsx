"use client";

import {
  useRef,
  useState,
  DragEvent,
} from "react";

import {
  UploadCloud,
  FileText,
} from "lucide-react";

import toast from "react-hot-toast";

interface UploadZoneProps {
  multiple?: boolean;

  accept?: string;

  maxFiles?: number;

  maxFileSize?: number;

  value?: File[];

  onFilesChange(
    files: File[]
  ): void;
}

export default function UploadZone({
  multiple = false,

  accept = ".pdf",

  maxFiles = 30,

  maxFileSize = 100 * 1024 * 1024,

  value = [],

  onFilesChange,
}: UploadZoneProps) {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [dragging, setDragging] =
    useState(false);

  function validate(
    files: File[]
  ) {
    if (!files.length) return;

    if (
      files.length > maxFiles
    ) {
      toast.error(
        `Maximum ${maxFiles} files allowed.`
      );

      return;
    }

    for (const file of files) {
      if (
        file.size >
        maxFileSize
      ) {
        toast.error(
          `${file.name} exceeds ${(maxFileSize / 1024 / 1024).toFixed(0)} MB`
        );

        return;
      }
    }

    const unique =
      new Map<
        string,
        File
      >();

    [...value, ...files].forEach(
      (file) => {
        unique.set(
          `${file.name}-${file.size}`,
          file
        );
      }
    );

    onFilesChange(
      Array.from(
        unique.values()
      )
    );

    toast.success(
      `${files.length} file(s) added`
    );
  }

  function handleDrop(
    e: DragEvent<HTMLDivElement>
  ) {
    e.preventDefault();

    setDragging(false);

    validate(
      Array.from(
        e.dataTransfer.files
      )
    );
  }

  return (
    <>
      <div
        onClick={() =>
          inputRef.current?.click()
        }
        onDragOver={(e) => {
          e.preventDefault();

          setDragging(true);
        }}
        onDragLeave={() =>
          setDragging(false)
        }
        onDrop={handleDrop}
        className={`cursor-pointer rounded-3xl border-2 border-dashed p-14 transition-all duration-300

        ${
          dragging
            ? "border-blue-600 bg-blue-50"
            : "border-slate-300 bg-white hover:border-blue-500 hover:bg-slate-50"
        }`}
      >
        <div className="flex flex-col items-center">

          <div className="rounded-full bg-blue-100 p-5">

            <UploadCloud
              size={42}
              className="text-blue-600"
            />

          </div>

          <h2 className="mt-6 text-3xl font-bold">

            Drag & Drop Files

          </h2>

          <p className="mt-3 text-center text-slate-500">

            or click to browse

          </p>

          <p className="mt-2 text-sm text-slate-400">

            Max {maxFiles} files

          </p>

        </div>
      </div>

      <input
        hidden
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={(e) =>
          validate(
            Array.from(
              e.target.files ??
                []
            )
          )
        }
      />

      {value.length > 0 && (
        <div className="mt-8 space-y-3">

          {value.map(
            (file) => (
              <div
                key={`${file.name}-${file.size}`}
                className="flex items-center justify-between rounded-2xl border bg-white p-4"
              >
                <div className="flex items-center gap-4">

                  <div className="rounded-xl bg-red-100 p-3">

                    <FileText
                      size={22}
                      className="text-red-600"
                    />

                  </div>

                  <div>

                    <h4 className="font-semibold">

                      {file.name}

                    </h4>

                    <p className="text-sm text-slate-500">

                      {(
                        file.size /
                        1024 /
                        1024
                      ).toFixed(2)}{" "}
                      MB

                    </p>

                  </div>

                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();

                    onFilesChange(
                      value.filter(
                        (f) =>
                          f !==
                          file
                      )
                    );
                  }}
                  className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                >
                  Remove
                </button>
              </div>
            )
          )}

        </div>
      )}
    </>
  );
}