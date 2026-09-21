"use client";

import { useEffect, useState } from "react";

import { saveAs } from "file-saver";

import toast from "react-hot-toast";

import {
  ImagePlus,
  Move,
  RotateCw,
  Stamp,
} from "lucide-react";

import OperationLayout from "@/components/pdf/OperationLayout";
import PdfToolLayout from "@/components/pdf/PdfToolLayout";
import UploadZone from "@/components/pdf/UploadZone";
import Toolbar from "@/components/pdf/Toolbar";
import ProgressBar from "@/components/pdf/ProgressBar";
import LoadingOverlay from "@/components/pdf/LoadingOverlay";
import SettingsPanel from "@/components/pdf/SettingsPanel";
import EmptyState from "@/components/pdf/EmptyState";
import ErrorCard from "@/components/pdf/ErrorCard";
import SuccessCard from "@/components/pdf/SuccessCard";

export default function WatermarkPdfPage() {
  const [file, setFile] =
    useState<File | null>(null);

  const [text, setText] =
    useState("DigiDesk India");

  const [watermarkType, setWatermarkType] =
    useState<"text" | "image">("text");

  const [image, setImage] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState("");

  const [opacity, setOpacity] =
    useState(25);

  const [fontSize, setFontSize] =
    useState(42);

  const [rotation, setRotation] =
    useState(45);

  const [color, setColor] =
    useState("#64748b");

  const [position, setPosition] =
    useState("center");

  const [pages, setPages] =
    useState("all");

  const [processing, setProcessing] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [blob, setBlob] =
    useState<Blob | null>(null);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!imagePreview) return;
    return () => URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  function selectWatermarkImage(file: File | null) {
    setImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : "");
  }

  async function applyWatermark() {
    if (!file) {
      toast.error(
        "Please select a PDF."
      );
      return;
    }

    if (watermarkType === "text" && !text.trim()) {
      toast.error(
        "Enter watermark text."
      );
      return;
    }

    setProcessing(true);
    setBlob(null);
    setError("");
    setProgress(5);

    try {
      const timer =
        setInterval(() => {
          setProgress((p) =>
            p >= 90
              ? p
              : p + 5
          );
        }, 150);

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "text",
        watermarkType === "text" ? text : ""
      );

      if (image) formData.append("image", image);

      formData.append(
        "opacity",
        String(opacity / 100)
      );

      formData.append(
        "fontSize",
        String(fontSize)
      );

      formData.append(
        "rotation",
        String(rotation)
      );

      formData.append("color", color);
      formData.append("position", position);
      formData.append("pages", pages);

      const response =
        await fetch(
          "/api/pdf/watermark",
          {
            method: "POST",
            body: formData,
          }
        );

      clearInterval(timer);

      if (!response.ok) {
        const data =
          await response.json();

        throw new Error(
          data.message ??
            "Unable to apply watermark."
        );
      }

      const result =
        await response.blob();

      setBlob(result);

      setProgress(100);

      toast.success(
        "Watermark applied successfully."
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Watermark failed."
      );
    } finally {
      setProcessing(false);
    }
  }
    function download() {
    if (!blob) return;

    saveAs(
      blob,
      "Watermarked.pdf"
    );
  }

  function reset() {
    setFile(null);
    setBlob(null);
    setError("");
    setProgress(0);

    setText("DigiDesk India");
    setWatermarkType("text");
    setImage(null);
    setOpacity(25);
    setFontSize(42);
    setRotation(45);
    setColor("#64748b");
    setPosition("center");
    setPages("all");
  }

  return (
    <OperationLayout
      title="Add Watermark"
      description="Protect your documents by adding a professional text watermark without reducing PDF quality."
      icon={<Stamp size={56} />}
    >
      <PdfToolLayout
        title="Watermark PDF"
        description="Upload a PDF, customize the watermark, and generate a professionally watermarked document."
        sidebar={
          <div className="space-y-6">

            <ProgressBar
              progress={progress}
              status={
                processing
                  ? "processing"
                  : blob
                  ? "completed"
                  : "idle"
              }
              title="Watermark Progress"
              description="Applying watermark to your PDF."
            />

            <SettingsPanel
              title="Watermark Settings"
              description="Create a mark, tune its look, and choose where it appears."
            >

              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setWatermarkType("text")}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${watermarkType === "text" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
                >
                  Text watermark
                </button>
                <button
                  type="button"
                  onClick={() => setWatermarkType("image")}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${watermarkType === "image" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
                >
                  Logo or image
                </button>
              </div>

              {watermarkType === "text" ? <div>

                <label className="mb-2 block text-sm font-semibold">

                  Watermark Text

                </label>

                <input
                  type="text"
                  value={text}
                  onChange={(e) =>
                    setText(
                      e.target.value
                    )
                  }
                  placeholder="Enter watermark text"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600"
                />

              </div> : <div>
                <label className="mb-2 block text-sm font-semibold">Watermark image</label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 transition hover:border-blue-500 hover:text-blue-600">
                  <ImagePlus size={20} />
                  <span>{image?.name ?? "Choose a PNG or JPG logo"}</span>
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => selectWatermarkImage(e.target.files?.[0] ?? null)} />
                </label>
              </div>}

              <div>

                <label className="mb-2 block text-sm font-semibold">

                  Opacity ({opacity}%)

                </label>

                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={opacity}
                  onChange={(e) =>
                    setOpacity(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="w-full"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm font-semibold">

                  Font Size

                </label>

                <input
                  type="number"
                  value={fontSize}
                  min={12}
                  max={100}
                  onChange={(e) =>
                    setFontSize(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600"
                />

              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold">Position</label>
                  <select value={position} onChange={(e) => setPosition(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 outline-none transition focus:border-blue-600">
                    <option value="center">Center</option>
                    <option value="top-left">Top left</option>
                    <option value="top-right">Top right</option>
                    <option value="bottom-left">Bottom left</option>
                    <option value="bottom-right">Bottom right</option>
                    <option value="tile">Tile</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold">Color</label>
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-[52px] w-full rounded-xl border border-slate-300 px-2 py-2" disabled={watermarkType === "image"} />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Pages to mark</label>
                <input type="text" value={pages} onChange={(e) => setPages(e.target.value)} placeholder="all or 1-3, 5" className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600" />
              </div>

              <div>

                <label className="mb-2 block text-sm font-semibold">

                  Rotation

                </label>

                <select
                  value={rotation}
                  onChange={(e) =>
                    setRotation(
                      Number(
                        e.target.value
                      )
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600"
                >
                  <option value={0}>
                    0°
                  </option>

                  <option value={45}>
                    45°
                  </option>

                  <option value={90}>
                    90°
                  </option>

                  <option value={135}>
                    135°
                  </option>

                  <option value={180}>
                    180°
                  </option>

                </select>

              </div>

            </SettingsPanel>

          </div>
        }
      >

        <UploadZone
          multiple={false}
          maxFiles={1}
          accept=".pdf"
          value={
            file
              ? [file]
              : []
          }
          onFilesChange={(files) =>
            setFile(
              files[0] ?? null
            )
          }
        />

        {!file && (
          <EmptyState
            title="Upload PDF"
            description="Choose a PDF document to apply a custom watermark."
          />
        )}

        {file && (
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between text-sm font-semibold text-slate-700">
              <span className="flex items-center gap-2"><Move size={16} /> Live page preview</span>
              <span className="flex items-center gap-1 text-xs font-normal text-slate-500"><RotateCw size={14} /> {rotation}°</span>
            </div>
            <div className="relative mx-auto flex aspect-[1/1.414] max-w-[440px] items-center justify-center overflow-hidden bg-white shadow-md">
              <div className="absolute inset-5 border border-dashed border-slate-200" />
              {watermarkType === "image" && imagePreview ? <img src={imagePreview} alt="Watermark preview" className="relative max-h-28 max-w-[65%] object-contain" style={{ opacity: opacity / 100, transform: `rotate(${rotation}deg)` }} /> : <span className="relative max-w-[90%] break-words text-center font-bold" style={{ color, opacity: opacity / 100, fontSize: `${Math.max(18, fontSize / 2)}px`, transform: `rotate(${rotation}deg)` }}>{text || "Your watermark"}</span>}
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">What you see here is the placement and look used for the generated PDF.</p>
          </div>
        )}

        <Toolbar
          title="Watermark PDF"
          processing={processing}
          canProcess={
            !!file &&
            (watermarkType === "image" ? !!image : !!text.trim())
          }
          onProcess={applyWatermark}
          onReset={reset}
          onDownload={
            blob
              ? download
              : undefined
          }
        />
                {error && (
          <ErrorCard
            title="Watermark Failed"
            message={error}
            onRetry={applyWatermark}
          />
        )}

        {blob && (
          <SuccessCard
            title="Watermark Applied Successfully"
            message="Your PDF has been successfully watermarked and is ready for download."
            fileName="Watermarked.pdf"
            fileSize={blob.size}
            buttonText="Download PDF"
            onDownload={download}
            onContinue={reset}
          />
        )}

      </PdfToolLayout>

      <LoadingOverlay
        open={processing}
        progress={progress}
        title="Applying Watermark"
        description="Please wait while DigiDesk India securely applies the watermark to your PDF."
      />

    </OperationLayout>
  );
}