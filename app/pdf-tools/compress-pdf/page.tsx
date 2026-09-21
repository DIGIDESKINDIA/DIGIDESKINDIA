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

type CompressionResult = {
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
  downloadUrl: string;
  fileName: string;
  notice?: string;
};

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

function getCompressionStrengthLabel(level: number) {
  if (level <= 25) {
    return "Low compression / Best quality";
  }

  if (level <= 50) {
    return "Balanced compression";
  }

  if (level <= 75) {
    return "Strong compression";
  }

  return "Maximum compression";
}

function getCompressionStrengthDescription(level: number) {
  if (level <= 25) {
    return "Document quality is preserved more closely; size savings are usually modest.";
  }

  if (level <= 50) {
    return "Balances image quality and file size for everyday sharing and storage.";
  }

  if (level <= 75) {
    return "Applies stronger optimization for a noticeably smaller output file.";
  }

  return "Uses the strongest optimization available; file size may change more aggressively depending on the PDF content.";
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

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [compressionLevel, setCompressionLevel] =
    useState(60);

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

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
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

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(null);
    setPreviewUrl(null);
    setError("");
    setProgress(0);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleCompress() {
    if (!file) {
      setError(
        "Please select a PDF file first."
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
      formData.append(
        "compressionLevel",
        String(compressionLevel)
      );

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

      const notice =
        response.headers.get(
          "X-Compression-Notice"
        ) || undefined;

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
        downloadUrl,
        fileName,
        notice,
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

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(null);
    setPreviewUrl(null);
    setCompressionLevel(60);
    setError("");
    setProgress(0);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-white text-[#102333]">
      {/* Header */}

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 text-white">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-12">
          <Link
            href="/pdf-tools"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-100 transition hover:text-white"
          >
            <ArrowLeft size={17} />
            Back to PDF Tools
          </Link>

          <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
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
                adjustable compression quality.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 pt-1 text-xs font-semibold text-blue-50 lg:pt-12">
              <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2.5">
                <ShieldCheck size={17} />
                Secure Processing
              </span>

              <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2.5">
                <Gauge size={17} />
                Large-file processing
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main tool */}

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="overflow-hidden border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
          <div className="p-4 sm:p-6 lg:p-7">
            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed px-5 py-9 text-center transition ${
                  dragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-300 bg-[#f8fafc] hover:border-blue-400 hover:bg-blue-50/50"
                }`}
                onClick={() =>
                  inputRef.current?.click()
                }
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
                  <UploadCloud size={38} />
                </div>

                <h2 className="mt-6 text-2xl font-black text-[#102333] sm:text-3xl">
                  Select your PDF
                </h2>

                <p className="mt-2 text-sm text-slate-600 sm:text-base">
                  Drag & drop your PDF here or
                  click to browse.
                </p>

                <button
                  type="button"
                  className="mt-6 rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-700"
                >
                  Choose PDF
                </button>

                <p className="mt-4 text-xs text-slate-500">
                  PDF only • Large valid files are supported
                </p>
              </div>
            ) : (
              <>
                {/* Selected file */}

                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  {previewUrl && (
                    <div className="h-32 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                      <iframe
                        src={`${previewUrl}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                        title={`Preview of ${file.name}`}
                        className="h-[520px] w-[390px] origin-top-left scale-[0.24]"
                      />
                    </div>
                  )}

                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                      <FileText size={25} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-800">
                        {file.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-200">
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

                {/* Compression level */}

                {!result && (
                  <div className="mt-7">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h2 className="text-lg font-black text-slate-900">
                          Compression Level
                        </h2>

                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-200">
                          Move the slider right for
                          a smaller file.
                        </p>
                      </div>

                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                        Original:{" "}
                        {formatBytes(file.size)}
                      </p>
                    </div>

                    <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-100">
                          Low compression / Best quality
                        </span>

                        <output className="text-2xl font-black text-blue-700">
                          {compressionLevel}%
                        </output>

                        <span className="text-right text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-100">
                          Maximum compression
                        </span>
                      </div>

                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={compressionLevel}
                        disabled={loading}
                        onChange={(event) => {
                          setCompressionLevel(
                            Number(event.target.value)
                          );
                          setError("");
                        }}
                        aria-label="Compression level"
                        className="mt-5 h-2 w-full cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
                      />

                      <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-200">
                        The actual output size depends on the PDF’s images, fonts, and internal structure. Higher settings increase optimization strength, not a guaranteed percentage reduction.
                      </p>

                      <div className="mt-4 rounded-xl border border-blue-100 bg-white px-4 py-3 dark:border-slate-500/40 dark:bg-slate-950/70">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-100">
                            Compression strength
                          </span>

                          <strong className="text-right text-sm font-black text-blue-700 sm:text-base">
                            {getCompressionStrengthLabel(compressionLevel)}
                          </strong>
                        </div>

                        <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-200">
                          {getCompressionStrengthDescription(compressionLevel)}
                        </p>
                      </div>
                    </div>

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

                      {result.notice && (
                        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                          {result.notice}
                        </div>
                      )}

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

          <div className="grid border-t border-slate-200 bg-slate-50 sm:grid-cols-3">
            <div className="border-b border-slate-200 px-5 py-4 sm:border-b-0 sm:border-r">
              <p className="text-sm font-bold text-[#102333]">
                Real Compression
              </p>

                <p className="mt-1 text-xs text-slate-600 dark:text-slate-200">
                Server-side PDF optimization
              </p>
            </div>

            <div className="border-b border-slate-200 px-5 py-4 sm:border-b-0 sm:border-r">
              <p className="text-sm font-bold text-[#102333]">
                Compression Level
              </p>

              <p className="mt-1 text-xs text-slate-600 dark:text-slate-200">
                1% to 100% quality control
              </p>
            </div>

            <div className="px-5 py-4">
              <p className="text-sm font-bold text-[#102333]">
                Private
              </p>

              <p className="mt-1 text-xs text-slate-600 dark:text-slate-200">
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