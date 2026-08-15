"use client";

import { useMemo, useState } from "react";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import {
  Loader2,
  Merge,
  FileText,
} from "lucide-react";

interface Props {
  files: File[];
}

export default function MergeButton({
  files,
}: Props) {
  const [loading, setLoading] = useState(false);

  const totalSize = useMemo(() => {
    return files.reduce(
      (sum, file) => sum + file.size,
      0
    );
  }, [files]);

  async function handleMerge() {
    if (loading) return;

    if (files.length < 2) {
      toast.error(
        "Please select at least 2 PDF files."
      );
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(
        "/api/pdf/merge",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        let message = "Unable to merge PDF files.";

        try {
          const data = await response.json();

          message =
            data.message ??
            data.error ??
            message;
        } catch {}

        throw new Error(message);
      }

      const blob = await response.blob();

      const now = new Date();

      const fileName = `Merged-${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}-${String(
        now.getHours()
      ).padStart(2, "0")}${String(
        now.getMinutes()
      ).padStart(2, "0")}.pdf`;

      saveAs(blob, fileName);

      toast.success(
        "PDF merged successfully."
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Ready to Merge
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {files.length} PDF Files •{" "}
              {(totalSize / 1024 / 1024).toFixed(
                2
              )} MB
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
            <FileText size={16} />
            Secure Processing
          </div>

        </div>

        <button
          onClick={handleMerge}
          disabled={
            loading || files.length < 2
          }
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500 px-8 py-5 text-lg font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2
                size={22}
                className="animate-spin"
              />

              Merging PDFs...
            </>
          ) : (
            <>
              <Merge size={22} />

              Merge PDF Files
            </>
          )}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          Files are processed securely and
          merged in the selected order.
        </p>

      </div>
    </section>
  );
}