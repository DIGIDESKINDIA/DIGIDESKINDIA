"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { FileImage, UploadCloud } from "lucide-react";
import { FileThumbnail } from "@/components/pdf/UploadZone";

export default function JPGtoPDFPage() {
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addImages(files: File[]) {
    const validImages = files.filter(
      (file) => file.type === "image/jpeg" || file.type === "image/jpg" || file.type === "image/png"
    );

    if (validImages.length) setImages(validImages);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addImages(Array.from(event.dataTransfer.files));
  }

  async function handleConvert() {
    if (images.length === 0) {
      alert("Please select images.");
      return;
    }

    try {
      setLoading(true);

      const pdfDoc = await PDFDocument.create();

      for (const image of images) {
        const bytes = await image.arrayBuffer();

        let embeddedImage;

        if (
          image.type === "image/jpeg" ||
          image.type === "image/jpg"
        ) {
          embeddedImage =
            await pdfDoc.embedJpg(bytes);
        } else if (
          image.type === "image/png"
        ) {
          embeddedImage =
            await pdfDoc.embedPng(bytes);
        } else {
          continue;
        }

        const page = pdfDoc.addPage([
          embeddedImage.width,
          embeddedImage.height,
        ]);

        page.drawImage(
          embeddedImage,
          {
            x: 0,
            y: 0,
            width:
              embeddedImage.width,
            height:
              embeddedImage.height,
          }
        );
      }

      const pdfBytes =
        await pdfDoc.save();

      const blob = new Blob(
  [new Uint8Array(pdfBytes)],
  {
    type: "application/pdf",
  }
);

      const url =
        URL.createObjectURL(blob);

      const a =
        document.createElement("a");

      a.href = url;
      a.download = "images.pdf";

      a.click();

      URL.revokeObjectURL(url);

      alert("PDF Created Successfully!");
    } catch (error) {
      console.error(error);

      alert("Error creating PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">

      <section className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white py-16">

        <div className="max-w-5xl mx-auto px-6 text-center">

          <h1 className="text-5xl font-black">
            JPG to PDF
          </h1>

          <p className="mt-4 text-lg">
            Convert images into PDF.
          </p>

        </div>

      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">

        <div className="bg-white rounded-3xl shadow-xl p-10">

          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`cursor-pointer rounded-3xl border-2 border-dashed p-16 text-center transition-all duration-200 ${
              dragging
                ? "scale-[1.01] border-blue-600 bg-blue-50"
                : "border-blue-300 bg-white hover:border-blue-500 hover:bg-blue-50/50"
            }`}
          >

            <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full transition ${dragging ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"}`}>
              {dragging ? <UploadCloud size={42} /> : <FileImage size={42} />}
            </div>

            <h2 className="mt-5 text-3xl font-bold">
              {dragging ? "Drop Images Here" : "Drag & Drop Images"}
            </h2>

            <p className="mt-3 text-slate-500">
              Drop JPG or PNG files here or click to browse your device.
            </p>

            <span className="mt-7 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700">
              Choose Image Files
            </span>

            <p className="mt-4 text-sm text-slate-400">JPG and PNG files supported</p>

            <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png" onChange={(event) => addImages(Array.from(event.target.files ?? []))} className="hidden" />

          </div>

          {images.length > 0 && (

            <div className="mt-10">

              <h3 className="text-xl font-bold mb-4">
                Selected Images
              </h3>

              <div className="space-y-3">

                {images.map(
                  (img, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 rounded-xl border p-4"
                    >
                      <FileThumbnail file={img} />
                      <span className="truncate">{img.name}</span>
                    </div>
                  )
                )}

              </div>

              <button
                onClick={handleConvert}
                disabled={loading}
                className="
                  mt-8
                  w-full
                  rounded-2xl
                  bg-gradient-to-r
                  from-blue-600
                  to-cyan-500
                  py-4
                  text-white
                  font-bold
                "
              >
                {loading
                  ? "Creating PDF..."
                  : "Convert to PDF"}
              </button>

            </div>

          )}

        </div>

      </section>

    </main>
  );
}