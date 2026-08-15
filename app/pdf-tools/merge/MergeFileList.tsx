"use client";

import { ArrowDown, ArrowUp, FileText, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  files: File[];
  setFiles: (files: File[]) => void;
}

export default function MergeFileList({
  files,
  setFiles,
}: Props) {
  if (files.length === 0) return null;

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  const moveUp = (index: number) => {
    if (index === 0) return;

    const updated = [...files];

    [updated[index - 1], updated[index]] = [
      updated[index],
      updated[index - 1],
    ];

    setFiles(updated);
  };

  const moveDown = (index: number) => {
    if (index === files.length - 1) return;

    const updated = [...files];

    [updated[index], updated[index + 1]] = [
      updated[index + 1],
      updated[index],
    ];

    setFiles(updated);
  };

  const remove = (index: number) => {
    const fileName = files[index].name;

    setFiles(files.filter((_, i) => i !== index));

    toast.success(`${fileName} removed`);
  };

  const removeAll = () => {
    setFiles([]);

    toast.success("All PDF files removed.");
  };

  return (
    <section className="mt-10">
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border bg-slate-50 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Selected PDF Files
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {files.length} Files •{" "}
            {(totalSize / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>

        <button
          onClick={removeAll}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          <Trash2 size={18} />
          Remove All
        </button>
      </div>

      <div className="space-y-4">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${file.lastModified}-${index}`}
            className="rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-red-100 p-3">
                  <FileText
                    className="text-red-600"
                    size={28}
                  />
                </div>

                <div>
                  <h3 className="break-all font-semibold text-slate-800">
                    {file.name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  disabled={index === 0}
                  onClick={() => moveUp(index)}
                  className="rounded-lg border p-2 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp size={18} />
                </button>

                <button
                  disabled={index === files.length - 1}
                  onClick={() => moveDown(index)}
                  className="rounded-lg border p-2 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowDown size={18} />
                </button>

                <button
                  onClick={() => remove(index)}
                  className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}