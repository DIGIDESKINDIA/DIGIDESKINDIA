"use client";

import Link from "next/link";
import {
  Bot,
  FileText,
  Languages,
  FilePenLine,
  GraduationCap,
  Code2,
  MessageSquareText,
  Sparkles,
  ImagePlus,
  PlaySquare,
  ArrowRight,
  BrainCircuit,
} from "lucide-react";

const aiTools = [
  {
    title: "Manish AI Assistant",
    desc: "Ask anything about Digital Services.",
    href: "/ai",
    icon: Bot,
    badge: "Featured",
  },
  {
    title: "AI Resume Builder",
    desc: "Generate ATS friendly resume.",
    href: "/ai",
    icon: FileText,
    badge: "Popular",
  },
  {
    title: "Letter Writer",
    desc: "Create official applications.",
    href: "/ai",
    icon: FilePenLine,
    badge: "India",
  },
  {
    title: "Essay Writer",
    desc: "Generate essays instantly.",
    href: "/ai",
    icon: GraduationCap,
    badge: "AI",
  },
  {
    title: "Translator",
    desc: "Translate into multiple languages.",
    href: "/ai",
    icon: Languages,
    badge: "Fast",
  },
  {
    title: "Code Assistant",
    desc: "Generate & fix code.",
    href: "/ai",
    icon: Code2,
    badge: "Pro",
  },
  {
    title: "Grammar Checker",
    desc: "Correct grammar automatically.",
    href: "/ai",
    icon: MessageSquareText,
    badge: "AI",
  },
  {
    title: "Prompt Generator",
    desc: "Create better AI prompts.",
    href: "/ai",
    icon: Sparkles,
    badge: "New",
  },
  {
    title: "Image Generator",
    desc: "Generate AI images.",
    href: "/ai",
    icon: ImagePlus,
    badge: "AI",
  },
  {
    title: "YouTube Summary",
    desc: "Summarize YouTube videos.",
    href: "/ai",
    icon: PlaySquare,
    badge: "Smart",
  },
  {
    title: "AI Chat",
    desc: "Smart conversational assistant.",
    href: "/ai",
    icon: BrainCircuit,
    badge: "24×7",
  },
  {
    title: "View All",
    desc: "Browse every AI Tool.",
    href: "/ai",
    icon: ArrowRight,
    badge: "15+",
  },
];

export default function AIToolsSection() {
  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-5">
        <div className="text-center">
          <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">
            AI Tools
          </span>

          <h2 className="mt-5 text-4xl font-black text-slate-900 lg:text-5xl">
            AI Powered Productivity
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-600">
            Chat, Write, Translate, Generate, Code and Automate with Manish AI.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-[32px] bg-gradient-to-r from-violet-700 to-fuchsia-600 p-10 text-white">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <h3 className="text-4xl font-black">
                Meet Manish AI
              </h3>

              <p className="mt-5 max-w-xl text-violet-100">
                India&apos;s smart AI assistant for Government Services, PDF, Image
                and Digital workflows.
              </p>
            </div>

            <Link
              href="/ai"
              className="inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-4 font-bold text-violet-700 transition hover:scale-105"
            >
              Start AI Chat
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {aiTools.map((tool) => {
            const Icon = tool.icon;

            return (
              <Link
                key={tool.title}
                href={tool.href}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-violet-500 hover:shadow-2xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                    <Icon size={28} />
                  </div>

                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                    {tool.badge}
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-bold text-slate-900">
                  {tool.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {tool.desc}
                </p>

                <div className="mt-6 flex items-center gap-2 font-semibold text-violet-700">
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