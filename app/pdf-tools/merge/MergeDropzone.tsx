"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";
import toast from "react-hot-toast";

interface Props {
  files: File[];
  setFiles: (files: File[]) => void;
}

const MAX_FILES = 30;

export default function MergeDropzone({
  files,
  setFiles,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);

  function validate(selected: File[]) {
    const valid: File[] = [];

    for (const file of selected) {
      if (file.type !== "application/pdf") {
        toast.error(`${file.name} is not a PDF.`);
        continue;
      }

      if (file.size === 0) {
        toast.error(`${file.name} is empty.`);
        continue;
      }

      const duplicate = files.some(
        (f) =>
          f.name === file.name &&
          f.size === file.size &&
          f.lastModified === file.lastModified
      );

      if (duplicate) {
        toast(`${file.name} already added.`, {
          icon: "📄",
        });
        continue;
      }

      valid.push(file);
    }

    return valid;
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;

    const selected = Array.from(fileList);

    if (files.length + selected.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} PDF files allowed.`);
      return;
    }

    const valid = validate(selected);

    if (!valid.length) return;

    setFiles([...files, ...valid]);

    toast.success(`${valid.length} PDF added.`);
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);

    addFiles(e.dataTransfer.files);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    addFiles(e.target.files);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-10">
      <label
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed py-20 text-center transition-all duration-200 ${
          dragging
            ? "border-blue-600 bg-blue-50 scale-[1.01]"
            : "border-blue-400 bg-white hover:bg-blue-50"
        }`}
      >
        <div className="text-6xl">📄</div>

        <h2 className="mt-5 text-2xl font-bold text-slate-800">
          Drag & Drop PDF Files
        </h2>

        <p className="mt-3 max-w-md text-slate-500">
          Drop your PDF files here or click to browse your device.
        </p>

        <div className="mt-6 rounded-full bg-blue-600 px-6 py-3 font-semibold text-white shadow">
          Choose PDF Files
        </div>

        <p className="mt-5 text-sm text-slate-400">
          Maximum {MAX_FILES} files
        </p>

        <input
          ref={inputRef}
          hidden
          multiple
          type="file"
          accept=".pdf"
          onChange={onChange}
        />
      </label>
    </div>
  );
}