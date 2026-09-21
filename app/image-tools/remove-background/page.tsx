"use client";

import { useEffect, useRef, useState } from "react";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import { Check, Download, ImagePlus, LoaderCircle, Sparkles, UploadCloud } from "lucide-react";
import WhatsAppButton from "@/components/WhatsAppButton";

export default function RemoveBackgroundPage() {
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState("");
  const [background, setBackground] = useState<"transparent" | "white">("transparent");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  }, [preview, resultUrl]);

  function handleImage(selected?: File) {
    if (!selected || !selected.type.startsWith("image/")) return;

    if (preview) URL.revokeObjectURL(preview);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(selected);
    setError("");
    setPreview(URL.createObjectURL(selected));
    setResultBlob(null);
    setResultUrl("");
    setBackground("transparent");
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleImage(e.target.files?.[0]);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    handleImage(e.dataTransfer.files?.[0]);
  }

  async function removeBackground() {
    if (!file) {
      toast.error("Please select an image.");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/image/remove-background", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "Unable to remove background.");
      }

      const blob = await response.blob();
      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
      toast.success("Background removed successfully. Choose a background to download.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Background removal failed.";
      setError(message);
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  }

  async function downloadResult() {
    if (!resultBlob || !file) return;

    if (background === "transparent") {
      saveAs(resultBlob, `${file.name.replace(/\.[^.]+$/, "") || "image"}-nobg.png`);
      return;
    }

    const image = new Image();
    image.src = URL.createObjectURL(resultBlob);
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Unable to prepare the image."));
    });
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    URL.revokeObjectURL(image.src);
    canvas.toBlob((blob) => {
      if (blob) saveAs(blob, `${file.name.replace(/\.[^.]+$/, "") || "image"}-white.png`);
    }, "image/png");
  }

  return (
    <>
      <main className="min-h-screen bg-[#fafafa] text-[#34363a]">
        <div className="border-b border-blue-200 bg-[#dceaff] px-5 py-3 text-center text-sm text-[#394b64]">
          <span className="font-semibold">Remove backgrounds automatically</span> and download a clean PNG in seconds.
        </div>

        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:py-24">
          <div className="max-w-xl">
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#e6f0ff] text-[#1877e8]">
              <Sparkles size={38} strokeWidth={1.8} />
            </div>
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-[#1877e8]">Digital Desk image tools</p>
            <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.04em] sm:text-7xl">Remove image<br />background</h1>
            <p className="mt-7 max-w-md text-xl leading-relaxed text-[#62666d]">Make backgrounds transparent or add a clean white background, automatically.</p>
            <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold text-[#62666d]">
              <span className="inline-flex items-center gap-2"><Check size={18} className="text-[#1877e8]" /> Free to use</span>
              <span className="inline-flex items-center gap-2"><Check size={18} className="text-[#1877e8]" /> PNG output</span>
            </div>
          </div>

          <div className="rounded-[30px] bg-white p-3 shadow-[0_20px_60px_rgba(38,53,78,0.12)] sm:p-5">
            {!resultUrl ? (
              <div
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                className="flex min-h-[390px] cursor-pointer flex-col items-center justify-center rounded-[23px] border-2 border-dashed border-[#d6dce6] bg-[#fcfdff] px-6 text-center transition hover:border-[#1877e8] hover:bg-[#f5f9ff]"
              >
                <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#e7f0ff] text-[#1877e8]"><UploadCloud size={38} /></div>
                <h2 className="text-2xl font-bold">Upload an image</h2>
                <p className="mt-3 text-[#727983]">or drop a file here</p>
                <span className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#1877e8] px-8 py-4 text-base font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#0d65cf]"><ImagePlus size={20} /> Choose image</span>
                <p className="mt-5 text-xs text-[#9aa1ab]">JPG, PNG, WEBP up to 10 MB</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[23px] border border-[#e2e6ec]">
                <div className={`flex min-h-[390px] items-center justify-center p-8 ${background === "white" ? "bg-white" : "bg-[linear-gradient(45deg,#eef1f4_25%,transparent_25%),linear-gradient(-45deg,#eef1f4_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eef1f4_75%),linear-gradient(-45deg,transparent_75%,#eef1f4_75%)] bg-[length:28px_28px] bg-[position:0_0,0_14px,14px_-14px,-14px_0]"}`}>
                  <img src={resultUrl} alt="Background removed result" className="max-h-[360px] max-w-full object-contain drop-shadow-xl" />
                </div>
                <div className="border-t border-[#e2e6ec] bg-white p-5">
                  <div className="mb-4 flex rounded-xl bg-[#f2f4f7] p-1">
                    <button onClick={() => setBackground("transparent")} className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${background === "transparent" ? "bg-white text-[#1877e8] shadow-sm" : "text-[#747b85]"}`}>Transparent</button>
                    <button onClick={() => setBackground("white")} className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${background === "white" ? "bg-white text-[#1877e8] shadow-sm" : "text-[#747b85]"}`}>White background</button>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={downloadResult} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1877e8] py-3.5 font-bold text-white transition hover:bg-[#0d65cf]"><Download size={19} /> Download PNG</button>
                    <button onClick={() => inputRef.current?.click()} className="rounded-xl border border-[#dce1e8] px-4 py-3.5 text-sm font-bold text-[#5f6670] hover:bg-[#f7f8fa]">New image</button>
                    <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
                  </div>
                </div>
              </div>
            )}

            {preview && !resultUrl && <button onClick={removeBackground} disabled={processing} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877e8] py-4 font-bold text-white transition hover:bg-[#0d65cf] disabled:cursor-wait disabled:opacity-70">{processing ? <><LoaderCircle size={20} className="animate-spin" /> Removing background...</> : "Remove background"}</button>}
            {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">{error}</p>}
          </div>
        </section>

      </main>

      <WhatsAppButton />
    </>
  );
}