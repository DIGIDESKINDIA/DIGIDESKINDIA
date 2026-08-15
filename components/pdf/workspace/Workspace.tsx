"use client";

import { ReactNode } from "react";

interface WorkspaceProps {
  title: string;

  description?: string;

  header?: ReactNode;

  toolbar?: ReactNode;

  sidebar?: ReactNode;

  viewer: ReactNode;

  settings?: ReactNode;

  statusbar?: ReactNode;
}

export default function Workspace({
  title,
  description,
  header,
  toolbar,
  sidebar,
  viewer,
  settings,
  statusbar,
}: WorkspaceProps) {
  return (
    <main className="flex h-[calc(100vh-72px)] flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">

      {/* Header */}

      {header ?? (
        <header className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">

          <h1 className="text-2xl font-black text-slate-900 dark:text-white">

            {title}

          </h1>

          {description && (

            <p className="mt-1 text-sm text-slate-500">

              {description}

            </p>

          )}

        </header>
      )}

      {/* Toolbar */}

      {toolbar && (

        <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">

          {toolbar}

        </div>

      )}

      {/* Workspace */}

      <section className="grid flex-1 overflow-hidden lg:grid-cols-[300px_1fr_340px]">

        {/* Left Sidebar */}

        <aside className="overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">

          {sidebar}

        </aside>

        {/* Viewer */}

        <section className="overflow-auto bg-slate-200 dark:bg-slate-950">

          {viewer}

        </section>

        {/* Settings */}

        <aside className="overflow-y-auto border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">

          {settings}

        </aside>

      </section>

      {/* Statusbar */}

      {statusbar && (

        <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">

          {statusbar}

        </footer>

      )}

    </main>
  );
}