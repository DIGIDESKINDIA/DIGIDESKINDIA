"use client";

import { ReactNode } from "react";

import PDFToolbar, {
  PDFToolbarProps,
} from "./PDFToolbar";

interface ToolLayoutProps {
  title: string;
  description: string;

  toolbar?: PDFToolbarProps;

  uploader?: ReactNode;

  queue?: ReactNode;

  preview?: ReactNode;

  progress?: ReactNode;

  result?: ReactNode;

  sidebar?: ReactNode;

  children?: ReactNode;
}

export default function ToolLayout({
  title,
  description,

  toolbar,

  uploader,

  queue,

  preview,

  progress,

  result,

  sidebar,

  children,
}: ToolLayoutProps) {
  return (
    <section className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* Header */}

      <div className="border-b bg-white dark:border-slate-800 dark:bg-slate-900">

        <div className="mx-auto max-w-7xl px-6 py-10">

          <h1 className="text-4xl font-black text-slate-900 dark:text-white">

            {title}

          </h1>

          <p className="mt-3 max-w-3xl text-lg text-slate-500">

            {description}

          </p>

        </div>

      </div>

      {/* Toolbar */}

      <div className="sticky top-20 z-30 border-b bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">

        <div className="mx-auto max-w-7xl p-4">

          {toolbar ? <PDFToolbar {...toolbar} /> : null}

        </div>

      </div>

      {/* Main */}

      <div className="mx-auto grid max-w-7xl gap-6 p-6 xl:grid-cols-[340px_1fr]">

        {/* Sidebar */}

        <aside className="space-y-6">

          {uploader ?? null}

          {queue ?? null}

          {sidebar ?? null}

        </aside>

        {/* Workspace */}

        <main className="space-y-6">

          {progress}

          {preview}

          {result}

          {children}

        </main>

      </div>

    </section>
  );
}