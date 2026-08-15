"use client";

import { useRef, useState } from "react";
import { Upload, FilePlus } from "lucide-react";

interface Props {
  files: File[];
  setFiles: (files: File[]) => void;
}

const MAX_FILES = 20;

export default function MergeDropzone({
  files,
  setFiles,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;

    const incoming = Array.from(fileList);

    const pdfs = incoming.filter(
      (file) => file.type === "application/pdf"
    );

    if (pdfs.length === 0) {
      alert("Please select PDF files only.");
      return;
    }

    const uniqueFiles = pdfs.filter(
      (newFile) =>
        !files.some(
          (existing) =>
            existing.name === newFile.name &&
            existing.size === newFile.size
        )
    );

    if (files.length + uniqueFiles.length > MAX_FILES) {
      alert(`Maximum ${MAX_FILES} PDF files allowed.`);
      return;
    }

    setFiles([...files, ...uniqueFiles]);
  }

  function handleDrop(
    e: React.DragEvent<HTMLDivElement>
  ) {
    e.preventDefault();
    e.stopPropagation();

    setDragActive(false);

    addFiles(e.dataTransfer.files);
  }

  function handleDrag(
    e: React.DragEvent<HTMLDivElement>
  ) {
    e.preventDefault();
    e.stopPropagation();

    setDragActive(true);
  }

  function handleLeave(
    e: React.DragEvent<HTMLDivElement>
  ) {
    e.preventDefault();
    e.stopPropagation();

    setDragActive(false);
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDrag}
      onDragEnter={handleDrag}
      onDragLeave={handleLeave}
      className={`mt-10 rounded-3xl border-2 border-dashed transition-all duration-300 ${
        dragActive
          ? "border-blue-600 bg-blue-50"
          : "border-slate-300 bg-white"
      }`}
    >
      <div className="flex flex-col items-center px-8 py-20 text-center">

        <div
          className={`rounded-full p-5 transition ${
            dragActive
              ? "bg-blue-600 text-white"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {dragActive ? (
            <FilePlus size={42} />
          ) : (
            <Upload size={42} />
          )}
        </div>

        <h2 className="mt-6 text-3xl font-bold text-slate-900">
          {dragActive
            ? "Drop PDF Files Here"
            : "Drag & Drop PDF Files"}
        </h2>

        <p className="mt-4 max-w-xl text-slate-500">
          Upload multiple PDF files to merge them into a
          single document. Your files never leave your
          browser.
        </p>

        <button
          onClick={() => inputRef.current?.click()}
          className="mt-8 rounded-2xl bg-blue-600 px-8 py-4 font-semibold text-white transition hover:bg-blue-700"
        >
          Choose PDF Files
        </button>

        <p className="mt-4 text-sm text-slate-400">
          Maximum {MAX_FILES} PDF files
        </p>

        <input
          ref={inputRef}
          hidden
          type="file"
          accept=".pdf"
          multiple
          onChange={(e) => addFiles(e.target.files)}
        />

      </div>
    </div>
  );
}