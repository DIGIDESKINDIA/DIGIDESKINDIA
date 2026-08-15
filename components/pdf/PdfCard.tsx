"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface PdfTool {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  category: string;
  popular?: boolean;
}

interface Props {
  tool: PdfTool;
}

export default function PdfCard({ tool }: Props) {

  const Icon = tool.icon;

  return (
    <Link
      href={tool.href}
      className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-blue-500 hover:shadow-2xl"
    >

      {tool.popular && (
        <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
          Popular
        </span>
      )}

      <div className="mt-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">

        <Icon size={30} />

      </div>

      <h3 className="mt-6 text-xl font-bold">

        {tool.title}

      </h3>

      <p className="mt-3 text-sm leading-7 text-slate-600">

        {tool.description}

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
}