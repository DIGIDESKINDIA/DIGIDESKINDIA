"use client";

import Link from "next/link";
import {
  FileArchive,
  FilePlus2,
  Scissors,
  RotateCw,
  ShieldCheck,
  Unlock,
  FileInput,
  ImageIcon,
  ScanText,
  FileSearch,
  FileOutput,
  ArrowRight,
} from "lucide-react";

const tools = [
  {
    title: "Compress PDF",
    desc: "Reduce PDF size without losing quality.",
    href: "/pdf-tools/compress-pdf",
    icon: FileArchive,
    badge: "Popular",
  },
  {
    title: "Merge PDF",
    desc: "Combine multiple PDFs into one.",
    href: "/pdf-tools/merge-pdf",
    icon: FilePlus2,
    badge: "Fast",
  },
  {
    title: "Split PDF",
    desc: "Extract pages from PDF.",
    href: "/pdf-tools/split",
    icon: Scissors,
    badge: "Free",
  },
  {
    title: "Rotate PDF",
    desc: "Rotate PDF pages instantly.",
    href: "/pdf-tools/rotate",
    icon: RotateCw,
    badge: "Easy",
  },
  {
    title: "Sign PDF",
    desc: "Add signatures, initials, dates and approval text.",
    href: "/sign-pdf",
    icon: ShieldCheck,
    badge: "New",
  },
  {
    title: "Protect PDF",
    desc: "Password protect your PDF.",
    href: "/pdf-tools",
    icon: ShieldCheck,
    badge: "Secure",
  },
  {
    title: "Unlock PDF",
    desc: "Remove PDF password.",
    href: "/pdf-tools",
    icon: Unlock,
    badge: "Popular",
  },
  {
    title: "Word to PDF",
    desc: "Convert Word into PDF.",
    href: "/pdf-tools",
    icon: FileInput,
    badge: "Fast",
  },
  {
    title: "PDF to Word",
    desc: "Convert PDF into editable Word.",
    href: "/pdf-tools/pdf-to-word",
    icon: FileOutput,
    badge: "New",
  },
  {
    title: "PDF to JPG",
    desc: "Export PDF pages as images.",
    href: "/pdf-tools",
    icon: ImageIcon,
    badge: "New",
  },
  {
    title: "OCR PDF",
    desc: "Extract text using OCR.",
    href: "/pdf-tools",
    icon: ScanText,
    badge: "AI",
  },
  {
    title: "Repair PDF",
    desc: "Fix corrupted PDF files.",
    href: "/pdf-tools",
    icon: FileSearch,
    badge: "Pro",
  },
  {
    title: "View All",
    desc: "Browse all PDF tools.",
    href: "/pdf-tools",
    icon: ArrowRight,
    badge: "100+",
  },
];

export default function PDFToolsSection() {
  return (
    <section className="bg-slate-50 py-24">

      <div className="mx-auto max-w-7xl px-5">

        {/* Heading */}

        <div className="text-center">

          <span className="rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">

            PDF Tools

          </span>

          <h2 className="mt-5 text-4xl font-black text-slate-900 lg:text-5xl">

            Professional PDF Tools

          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-600">

            Compress, Merge, Split, Convert,
            Protect and Edit PDFs directly
            from your browser.

          </p>

        </div>

        {/* Featured Banner */}

        <div className="mt-14 overflow-hidden rounded-[32px] bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 p-10 text-white">

          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">

            <div>

              <h3 className="text-4xl font-black">

                Compress PDF

              </h3>

              <p className="mt-5 max-w-xl text-blue-100">

                Reduce PDF size without losing
                quality. Fast, secure and
                completely browser based.

              </p>

            </div>

            <Link
              href="/pdf-tools/compress-pdf"
              className="inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-4 font-bold text-blue-700 transition hover:scale-105"
            >
              Open Tool

              <ArrowRight size={20} />

            </Link>

          </div>

        </div>

        {/* Grid */}

        <div className="mt-16 grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          {tools.map((tool) => {

            const Icon = tool.icon;

            return (

              <Link
                key={tool.title}
                href={tool.href}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-blue-500 hover:shadow-2xl"
              >

                <div className="flex items-center justify-between">

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">

                    <Icon size={28} />

                  </div>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">

                    {tool.badge}

                  </span>

                </div>

                <h3 className="mt-6 text-xl font-bold text-slate-900">

                  {tool.title}

                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600">

                  {tool.desc}

                </p>

                <div className="mt-6 flex items-center gap-2 font-semibold text-blue-700">

                  Open Tool

                  <ArrowRight
                    size={18}
                    className="transition group-hover:translate-x-2"
                  />

                </div>

              </Link>

            );

          })}

        </div>

      </div>

    </section>
  );
}