"use client";

import { useState } from "react";
import Image from "next/image";
import WhatsAppButton from "@/components/WhatsAppButton";

export default function RemoveBackgroundPage() {
  const [preview, setPreview] = useState("");

  function handleImage(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setPreview(URL.createObjectURL(file));
  }

  return (
    <>
      <main className="min-h-screen bg-slate-50">

        {/* Hero */}
        <section className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white py-16">

          <div className="max-w-5xl mx-auto px-6 text-center">

            <h1 className="text-5xl font-black">
              Remove Background
            </h1>

            <p className="mt-4 text-lg">
              Upload image and remove background instantly.
            </p>

          </div>

        </section>

        {/* Upload Section */}
        <section className="max-w-5xl mx-auto px-6 py-16">

          <div className="bg-white rounded-3xl shadow-xl p-10">

            <div className="border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center">

              <div className="text-7xl">
                🖼️
              </div>

              <h2 className="mt-5 text-3xl font-bold">
                Upload Image
              </h2>

              <p className="mt-3 text-slate-500">
                JPG, PNG supported
              </p>

              <input
                type="file"
                accept="image/*"
                onChange={handleImage}
                className="mt-6"
              />

            </div>

            {preview && (
              <div className="mt-10">

                <h3 className="text-2xl font-bold mb-5">
                  Preview
                </h3>

                <div className="flex justify-center">

                  <Image
                    src={preview}
                    alt="Preview"
                    width={800}
                    height={600}
                    unoptimized
                    className="max-h-[400px] rounded-xl border shadow-lg"
                  />

                </div>

                <button
                  onClick={() =>
                    alert(
                      "AI Background Removal API abhi connect nahi hai."
                    )
                  }
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
                    hover:opacity-90
                  "
                >
                  Remove Background
                </button>

              </div>
            )}

          </div>

        </section>

      </main>

      <WhatsAppButton />
    </>
  );
}