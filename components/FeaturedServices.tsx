"use client";

import Link from "next/link";

import {
  Landmark,
  FileText,
  ImageIcon,
  Bot,
  Sparkles,
  ShieldCheck,
  BadgeCheck,
  ArrowRight,
} from "lucide-react";

const services = [
  {
    title: "Government Services",
    description:
      "PAN Card, Aadhaar, Passport, Certificates, CSC & more.",
    href: "/service",
    icon: Landmark,
    color: "from-blue-600 to-cyan-500",
  },
  {
    title: "PDF Tools",
    description:
      "Compress, Merge, Split, Convert, OCR and Protect PDF.",
    href: "/pdf-tools",
    icon: FileText,
    color: "from-red-500 to-orange-500",
  },
  {
    title: "Image Tools",
    description:
      "Resize, Compress, Passport Photo, Background Remove.",
    href: "/image-tools",
    icon: ImageIcon,
    color: "from-green-500 to-emerald-500",
  },
  {
    title: "Manish AI",
    description:
      "Smart AI Assistant for Government & Digital Services.",
    href: "/ai",
    icon: Bot,
    color: "from-violet-600 to-fuchsia-500",
  },
];

export default function FeaturedServices() {
  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-5">
        {/* Heading */}

        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            <Sparkles size={16} />
            Featured Services
          </div>

          <h2 className="mt-5 text-4xl font-black text-slate-900 lg:text-5xl">
            Everything You Need

            <span className="block text-blue-700">
              In One Platform
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            DigiDesk India combines Government Services,
            PDF Tools, Image Tools and AI into one
            modern digital platform.
          </p>
        </div>

        {/* Cards */}

        <div className="mt-16 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <Link
                key={service.title}
                href={service.href}
                className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-3 hover:shadow-2xl"
              >
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r ${service.color} text-white`}
                >
                  <Icon size={30} />
                </div>

                <h3 className="mt-7 text-2xl font-bold text-slate-900">
                  {service.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {service.description}
                </p>

                <div className="mt-6 flex items-center gap-2 font-semibold text-blue-700">
                  Explore

                  <ArrowRight
                    size={18}
                    className="transition group-hover:translate-x-2"
                  />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Trust Section */}

        <div className="mt-20 grid gap-6 rounded-[32px] bg-gradient-to-r from-blue-700 to-cyan-600 p-10 text-white lg:grid-cols-3">
          <div className="flex gap-4">
            <ShieldCheck
              size={42}
              className="shrink-0"
            />

            <div>
              <h3 className="text-xl font-bold">
                100% Secure
              </h3>

              <p className="mt-2 text-blue-100">
                Enterprise level security
                for your documents.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <BadgeCheck
              size={42}
              className="shrink-0"
            />

            <div>
              <h3 className="text-xl font-bold">
                Trusted Platform
              </h3>

              <p className="mt-2 text-blue-100">
                Thousands of users trust
                DigiDesk India.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Bot
              size={42}
              className="shrink-0"
            />

            <div>
              <h3 className="text-xl font-bold">
                AI Powered
              </h3>

              <p className="mt-2 text-blue-100">
                Get instant help from
                Manish AI Assistant.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}