"use client";

import { useMemo, useState } from "react";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import {
  Loader2,
  Scissors,
  FileArchive,
} from "lucide-react";

interface Props {
  file: File | null;
}

export default function SplitButton({
  file,
}: Props) {
  const [loading, setLoading] =
    useState(false);

  const fileSize = useMemo(() => {
    if (!file) return 0;

    return file.size / 1024 / 1024;
  }, [file]);

  async function handleSplit() {
    if (!file) {
      toast.error(
        "Please select a PDF file."
      );
      return;
    }

    try {
      setLoading(true);

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/pdf/split",
          {
            method: "POST",
            body: formData,
          }
        );

      if (!response.ok) {
        let message =
          "Unable to split PDF.";

        try {
          const data =
            await response.json();

          message =
            data.message ??
            message;
        } catch {}

        throw new Error(
          message
        );
      }

      const blob =
        await response.blob();

      const now =
        new Date();

      const fileName = `Split-PDF-${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}.zip`;

      saveAs(
        blob,
        fileName
      );

      toast.success(
        "PDF split successfully."
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
    <section className="mt-8">

      <div className="rounded-3xl border bg-white p-6 shadow-sm">

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

          <div>

            <h2 className="text-xl font-bold text-slate-800">
              Ready to Split
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {file
                ? `${file.name} • ${fileSize.toFixed(
                    2
                  )} MB`
                : "No PDF selected"}
            </p>

          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700">

            <FileArchive
              size={16}
            />

            ZIP Download

          </div>

        </div>

        <button
          onClick={
            handleSplit
          }
          disabled={
            !file ||
            loading
          }
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500 px-8 py-5 text-lg font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2
                size={22}
                className="animate-spin"
              />

              Splitting PDF...
            </>
          ) : (
            <>
              <Scissors
                size={22}
              />

              Split PDF & Download ZIP
            </>
          )}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          Every page will be exported as an individual PDF and packed into a ZIP archive.
        </p>

      </div>

    </section>
  );
}