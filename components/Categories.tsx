"use client";

import Link from "next/link";
import {
  FileText,
  ImageIcon,
  Bot,
  Landmark,
  FileArchive,
  CreditCard,
  ShieldCheck,
  Globe,
} from "lucide-react";

const categories = [
  {
    title: "Government Services",
    icon: Landmark,
    color: "from-blue-600 to-cyan-500",
    total: "100+ Services",
    href: "/service",
  },
  {
    title: "PDF Tools",
    icon: FileText,
    color: "from-red-500 to-orange-500",
    total: "25+ Tools",
    href: "/pdf-tools",
  },
  {
    title: "Image Tools",
    icon: ImageIcon,
    color: "from-green-500 to-emerald-500",
    total: "20+ Tools",
    href: "/image-tools",
  },
  {
    title: "AI Assistant",
    icon: Bot,
    color: "from-violet-600 to-fuchsia-500",
    total: "15+ AI Tools",
    href: "/ai",
  },
  {
    title: "Document Services",
    icon: FileArchive,
    color: "from-sky-600 to-blue-500",
    total: "Online",
    href: "/service",
  },
  {
    title: "PAN & Aadhaar",
    icon: CreditCard,
    color: "from-amber-500 to-orange-500",
    total: "Fast Processing",
    href: "/service",
  },
  {
    title: "Secure Platform",
    icon: ShieldCheck,
    color: "from-emerald-600 to-green-500",
    total: "100% Safe",
    href: "/about",
  },
  {
    title: "Digital India",
    icon: Globe,
    color: "from-indigo-600 to-blue-500",
    total: "Made for India",
    href: "/",
  },
];

export default function Categories() {
  return (
    <section className="bg-gradient-to-b from-white to-slate-50 py-24">

      <div className="mx-auto max-w-7xl px-5">

        <div className="text-center">

          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            Explore
          </span>

          <h2 className="mt-5 text-5xl font-black text-slate-900">
            Explore Categories
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Everything you need in one place —
            Government Services, PDF Tools,
            Image Tools and AI.
          </p>

        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">

          {categories.map((item) => {

            const Icon = item.icon;

            return (

              <Link
                key={item.title}
                href={item.href}
                className="group relative overflow-hidden rounded-[30px] border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-3 hover:border-blue-500 hover:shadow-2xl"
              >

                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r ${item.color} text-white`}
                >

                  <Icon size={30} />

                </div>

                <h3 className="mt-8 text-2xl font-bold text-slate-900">

                  {item.title}

                </h3>

                <p className="mt-3 text-sm font-semibold text-blue-700">

                  {item.total}

                </p>

                <div className="mt-8">

                  <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition group-hover:bg-blue-600 group-hover:text-white">

                    Explore →

                  </span>

                </div>

                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-100 opacity-0 blur-3xl transition duration-500 group-hover:opacity-100" />

              </Link>

            );

          })}

        </div>

      </div>

    </section>
  );
}