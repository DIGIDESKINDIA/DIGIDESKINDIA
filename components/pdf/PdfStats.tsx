"use client";

import {
  FileText,
  Users,
  Download,
  ShieldCheck,
} from "lucide-react";

const stats = [
  {
    title: "40+",
    subtitle: "PDF Tools",
    icon: FileText,
  },
  {
    title: "100K+",
    subtitle: "Users",
    icon: Users,
  },
  {
    title: "2M+",
    subtitle: "Downloads",
    icon: Download,
  },
  {
    title: "100%",
    subtitle: "Secure",
    icon: ShieldCheck,
  },
];

export default function PdfStats() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <Icon size={30} />
              </div>

              <h3 className="mt-5 text-4xl font-black">
                {item.title}
              </h3>

              <p className="mt-2 text-slate-600">
                {item.subtitle}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}