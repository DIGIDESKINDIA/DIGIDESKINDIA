"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";

export default function JPGtoPDFPage() {
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

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

          <div className="border-2 border-dashed border-slate-300 rounded-3xl p-16 text-center">

            <div className="text-7xl">
              🖼️
            </div>

            <h2 className="mt-5 text-3xl font-bold">
              Upload Images
            </h2>

            <p className="mt-3 text-slate-500">
              Select JPG or PNG files.
            </p>

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) =>
                setImages(
                  Array.from(
                    e.target.files || []
                  )
                )
              }
              className="mt-6"
            />

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
                      className="rounded-xl border p-4"
                    >
                      {img.name}
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