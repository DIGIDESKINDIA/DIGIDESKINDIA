"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Heart, Mail, MapPin, Phone } from "lucide-react";

import { useTheme } from "@/components/theme/ThemeProvider";

const quickLinks = [
  { name: "Home", href: "/" },
  { name: "Government Services", href: "/service" },
  { name: "PDF Tools", href: "/pdf-tools" },
  { name: "Image Tools", href: "/image-tools" },
  { name: "AI Assistant", href: "/ai" },
  { name: "Pricing", href: "/pricing" },
  { name: "Contact Us", href: "/contact" },
  { name: "Search", href: "/search" },
];

const pdfTools = [
  { name: "Compress PDF", href: "/pdf-tools/compress-pdf" },
  { name: "Merge PDF", href: "/pdf-tools/merge-pdf" },
  { name: "Split PDF", href: "/pdf-tools/split" },
  { name: "JPG to PDF", href: "/pdf-tools/jpg-to-pdf" },
  { name: "PDF to JPG", href: "/pdf-tools/pdf-to-jpg" },
  { name: "PDF to Word", href: "/pdf-tools/pdf-to-word" },
  { name: "Delete Pages", href: "/pdf-tools/delete-pages" },
  { name: "More Tools", href: "/pdf-tools" },
];

const imageTools = [
  { name: "Compress Image", href: "/image-tools/compress-image" },
  { name: "Resize Image", href: "/image-tools/resize-image" },
  { name: "Crop Image", href: "/image-tools/crop-image" },
  { name: "Convert Image", href: "/image-tools/convert-image" },
  { name: "Remove Background", href: "/image-tools/remove-background" },
  { name: "Watermark Image", href: "/image-tools/watermark-image" },
  { name: "More Tools", href: "/image-tools" },
];

const governmentServices = [
  { name: "Aadhaar Services", href: "/service/aadhaar" },
  { name: "PAN Card", href: "/service/pan-card" },
  { name: "Passport", href: "/service/passport" },
  { name: "CSC Services", href: "/service/csc" },
  { name: "More Services", href: "/service" },
];

const support = [
  { name: "Help Center", href: "/help-center" },
  { name: "Privacy Policy", href: "/privacy-policy" },
  { name: "Terms & Conditions", href: "/terms" },
  { name: "Refund Policy", href: "/refund-policy" },
  { name: "Contact Us", href: "/contact" },
];

export default function Footer() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <footer className={isDark ? "bg-[#050B18] text-white" : "bg-slate-950 text-white"}>
      <div className={isDark ? "relative isolate overflow-hidden border-b border-white/10 bg-[#050B18]" : "relative isolate isolate overflow-hidden border-b border-white/10 bg-slate-950"}>
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,rgba(14,165,233,0.12),transparent_32%),radial-gradient(circle_at_88%_18%,rgba(99,102,241,0.11),transparent_30%),radial-gradient(circle_at_72%_100%,rgba(16,185,129,0.08),transparent_34%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[.8fr_1.2fr] lg:items-stretch">
          <div className="flex flex-col items-start text-left">
            <Image
              src="/images/logo.png"
              alt="DigiDesk India"
              width={220}
              height={72}
              className="h-16 w-auto"
            />

            <div className="mt-5 h-px w-24 bg-gradient-to-r from-cyan-400 via-blue-500 to-transparent" />

            <p className="mt-5 max-w-[460px] text-left text-base leading-8 text-slate-300">
              DigiDesk India is a premium digital services platform for government help,
              document tools, image tools, and instant AI assistance built for India.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-[28px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_20px_60px_rgba(2,6,23,0.18)] backdrop-blur-sm sm:grid-cols-2 xl:grid-cols-3">
            <InfoPill accent="phone" icon={<Phone size={18} />} title="Support" value="+91 9696295457" />
            <InfoPill accent="email" icon={<Mail size={18} />} title="Email" value="yoursdigideskindia@gmail.com" />
            <InfoPill accent="location" icon={<MapPin size={18} />} title="Location" value="Kanpur, India" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-5">
          <FooterColumn title="Quick Links" items={quickLinks} />
          <FooterColumn title="PDF Tools" items={pdfTools} />
          <FooterColumn title="Image Tools" items={imageTools} />
          <FooterColumn title="Government Services" items={governmentServices} />
          <FooterColumn title="Support" items={support} />
        </div>
      </div>

      <div className={isDark ? "border-t border-white/10 bg-[#050B18]" : "border-t border-white/10 bg-slate-950/95"}>
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-5 py-6 text-sm text-slate-300 sm:items-center lg:flex-row">
          <p>© DigiDesk India. All rights reserved.</p>

          <p className="flex items-center gap-2 text-slate-200">
            Made with
            <Heart size={15} className="fill-red-500 text-red-500" />
            in India
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: Array<{ name: string; href: string }>;
}) {
  return (
    <div>
      <h3 className="font-[family-name:var(--font-sora)] text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">
        {title}
      </h3>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="group flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            <ArrowUpRight
              size={15}
              className="shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-cyan-400"
            />
            {item.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

function InfoPill({
  accent,
  icon,
  title,
  value,
}: {
  accent: "phone" | "email" | "location";
  icon: ReactNode;
  title: string;
  value: string;
}) {
  const accentStyles = {
    phone: {
      card: "hover:border-cyan-400/30",
      tile: "bg-gradient-to-br from-blue-500/30 via-cyan-400/20 to-cyan-300/10 text-cyan-200 ring-cyan-300/20",
    },
    email: {
      card: "hover:border-indigo-400/30",
      tile: "bg-gradient-to-br from-indigo-500/30 via-violet-500/20 to-fuchsia-400/10 text-indigo-200 ring-indigo-300/20",
    },
    location: {
      card: "hover:border-emerald-400/30",
      tile: "bg-gradient-to-br from-emerald-500/30 via-teal-400/20 to-cyan-300/10 text-emerald-200 ring-emerald-300/20",
    },
  }[accent];

  return (
    <div className={`group flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 shadow-[0_12px_28px_rgba(2,6,23,0.16)] transition duration-200 hover:bg-slate-950/55 ${accentStyles.card}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${accentStyles.tile}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{title}</p>
        <p className="mt-1 break-words text-sm font-semibold leading-snug text-white xl:whitespace-nowrap xl:text-[13px]">
          {value}
        </p>
      </div>
    </div>
  );
}
