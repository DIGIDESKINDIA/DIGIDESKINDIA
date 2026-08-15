"use client";

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
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type Unit = "KB" | "MB";

type Result = {
  url: string;
  originalSize: number;
  outputSize: number;
  addedBytes: number;
};

const MAX_UPLOAD_SIZE =
  100 * 1024 * 1024;

const MAX_OUTPUT_SIZE =
  150 * 1024 * 1024;

const PRESETS = [
  {
    label: "500 KB",
    bytes: 500 * 1024,
  },
  {
    label: "1 MB",
    bytes: 1024 * 1024,
  },
  {
    label: "2 MB",
    bytes: 2 * 1024 * 1024,
  },
  {
    label: "5 MB",
    bytes: 5 * 1024 * 1024,
  },
];

function formatBytes(
  bytes: number
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(2)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(2)} MB`;
}

function getSuggestedTarget(
  fileSize: number
) {
  const preset =
    PRESETS.find(
      (item) =>
        item.bytes >
        fileSize
    );

  if (preset) {
    return preset.bytes;
  }

  const nextMB =
    Math.ceil(
      fileSize /
        (1024 * 1024)
    ) + 1;

  const target =
    nextMB *
    1024 *
    1024;

  if (
    target <=
    MAX_OUTPUT_SIZE
  ) {
    return target;
  }

  return null;
}

export default function IncreasePDFSizePage() {
  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [file, setFile] =
    useState<File | null>(
      null
    );

  const [
    isDragging,
    setIsDragging,
  ] = useState(false);

  const [
    targetBytes,
    setTargetBytes,
  ] = useState<
    number | null
  >(null);

  const [
    customValue,
    setCustomValue,
  ] = useState("");

  const [
    customUnit,
    setCustomUnit,
  ] =
    useState<Unit>("KB");

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    result,
    setResult,
  ] =
    useState<Result | null>(
      null
    );

  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(
          result.url
        );
      }
    };
  }, [result]);

  function clearResult() {
    if (result?.url) {
      URL.revokeObjectURL(
        result.url
      );
    }

    setResult(null);
  }

  function handleSelectedFile(
    selectedFile: File
  ) {
    setError("");
    clearResult();

    const isPDF =
      selectedFile.type ===
        "application/pdf" ||
      selectedFile.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPDF) {
      setError(
        "Please select a valid PDF file."
      );
      return;
    }

    if (
      selectedFile.size <= 0
    ) {
      setError(
        "The selected PDF is empty."
      );
      return;
    }

    if (
      selectedFile.size >
      MAX_UPLOAD_SIZE
    ) {
      setError(
        "Maximum upload size is 100 MB."
      );
      return;
    }

    setFile(
      selectedFile
    );

    setCustomValue("");

    const suggested =
      getSuggestedTarget(
        selectedFile.size
      );

    setTargetBytes(
      suggested
    );
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selected =
      event.target
        .files?.[0];

    if (selected) {
      handleSelectedFile(
        selected
      );
    }
  }

  function handleDragOver(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    setIsDragging(true);
  }

  function handleDragLeave(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    setIsDragging(false);
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    setIsDragging(false);

    const selected =
      event.dataTransfer
        .files?.[0];

    if (selected) {
      handleSelectedFile(
        selected
      );
    }
  }

  function removeFile() {
    clearResult();

    setFile(null);

    setTargetBytes(
      null
    );

    setCustomValue("");

    setError("");

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  }

  function selectPreset(
    bytes: number
  ) {
    if (!file) {
      return;
    }

    if (
      bytes <= file.size
    ) {
      setError(
        "Selected size must be larger than the original PDF."
      );
      return;
    }

    setError("");

    setTargetBytes(
      bytes
    );

    setCustomValue("");

    clearResult();
  }

  function applyCustomTarget() {
    setError("");

    clearResult();

    if (!file) {
      setError(
        "Please select a PDF first."
      );
      return;
    }

    const value =
      Number(
        customValue
      );

    if (
      !Number.isFinite(
        value
      ) ||
      value <= 0
    ) {
      setError(
        "Please enter a valid custom size."
      );
      return;
    }

    const bytes =
      customUnit === "MB"
        ? Math.round(
            value *
              1024 *
              1024
          )
        : Math.round(
            value *
              1024
          );

    if (
      bytes <= file.size
    ) {
      setError(
        `Target must be larger than the current PDF (${formatBytes(
          file.size
        )}).`
      );
      return;
    }

    if (
      bytes >
      MAX_OUTPUT_SIZE
    ) {
      setError(
        "Maximum output size is 150 MB."
      );
      return;
    }

    setTargetBytes(
      bytes
    );
  }

  async function handleIncrease() {
    if (!file) {
      setError(
        "Please select a PDF file."
      );
      return;
    }

    if (
      !targetBytes
    ) {
      setError(
        "Please select or enter a target size."
      );
      return;
    }

    if (
      targetBytes <=
      file.size
    ) {
      setError(
        "Target size must be larger than the original PDF."
      );
      return;
    }

    try {
      setProcessing(true);

      setError("");

      clearResult();

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "targetBytes",
        String(
          targetBytes
        )
      );

      const response =
        await fetch(
          "/api/pdf/increase-size",
          {
            method: "POST",
            body: formData,
          }
        );

      if (
        !response.ok
      ) {
        let message =
          "Could not increase PDF size.";

        try {
          const data =
            await response.json();

          if (
            typeof data?.error ===
            "string"
          ) {
            message =
              data.error;
          }
        } catch {
          // Ignore response
          // parsing errors.
        }

        throw new Error(
          message
        );
      }

      const blob =
        await response.blob();

      if (
        blob.size <= 0
      ) {
        throw new Error(
          "The server returned an empty PDF."
        );
      }

      const url =
        URL.createObjectURL(
          blob
        );

      const originalHeader =
        response.headers.get(
          "X-Original-Size"
        );

      const outputHeader =
        response.headers.get(
          "X-Output-Size"
        );

      const addedHeader =
        response.headers.get(
          "X-Added-Bytes"
        );

      const originalSize =
        Number(
          originalHeader
        ) || file.size;

      const outputSize =
        Number(
          outputHeader
        ) || blob.size;

      const addedBytes =
        Number(
          addedHeader
        ) ||
        Math.max(
          0,
          outputSize -
            originalSize
        );

      setResult({
        url,
        originalSize,
        outputSize,
        addedBytes,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not increase PDF size."
      );
    } finally {
      setProcessing(false);
    }
  }

  function downloadPDF() {
    if (
      !result ||
      !file
    ) {
      return;
    }

    const originalName =
      file.name.replace(
        /\.pdf$/i,
        ""
      );

    const safeName =
      originalName.trim() ||
      "document";

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href =
      result.url;

    anchor.download =
      `${safeName}-increased.pdf`;

    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();
  }

  function resetTool() {
    removeFile();
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* HERO */}

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 text-white">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-blue-300/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-12">
          <Link
            href="/pdf-tools"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-100 transition hover:text-white"
          >
            <ArrowLeft
              size={17}
            />

            PDF Tools
          </Link>

          <div className="mt-6 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                <Gauge
                  size={29}
                />
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  Increase PDF
                  Size
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                  Increase your
                  PDF to the
                  required file
                  size without
                  reducing visible
                  quality.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs font-semibold text-blue-50">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                <Zap
                  size={17}
                />

                Fast Processing
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                <ShieldCheck
                  size={17}
                />

                Quality Preserved
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TOOL */}

      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
          <div className="p-5 sm:p-8">
            {!file ? (
              <div
                onClick={() =>
                  fileInputRef.current?.click()
                }
                onDragOver={
                  handleDragOver
                }
                onDragLeave={
                  handleDragLeave
                }
                onDrop={
                  handleDrop
                }
                className={`flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed px-5 py-10 text-center transition ${
                  isDragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-300 bg-slate-50/70 hover:border-blue-400 hover:bg-blue-50/50"
                }`}
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
                  <UploadCloud
                    size={38}
                  />
                </div>

                <h2 className="mt-6 text-2xl font-black sm:text-3xl">
                  Select your
                  PDF
                </h2>

                <p className="mt-2 text-sm text-slate-500 sm:text-base">
                  Drag & drop
                  your PDF here
                  or click to
                  browse.
                </p>

                <button
                  type="button"
                  className="mt-6 rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-700"
                >
                  Choose PDF
                </button>
              </div>
            ) : (
              <>
                {/* FILE */}

                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                      <FileText
                        size={25}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-800">
                        {
                          file.name
                        }
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Current
                        size:{" "}
                        {formatBytes(
                          file.size
                        )}
                      </p>
                    </div>
                  </div>

                  {!processing && (
                    <button
                      type="button"
                      onClick={
                        removeFile
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove PDF"
                    >
                      <X
                        size={19}
                      />
                    </button>
                  )}
                </div>

                {/* TARGET */}

                <div className="mt-6 rounded-2xl border border-slate-200 p-5">
                  <h2 className="text-lg font-black">
                    Choose New
                    Size
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Select a size
                    larger than
                    your current
                    PDF.
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {PRESETS.map(
                      (
                        preset
                      ) => {
                        const disabled =
                          preset.bytes <=
                          file.size;

                        const active =
                          targetBytes ===
                          preset.bytes;

                        return (
                          <button
                            key={
                              preset.label
                            }
                            type="button"
                            disabled={
                              disabled ||
                              processing
                            }
                            onClick={() =>
                              selectPreset(
                                preset.bytes
                              )
                            }
                            className={`rounded-2xl border px-3 py-4 text-center font-black transition ${
                              active
                                ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600/10"
                                : "border-slate-200 bg-white text-slate-800 hover:border-blue-300"
                            } disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
                          >
                            {
                              preset.label
                            }
                          </button>
                        );
                      }
                    )}
                  </div>

                  {/* CUSTOM */}

                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <label className="text-sm font-bold text-slate-800">
                      Custom Size
                    </label>

                    <div className="mt-3 flex max-w-lg overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-blue-500">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={
                          customValue
                        }
                        disabled={
                          processing
                        }
                        onChange={(
                          event
                        ) =>
                          setCustomValue(
                            event
                              .target
                              .value
                          )
                        }
                        onKeyDown={(
                          event
                        ) => {
                          if (
                            event.key ===
                            "Enter"
                          ) {
                            applyCustomTarget();
                          }
                        }}
                        placeholder="Enter size"
                        className="min-w-0 flex-1 bg-white px-4 py-3 outline-none"
                      />

                      <select
                        value={
                          customUnit
                        }
                        disabled={
                          processing
                        }
                        onChange={(
                          event
                        ) =>
                          setCustomUnit(
                            event
                              .target
                              .value as Unit
                          )
                        }
                        className="border-l border-slate-200 bg-white px-4 font-bold outline-none"
                      >
                        <option value="KB">
                          KB
                        </option>

                        <option value="MB">
                          MB
                        </option>
                      </select>

                      <button
                        type="button"
                        disabled={
                          processing
                        }
                        onClick={
                          applyCustomTarget
                        }
                        className="border-l border-slate-200 bg-blue-600 px-5 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {/* SELECTED TARGET */}

                  {targetBytes && (
                    <div className="mt-5 flex flex-col gap-1 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-semibold text-blue-700">
                        Output
                        target
                      </span>

                      <span className="font-black text-blue-900">
                        {formatBytes(
                          targetBytes
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* ERROR */}

                {error && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}

                {/* BUTTON */}

                <button
                  type="button"
                  disabled={
                    processing ||
                    !targetBytes
                  }
                  onClick={
                    handleIncrease
                  }
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 text-base font-black text-white shadow-lg shadow-blue-500/20 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processing ? (
                    <>
                      <Loader2
                        size={20}
                        className="animate-spin"
                      />

                      Processing...
                    </>
                  ) : (
                    <>
                      <Gauge
                        size={20}
                      />

                      Increase PDF
                      Size
                    </>
                  )}
                </button>

                {/* RESULT */}

                {result && (
                  <div className="mt-7 rounded-[24px] border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6">
                    <div className="flex gap-3">
                      <CheckCircle2
                        size={28}
                        className="shrink-0 text-emerald-600"
                      />

                      <div>
                        <h3 className="font-black text-emerald-900">
                          PDF size
                          increased
                          successfully
                        </h3>

                        <p className="mt-1 text-sm text-emerald-700">
                          Your new
                          PDF is
                          ready to
                          download.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-emerald-100 bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Original
                        </p>

                        <p className="mt-1 font-black text-slate-900">
                          {formatBytes(
                            result.originalSize
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-100 bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          New Size
                        </p>

                        <p className="mt-1 font-black text-emerald-700">
                          {formatBytes(
                            result.outputSize
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-100 bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Added
                        </p>

                        <p className="mt-1 font-black text-slate-900">
                          {formatBytes(
                            result.addedBytes
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={
                          downloadPDF
                        }
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-black text-white transition hover:bg-emerald-700"
                      >
                        <Download
                          size={19}
                        />

                        Download
                        PDF
                      </button>

                      <button
                        type="button"
                        onClick={
                          resetTool
                        }
                        className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        <RefreshCcw
                          size={18}
                        />

                        New PDF
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <input
              ref={
                fileInputRef
              }
              type="file"
              accept="application/pdf,.pdf"
              onChange={
                handleFileChange
              }
              className="hidden"
            />

            {!file &&
              error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}
          </div>

          {/* FOOTER FEATURES */}

          <div className="grid border-t border-slate-100 bg-slate-50/70 sm:grid-cols-3">
            <div className="border-b border-slate-100 px-5 py-4 sm:border-b-0 sm:border-r">
              <p className="text-sm font-bold">
                Fast
              </p>

              <p className="mt-1 text-xs text-slate-500">
                No heavy PDF
                recompression
              </p>
            </div>

            <div className="border-b border-slate-100 px-5 py-4 sm:border-b-0 sm:border-r">
              <p className="text-sm font-bold">
                Exact Target
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Increase to
                your selected
                file size
              </p>
            </div>

            <div className="px-5 py-4">
              <p className="text-sm font-bold">
                Quality
                Preserved
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Original pages
                are not
                recompressed
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}