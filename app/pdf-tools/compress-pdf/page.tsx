"use client";

import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Gauge,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";

type CompressionMode =
  | "auto"
  | "100"
  | "200"
  | "500"
  | "custom";

type CustomUnit = "KB" | "MB";

type CompressionResult = {
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
  targetSize: number | null;
  targetReached: boolean;
  downloadUrl: string;
  fileName: string;
};

const compressionOptions: {
  id: CompressionMode;
  title: string;
  subtitle: string;
}[] = [
  {
    id: "auto",
    title: "Automatic",
    subtitle: "Best balance",
  },
  {
    id: "100",
    title: "100 KB",
    subtitle: "Compact",
  },
  {
    id: "200",
    title: "200 KB",
    subtitle: "Recommended",
  },
  {
    id: "500",
    title: "500 KB",
    subtitle: "Better quality",
  },
  {
    id: "custom",
    title: "Custom",
    subtitle: "Choose size",
  },
];

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(kb >= 100 ? 0 : 2)} KB`;
  }

  const mb = kb / 1024;

  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
}

function getDownloadFileName(
  contentDisposition: string | null,
  originalName: string
) {
  if (contentDisposition) {
    const utfMatch = contentDisposition.match(
      /filename\*=UTF-8''([^;]+)/i
    );

    if (utfMatch?.[1]) {
      try {
        return decodeURIComponent(utfMatch[1]);
      } catch {
        // Continue with normal filename.
      }
    }

    const normalMatch = contentDisposition.match(
      /filename="?([^"]+)"?/i
    );

    if (normalMatch?.[1]) {
      return normalMatch[1].trim();
    }
  }

  const baseName =
    originalName.replace(/\.pdf$/i, "") || "document";

  return `${baseName}-compressed.pdf`;
}

export default function CompressPDFPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);

  const [mode, setMode] =
    useState<CompressionMode>("auto");

  const [customValue, setCustomValue] =
    useState("100");

  const [customUnit, setCustomUnit] =
    useState<CustomUnit>("KB");

  const [dragging, setDragging] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [error, setError] =
    useState("");

  const [result, setResult] =
    useState<CompressionResult | null>(null);

  const clearResult = useCallback(() => {
    setResult((current) => {
      if (current?.downloadUrl) {
        URL.revokeObjectURL(current.downloadUrl);
      }

      return null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (result?.downloadUrl) {
        URL.revokeObjectURL(result.downloadUrl);
      }
    };
  }, [result]);

  function validateFile(selectedFile: File) {
    const isPDF =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPDF) {
      return "Please select a PDF file only.";
    }

    if (selectedFile.size <= 0) {
      return "This PDF file is empty.";
    }

    return "";
  }

  function selectFile(selectedFile: File | null) {
    if (!selectedFile) {
      return;
    }

    const validationError =
      validateFile(selectedFile);

    if (validationError) {
      setError(validationError);
      return;
    }

    clearResult();

    setFile(selectedFile);
    setError("");
    setProgress(0);
  }

  function handleFileInput(
    event: ChangeEvent<HTMLInputElement>
  ) {
    selectFile(
      event.target.files?.[0] ?? null
    );

    event.target.value = "";
  }

  function handleDragOver(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    if (!loading) {
      setDragging(true);
    }
  }

  function handleDragLeave(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setDragging(false);
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    setDragging(false);

    if (loading) {
      return;
    }

    selectFile(
      event.dataTransfer.files?.[0] ?? null
    );
  }

  function removeFile() {
    if (loading) {
      return;
    }

    clearResult();

    setFile(null);
    setError("");
    setProgress(0);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function getTargetBytes() {
    if (mode === "auto") {
      return null;
    }

    if (mode !== "custom") {
      return Number(mode) * 1024;
    }

    const value = Number(customValue);

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      throw new Error(
        "Please enter a valid custom target size."
      );
    }

    const bytes =
      customUnit === "MB"
        ? value * 1024 * 1024
        : value * 1024;

    return Math.round(bytes);
  }

  async function handleCompress() {
    if (!file) {
      setError(
        "Please select a PDF file first."
      );
      return;
    }

    let targetBytes: number | null;

    try {
      targetBytes = getTargetBytes();
    } catch (targetError) {
      setError(
        targetError instanceof Error
          ? targetError.message
          : "Invalid target size."
      );

      return;
    }

    if (
      targetBytes !== null &&
      targetBytes >= file.size
    ) {
      setError(
        `Your PDF is already ${formatBytes(
          file.size
        )}. Choose a target smaller than the original file size.`
      );

      return;
    }

    clearResult();

    setLoading(true);
    setError("");
    setProgress(8);

    let progressTimer:
      | ReturnType<typeof setInterval>
      | undefined;

    try {
      progressTimer = setInterval(() => {
        setProgress((current) => {
          if (current >= 90) {
            return current;
          }

          if (current < 35) {
            return current + 5;
          }

          if (current < 65) {
            return current + 3;
          }

          return current + 1;
        });
      }, 500);

      const formData = new FormData();

      formData.append("file", file);

      if (targetBytes !== null) {
        formData.append(
          "targetBytes",
          String(targetBytes)
        );
      }

      const response = await fetch(
        "/api/pdf/compress",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        let message =
          "PDF compression failed.";

        try {
          const data = await response.json();

          if (
            typeof data?.error === "string"
          ) {
            message = data.error;
          }
        } catch {
          // Response may not be JSON.
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      if (
        blob.size <= 0 ||
        blob.type !== "application/pdf"
      ) {
        throw new Error(
          "The server did not return a valid compressed PDF."
        );
      }

      const originalSize = Number(
        response.headers.get(
          "X-Original-Size"
        ) || file.size
      );

      const compressedSize = Number(
        response.headers.get(
          "X-Compressed-Size"
        ) || blob.size
      );

      const reductionPercent = Number(
        response.headers.get(
          "X-Reduction-Percent"
        ) || "0"
      );

      const responseTarget = Number(
        response.headers.get(
          "X-Target-Size"
        ) || "0"
      );

      const targetReached =
        response.headers.get(
          "X-Target-Reached"
        ) === "true";

      const fileName =
        getDownloadFileName(
          response.headers.get(
            "Content-Disposition"
          ),
          file.name
        );

      const downloadUrl =
        URL.createObjectURL(blob);

      setProgress(100);

      setResult({
        originalSize,
        compressedSize,
        reductionPercent,
        targetSize:
          responseTarget > 0
            ? responseTarget
            : null,
        targetReached,
        downloadUrl,
        fileName,
      });
    } catch (compressionError) {
      setProgress(0);

      setError(
        compressionError instanceof Error
          ? compressionError.message
          : "PDF compression failed."
      );
    } finally {
      if (progressTimer) {
        clearInterval(progressTimer);
      }

      setLoading(false);
    }
  }

  function downloadPDF() {
    if (!result) {
      return;
    }

    const anchor =
      document.createElement("a");

    anchor.href = result.downloadUrl;
    anchor.download = result.fileName;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function resetTool() {
    if (loading) {
      return;
    }

    clearResult();

    setFile(null);
    setMode("auto");
    setCustomValue("100");
    setCustomUnit("KB");
    setError("");
    setProgress(0);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 text-white">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-12">
          <Link
            href="/pdf-tools"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-100 transition hover:text-white"
          >
            <ArrowLeft size={17} />
            Back to PDF Tools
          </Link>

          <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur">
                <Sparkles size={15} />
                Digital Desk PDF Tools
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                Compress PDF
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                Reduce PDF file size with
                automatic optimization or choose
                your preferred target size.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-xs font-semibold text-blue-50">
              <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                <ShieldCheck size={17} />
                Secure Processing
              </span>

              <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                <Gauge size={17} />
                Large-file processing
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main tool */}

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <div className="p-5 sm:p-7 lg:p-8">
            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed px-5 py-10 text-center transition ${
                  dragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-300 bg-slate-50/70 hover:border-blue-400 hover:bg-blue-50/50"
                }`}
                onClick={() =>
                  inputRef.current?.click()
                }
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
                  <UploadCloud size={38} />
                </div>

                <h2 className="mt-6 text-2xl font-black sm:text-3xl">
                  Select your PDF
                </h2>

                <p className="mt-2 text-sm text-slate-500 sm:text-base">
                  Drag & drop your PDF here or
                  click to browse.
                </p>

                <button
                  type="button"
                  className="mt-6 rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-700"
                >
                  Choose PDF
                </button>

                <p className="mt-4 text-xs text-slate-400">
                  PDF only • Large valid files are supported
                </p>
              </div>
            ) : (
              <>
                {/* Selected file */}

                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                      <FileText size={25} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-800">
                        {file.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                  </div>

                  {!loading && (
                    <button
                      type="button"
                      onClick={removeFile}
                      className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:self-auto"
                      aria-label="Remove PDF"
                    >
                      <X size={19} />
                    </button>
                  )}
                </div>

                {/* Compression size */}

                {!result && (
                  <div className="mt-7">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h2 className="text-lg font-black text-slate-900">
                          Compression Size
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Select the output size
                          you want.
                        </p>
                      </div>

                      <p className="text-xs font-medium text-slate-400">
                        Original:{" "}
                        {formatBytes(file.size)}
                      </p>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                      {compressionOptions.map(
                        (option) => {
                          const active =
                            mode === option.id;

                          return (
                            <button
                              key={option.id}
                              type="button"
                              disabled={loading}
                              onClick={() => {
                                setMode(option.id);
                                setError("");
                              }}
                              className={`min-h-[82px] rounded-2xl border px-3 py-3 text-left transition ${
                                active
                                  ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600/10"
                                  : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                              } disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              <div
                                className={`text-sm font-black ${
                                  active
                                    ? "text-blue-700"
                                    : "text-slate-800"
                                }`}
                              >
                                {option.title}
                              </div>

                              <div className="mt-1 text-[11px] font-medium text-slate-500">
                                {option.subtitle}
                              </div>
                            </button>
                          );
                        }
                      )}
                    </div>

                    {mode === "custom" && (
                      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                        <label className="text-sm font-bold text-slate-800">
                          Custom target size
                        </label>

                        <div className="mt-3 flex max-w-md overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={customValue}
                            disabled={loading}
                            onChange={(event) => {
                              setCustomValue(
                                event.target.value
                              );

                              setError("");
                            }}
                            className="min-w-0 flex-1 px-4 py-3 text-sm font-semibold outline-none"
                            placeholder="Enter size"
                          />

                          <select
                            value={customUnit}
                            disabled={loading}
                            onChange={(event) =>
                              setCustomUnit(
                                event.target
                                  .value as CustomUnit
                              )
                            }
                            className="border-l border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none"
                          >
                            <option value="KB">
                              KB
                            </option>

                            <option value="MB">
                              MB
                            </option>
                          </select>
                        </div>

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          The target must be smaller
                          than the original PDF.
                          Extremely small targets may
                          reduce image quality.
                        </p>
                      </div>
                    )}

                    {/* Error */}

                    {error && (
                      <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {error}
                      </div>
                    )}

                    {/* Progress */}

                    {loading && (
                      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Loader2
                              className="animate-spin text-blue-600"
                              size={20}
                            />

                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                Compressing your
                                PDF...
                              </p>

                              <p className="mt-0.5 text-xs text-slate-500">
                                Finding the best
                                quality and size.
                              </p>
                            </div>
                          </div>

                          <span className="text-sm font-black text-blue-700">
                            {progress}%
                          </span>
                        </div>

                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleCompress}
                      disabled={loading}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 text-base font-black text-white shadow-lg shadow-blue-500/20 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2
                            size={20}
                            className="animate-spin"
                          />
                          Compressing...
                        </>
                      ) : (
                        <>
                          <Gauge size={20} />
                          Compress PDF
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Result */}

                {result && (
                  <div className="mt-7">
                    <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3">
                          <CheckCircle2
                            size={28}
                            className="mt-0.5 shrink-0 text-emerald-600"
                          />

                          <div>
                            <h2 className="text-xl font-black text-slate-900">
                              PDF compressed
                              successfully
                            </h2>

                            <p className="mt-1 text-sm text-slate-600">
                              Your compressed PDF
                              is ready to download.
                            </p>
                          </div>
                        </div>

                        <span className="w-fit rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white">
                          {result.reductionPercent}%
                          smaller
                        </span>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Original
                          </p>

                          <p className="mt-2 text-lg font-black text-slate-900">
                            {formatBytes(
                              result.originalSize
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Compressed
                          </p>

                          <p className="mt-2 text-lg font-black text-blue-700">
                            {formatBytes(
                              result.compressedSize
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Saved
                          </p>

                          <p className="mt-2 text-lg font-black text-emerald-700">
                            {formatBytes(
                              Math.max(
                                0,
                                result.originalSize -
                                  result.compressedSize
                              )
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Reduction
                          </p>

                          <p className="mt-2 text-lg font-black text-slate-900">
                            {
                              result.reductionPercent
                            }
                            %
                          </p>
                        </div>
                      </div>

                      {result.targetSize && (
                        <div
                          className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
                            result.targetReached
                              ? "border-emerald-200 bg-white text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-800"
                          }`}
                        >
                          {result.targetReached
                            ? `Target reached. Requested ${formatBytes(
                                result.targetSize
                              )}, output ${formatBytes(
                                result.compressedSize
                              )}.`
                            : `The requested ${formatBytes(
                                result.targetSize
                              )} target could not be reached safely. The smallest generated result is ${formatBytes(
                                result.compressedSize
                              )}.`}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={downloadPDF}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 font-black text-white shadow-md transition hover:bg-emerald-700"
                      >
                        <Download size={20} />
                        Download Compressed PDF
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          clearResult();
                          setProgress(0);
                          setError("");
                        }}
                        className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 font-bold text-blue-700 transition hover:bg-blue-100"
                      >
                        <Gauge size={18} />
                        Compress Again
                      </button>

                      <button
                        type="button"
                        onClick={resetTool}
                        className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        <RefreshCcw size={18} />
                        New PDF
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileInput}
              className="hidden"
            />

            {!file && error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Bottom info */}

          <div className="grid border-t border-slate-100 bg-slate-50/70 sm:grid-cols-3">
            <div className="border-b border-slate-100 px-5 py-4 sm:border-b-0 sm:border-r">
              <p className="text-sm font-bold text-slate-800">
                Real Compression
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Server-side PDF optimization
              </p>
            </div>

            <div className="border-b border-slate-100 px-5 py-4 sm:border-b-0 sm:border-r">
              <p className="text-sm font-bold text-slate-800">
                Target Size
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Preset and custom output sizes
              </p>
            </div>

            <div className="px-5 py-4">
              <p className="text-sm font-bold text-slate-800">
                Private
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Temporary files are removed
                after processing
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}