import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function StaticPage({
  eyebrow,
  title,
  description,
  bullets,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}) {
  return (
    <main className="bg-slate-50 py-16 lg:py-24">
      <section className="mx-auto max-w-5xl px-5">
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm lg:p-12">
          <span className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            {eyebrow}
          </span>

          <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {title}
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            {description}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {bullets.map((bullet) => (
              <div
                key={bullet}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700"
              >
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href={primaryHref}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-700 to-cyan-500 px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5"
            >
              {primaryLabel}
              <ArrowRight size={18} />
            </Link>

            <Link
              href={secondaryHref}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700"
            >
              {secondaryLabel}
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
