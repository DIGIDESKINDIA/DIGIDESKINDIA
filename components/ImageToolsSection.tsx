"use client";

import Link from "next/link";
import {
  ImageIcon,
  ScanFace,
  Crop,
  Scissors,
  Eraser,
  Sparkles,
  FileImage,
  ArrowRight,
  Wand2,
  ShieldCheck,
  Maximize2,
  Minimize2,
} from "lucide-react";

const tools = [
  {
    title: "Compress Image",
    desc: "Reduce image size without losing quality.",
    href: "/image-tools/compress-image",
    icon: Minimize2,
    badge: "Popular",
  },
  {
    title: "Resize Image",
    desc: "Resize images in seconds.",
    href: "/image-tools/resize-image",
    icon: Maximize2,
    badge: "Fast",
  },
  {
    title: "Passport Photo",
    desc: "Create passport photos instantly.",
    href: "/image-tools/passport-photo",
    icon: ScanFace,
    badge: "India",
  },
  {
    title: "Crop Image",
    desc: "Crop images with precision.",
    href: "/image-tools/crop-image",
    icon: Crop,
    badge: "Free",
  },
  {
    title: "Background Remove",
    desc: "Remove image background using AI.",
    href: "/image-tools/remove-background",
    icon: Eraser,
    badge: "AI",
  },
  {
    title: "Image Enhancer",
    desc: "Improve image quality instantly.",
    href: "/image-tools",
    icon: Sparkles,
    badge: "AI",
  },
  {
    title: "Convert Image",
    desc: "JPG, PNG, WEBP conversion.",
    href: "/image-tools/convert-image",
    icon: FileImage,
    badge: "New",
  },
  {
    title: "Rotate Image",
    desc: "Rotate photos online.",
    href: "/image-tools/rotate-image",
    icon: Scissors,
    badge: "Easy",
  },
  {
    title: "AI Upscaler",
    desc: "Increase image resolution.",
    href: "/image-tools",
    icon: Wand2,
    badge: "Pro",
  },
  {
    title: "Watermark Image",
    desc: "Protect your images.",
    href: "/image-tools/watermark-image",
    icon: ShieldCheck,
    badge: "Secure",
  },
  {
    title: "Image to PDF",
    desc: "Convert images into PDF.",
    href: "/image-tools/image-to-pdf",
    icon: ImageIcon,
    badge: "Popular",
  },
  {
    title: "View All",
    desc: "Browse all Image Tools.",
    href: "/image-tools",
    icon: ArrowRight,
    badge: "40+",
  },
];

export default function ImageToolsSection() {
  return (
    <section className="bg-white py-24">

      <div className="mx-auto max-w-7xl px-5">

        <div className="text-center">

          <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            Image Tools
          </span>

          <h2 className="mt-5 text-4xl font-black text-slate-900 lg:text-5xl">
            Professional Image Tools
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-600">
            Compress, Resize, Crop, Remove Background,
            Passport Photo and AI Image Enhancement.
          </p>

        </div>

        <div className="mt-14 overflow-hidden rounded-[32px] bg-gradient-to-r from-emerald-600 to-cyan-600 p-10 text-white">

          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">

            <div>

              <h3 className="text-4xl font-black">
                AI Image Editor
              </h3>

              <p className="mt-5 max-w-xl text-emerald-100">
                Edit, Enhance, Resize and Compress
                images with blazing fast AI powered tools.
              </p>

            </div>

            <Link
              href="/image-tools"
              className="inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-4 font-bold text-emerald-700 transition hover:scale-105"
            >
              Explore Image Tools
              <ArrowRight size={20} />
            </Link>

          </div>

        </div>

        <div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(205px,1fr))] gap-4 sm:gap-5">

          {tools.map((tool) => {

            const Icon = tool.icon;

            return (

              <Link
                key={tool.title}
                href={tool.href}
                className="group flex min-h-[212px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
              >

                <div className="flex items-center justify-between">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-400 text-white shadow-[0_8px_20px_rgba(16,185,129,0.2)] ring-4 ring-emerald-500/10">

                    <Icon size={21} />

                  </div>

                  <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">

                    {tool.badge}

                  </span>

                </div>

                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">

                  {tool.title}

                </h3>

                <p className="mt-2 flex-1 text-xs leading-5 text-slate-600 dark:text-slate-300">

                  {tool.desc}

                </p>

                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">

                  Open Tool

                  <ArrowRight
                    size={15}
                    className="transition group-hover:translate-x-1"
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