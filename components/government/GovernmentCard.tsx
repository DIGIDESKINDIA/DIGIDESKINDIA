"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  Bus,
  Calculator,
  Car,
  CreditCard,
  FileBadge,
  FileCheck2,
  GraduationCap,
  HeartPulse,
  Home,
  IdCard,
  Landmark,
  Laptop,
  MapPin,
  Plane,
  ReceiptText,
  Scale,
  SearchCheck,
  ShieldCheck,
  Smartphone,
  Stamp,
  Train,
  UserRoundCheck,
  UsersRound,
  Vote,
} from "lucide-react";

import type { GovernmentService } from "./types";
import { useTheme } from "@/components/theme/ThemeProvider";

interface Props {
  service: GovernmentService;
}

function renderServiceIcon(
  title: string,
  category: string
): ReactNode {
  const value =
    `${title} ${category}`.toLowerCase();

  if (
    value.includes("aadhaar") ||
    value.includes("aadhar")
  ) {
    return <IdCard size={19} strokeWidth={2.2} />;
  }

  if (value.includes("pan")) {
    return <CreditCard size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("voter") ||
    value.includes("vote")
  ) {
    return <Vote size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("passport") ||
    value.includes("visa")
  ) {
    return <Plane size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("driving") ||
    value.includes("vehicle") ||
    value.includes("dl")
  ) {
    return <Car size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("ration") ||
    value.includes("food")
  ) {
    return <ReceiptText size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("income") ||
    value.includes("caste") ||
    value.includes("domicile") ||
    value.includes("certificate")
  ) {
    return <FileBadge size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("scholarship") ||
    value.includes("education") ||
    value.includes("admission") ||
    value.includes("exam") ||
    value.includes("result")
  ) {
    return <GraduationCap size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("job") ||
    value.includes("employment") ||
    value.includes("recruitment")
  ) {
    return <BriefcaseBusiness size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("pension") ||
    value.includes("pf") ||
    value.includes("epfo")
  ) {
    return <UsersRound size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("health") ||
    value.includes("hospital") ||
    value.includes("ayushman")
  ) {
    return <HeartPulse size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("property") ||
    value.includes("land") ||
    value.includes("registry")
  ) {
    return <Landmark size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("legal") ||
    value.includes("court")
  ) {
    return <Scale size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("gst") ||
    value.includes("tax") ||
    value.includes("income tax")
  ) {
    return <Calculator size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("bank") ||
    value.includes("loan") ||
    value.includes("finance")
  ) {
    return <Banknote size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("train") ||
    value.includes("railway")
  ) {
    return <Train size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("bus")
  ) {
    return <Bus size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("online") ||
    value.includes("digital")
  ) {
    return <Laptop size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("mobile") ||
    value.includes("phone")
  ) {
    return <Smartphone size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("police") ||
    value.includes("verification")
  ) {
    return <ShieldCheck size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("apply") ||
    value.includes("application")
  ) {
    return <FileCheck2 size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("status") ||
    value.includes("track")
  ) {
    return <SearchCheck size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("municipal") ||
    value.includes("nagar") ||
    value.includes("building")
  ) {
    return <Building2 size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("home") ||
    value.includes("housing")
  ) {
    return <Home size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("location") ||
    value.includes("address")
  ) {
    return <MapPin size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("stamp") ||
    value.includes("notary")
  ) {
    return <Stamp size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("book") ||
    value.includes("study")
  ) {
    return <BookOpenCheck size={19} strokeWidth={2.2} />;
  }

  if (
    value.includes("user") ||
    value.includes("profile")
  ) {
    return <UserRoundCheck size={19} strokeWidth={2.2} />;
  }

  return <BadgeCheck size={19} strokeWidth={2.2} />;
}

export default function GovernmentCard({
  service,
}: Props) {
  const { theme } = useTheme();

  const isDark =
    theme === "dark";

  return (
    <Link
      href={service.href}
      className={
        isDark
          ? "group relative flex h-full min-h-[185px] flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.045] p-3 shadow-[0_8px_24px_rgba(2,6,23,0.22)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/40 hover:bg-white/[0.07] hover:shadow-[0_14px_30px_rgba(37,99,235,0.16)]"
          : "group relative flex h-full min-h-[185px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-[0_12px_28px_rgba(37,99,235,0.12)]"
      }
    >
      {service.popular && (
        <span
          className={
            isDark
              ? "absolute right-2.5 top-2.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-cyan-300"
              : "absolute right-2.5 top-2.5 rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-blue-700"
          }
        >
          Popular
        </span>
      )}

      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-white shadow-[0_6px_16px_rgba(14,165,233,0.22)] ring-4 ring-blue-500/10 transition-transform duration-300 group-hover:scale-105">
        {renderServiceIcon(service.title, service.category)}
      </div>

      <h3
        className={
          isDark
            ? "pr-12 text-[13px] font-bold leading-5 text-white"
            : "pr-12 text-[13px] font-bold leading-5 text-slate-900"
        }
      >
        {service.title}
      </h3>

      <p
        className={
          isDark
            ? "mt-1.5 flex-1 text-[11px] leading-[1.35rem] text-slate-400"
            : "mt-1.5 flex-1 text-[11px] leading-[1.35rem] text-slate-600"
        }
      >
        {service.description}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className={
            isDark
              ? "max-w-[72%] truncate rounded-md bg-white/[0.07] px-1.5 py-1 text-[9px] font-semibold text-slate-300"
              : "max-w-[72%] truncate rounded-md bg-slate-100 px-1.5 py-1 text-[9px] font-semibold text-slate-600"
          }
        >
          {service.category}
        </span>

        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white shadow-sm transition-all duration-300 group-hover:translate-x-0.5">
          <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}