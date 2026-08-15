"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import type { GovernmentService } from "./types";
import { useTheme } from "@/components/theme/ThemeProvider";

interface Props {
  service: GovernmentService;
}

export default function GovernmentCard({ service }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Link
      href={service.href}
      className={isDark ? "group relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_45px_rgba(2,6,23,0.32)] transition-all duration-300 hover:-translate-y-2 hover:border-blue-400/25 hover:shadow-[0_24px_55px_rgba(37,99,235,0.16)]" : "group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-blue-500 hover:shadow-2xl"}
    >
      {service.popular && (
        <span className="absolute right-4 top-4 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
          Popular
        </span>
      )}

      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-4xl">
        {service.icon}
      </div>

      <h3 className={isDark ? "text-xl font-bold text-white" : "text-xl font-bold"}>{service.title}</h3>

      <p className={isDark ? "mt-3 flex-1 text-sm text-slate-300" : "mt-3 flex-1 text-sm text-slate-600"}>
        {service.description}
      </p>

      <span className={isDark ? "mt-4 inline-flex w-fit rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-slate-200" : "mt-4 inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold"}>
        {service.category}
      </span>

      <Button
        className="mt-6 w-full"
        rightIcon={<ArrowRight size={18} />}
      >
        Apply Now
      </Button>
    </Link>
  );
}