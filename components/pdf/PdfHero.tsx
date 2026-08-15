"use client";

import Link from "next/link";
import { FileText, Sparkles, ArrowRight } from "lucide-react";

export default function PdfHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-cyan-600 to-sky-500 py-24 text-white">

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_40%)]" />

      <div className="relative mx-auto max-w-7xl px-5">

        <div className="max-w-3xl">

          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2 backdrop-blur">

            <Sparkles size={16} />

            Professional PDF Tools

          </div>

          <h1 className="mt-6 text-5xl font-black leading-tight lg:text-6xl">

            All PDF Tools

            <span className="block text-cyan-200">

              In One Place

            </span>

          </h1>

          <p className="mt-6 text-lg leading-8 text-blue-100">

            Merge, Split, Compress, Convert,
            Protect, Unlock, Watermark and edit
            PDF files online for free.

          </p>

          <div className="mt-10 flex flex-wrap gap-4">

            <Link
              href="#tools"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-4 font-semibold text-blue-700 transition hover:scale-105"
            >
              Explore Tools
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/service"
              className="rounded-xl border border-white/30 px-6 py-4 font-semibold backdrop-blur hover:bg-white/10"
            >
              Government Services
            </Link>

          </div>

        </div>

        <div className="absolute right-10 top-12 hidden lg:block">

          <div className="flex h-40 w-40 items-center justify-center rounded-full bg-white/10 backdrop-blur">

            <FileText size={80} />

          </div>

        </div>

      </div>

    </section>
  );
}