"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Download,
  RotateCcw,
  Copy,
  Share2,
  FileText,
  Clock3,
  Files,
  CheckCircle2,
} from "lucide-react";

export interface DownloadCardProps {
  fileName: string;
  fileSize: number;
  pages?: number;
  processingTime?: number;
  thumbnail?: string;
  downloadUrl: string;
  shareUrl?: string;
  onProcessAgain?: () => void;
}

export default function DownloadCard({
  fileName,
  fileSize,
  pages,
  processingTime,
  thumbnail,
  downloadUrl,
  shareUrl,
  onProcessAgain,
}: DownloadCardProps) {
  const copyLink = async () => {
    if (!shareUrl) return;

    await navigator.clipboard.writeText(
      shareUrl
    );
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">

      {/* Header */}

      <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-5 text-white dark:border-slate-800">

        <CheckCircle2 size={28} />

        <div>

          <h2 className="text-xl font-bold">

            Processing Complete

          </h2>

          <p className="text-sm text-green-100">

            Your file is ready to download

          </p>

        </div>

      </div>

      {/* Body */}

      <div className="grid gap-8 p-6 lg:grid-cols-[220px_1fr]">

        {/* Preview */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">

          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={fileName}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="flex h-56 items-center justify-center">

              <FileText
                size={72}
                className="text-red-600"
              />

            </div>
          )}

        </div>

        {/* Details */}

        <div>

          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">

            {fileName}

          </h3>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">

            <InfoBox
              icon={<Files size={18} />}
              label="File Size"
              value={`${(
                fileSize /
                1024 /
                1024
              ).toFixed(2)} MB`}
            />

            <InfoBox
              icon={<FileText size={18} />}
              label="Pages"
              value={
                pages
                  ? pages.toString()
                  : "--"
              }
            />

            <InfoBox
              icon={<Clock3 size={18} />}
              label="Time"
              value={
                processingTime
                  ? `${processingTime}s`
                  : "--"
              }
            />

          </div>

          {/* Actions */}

          <div className="mt-8 flex flex-wrap gap-4">

            <Link
              href={downloadUrl}
              download
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-6 py-4 font-semibold text-white transition hover:bg-blue-800"
            >
              <Download size={20} />

              Download File

            </Link>

            {shareUrl && (

              <>
                <button
                  onClick={copyLink}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-6 py-4 font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >

                  <Copy size={18} />

                  Copy Link

                </button>

                <Link
                  href={shareUrl}
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-6 py-4 font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >

                  <Share2 size={18} />

                  Share

                </Link>

              </>

            )}

            {onProcessAgain && (

              <button
                onClick={onProcessAgain}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 font-semibold text-white transition hover:bg-emerald-700"
              >

                <RotateCcw size={18} />

                Process Another

              </button>

            )}

          </div>

        </div>

      </div>

    </div>
  );
}

interface InfoBoxProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoBox({
  icon,
  label,
  value,
}: InfoBoxProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">

      <div className="mb-3 text-blue-700 dark:text-cyan-400">

        {icon}

      </div>

      <p className="text-sm text-slate-500">

        {label}

      </p>

      <h4 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">

        {value}

      </h4>

    </div>
  );
}