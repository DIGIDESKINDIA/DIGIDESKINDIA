"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { governmentServices } from "@/data/government";

interface Props {
  currentSlug: string;
}

export default function RelatedServices({
  currentSlug,
}: Props) {
  const related = governmentServices
    .filter((item) => item.slug !== currentSlug)
    .slice(0, 4);

  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-6xl px-5">

        <h2 className="mb-10 text-3xl font-black">
          Related Services
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

          {related.map((service) => (

            <Link
              key={service.slug}
              href={`/service/${service.slug}`}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-2 hover:border-blue-500 hover:shadow-xl"
            >

              <div className="text-4xl">
                {service.icon}
              </div>

              <h3 className="mt-4 font-bold">
                {service.title}
              </h3>

              <p className="mt-2 text-sm text-slate-600">
                {service.description}
              </p>

              <div className="mt-5 flex items-center gap-2 font-semibold text-blue-700">

                View

                <ArrowRight size={18} />

              </div>

            </Link>

          ))}

        </div>

      </div>
    </section>
  );
}