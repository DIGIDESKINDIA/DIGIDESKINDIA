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

        <div className="mt-16 grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          {tools.map((tool) => {

            const Icon = tool.icon;

            return (

              <Link
                key={tool.title}
                href={tool.href}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-emerald-500 hover:shadow-2xl"
              >

                <div className="flex items-center justify-between">

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">

                    <Icon size={28} />

                  </div>

                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">

                    {tool.badge}

                  </span>

                </div>

                <h3 className="mt-6 text-xl font-bold text-slate-900">

                  {tool.title}

                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600">

                  {tool.desc}

                </p>

                <div className="mt-6 flex items-center gap-2 font-semibold text-emerald-700">

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