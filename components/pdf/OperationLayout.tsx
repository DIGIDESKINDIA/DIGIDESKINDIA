"use client";

import { ReactNode } from "react";

import {
  FileStack,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface OperationLayoutProps {
  title: string;

  description: string;

  icon?: ReactNode;

  children: ReactNode;

  footer?: ReactNode;
}

export default function OperationLayout({
  title,
  description,
  icon,
  children,
  footer,
}: OperationLayoutProps) {
  return (
    <main className="min-h-screen bg-slate-50">

      {/* Hero */}

      <section className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-cyan-600 to-sky-500">

        <div className="absolute inset-0 opacity-10">

          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white blur-3xl" />

          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-white blur-3xl" />

        </div>

        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-6 py-20 text-center text-white">

          <div className="rounded-full bg-white/15 p-6 backdrop-blur">

            {icon ?? (
              <FileStack
                size={56}
              />
            )}

          </div>

          <h1 className="mt-8 text-5xl font-black tracking-tight">

            {title}

          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-blue-100">

            {description}

          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">

            <div className="flex items-center gap-2 rounded-full bg-white/15 px-5 py-3 backdrop-blur">

              <ShieldCheck
                size={18}
              />

              Secure Processing

            </div>

            <div className="flex items-center gap-2 rounded-full bg-white/15 px-5 py-3 backdrop-blur">

              <Zap
                size={18}
              />

              Fast Engine

            </div>

            <div className="flex items-center gap-2 rounded-full bg-white/15 px-5 py-3 backdrop-blur">

              <FileStack
                size={18}
              />

              No Quality Loss

            </div>

          </div>

        </div>

      </section>

      {/* Content */}

      <section className="mx-auto max-w-7xl px-6 py-12">

        <div className="space-y-8">

          {children}

        </div>

      </section>

      {/* Footer */}

      {footer && (

        <section className="mx-auto max-w-7xl px-6 pb-12">

          {footer}

        </section>

      )}

    </main>
  );
}