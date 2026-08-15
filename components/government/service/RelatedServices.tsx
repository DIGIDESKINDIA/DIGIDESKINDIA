"use client";

import Link from "next/link";
import type { GovernmentService } from "@/components/government/types";

interface Props {
  services: GovernmentService[];
}

export default function RelatedServices({
  services,
}: Props) {
  if (!services.length) return null;

  return (
    <section className="bg-white py-16">

      <div className="mx-auto max-w-7xl px-5">

        <h2 className="text-3xl font-bold">
          Related Services
        </h2>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">

          {services.map((service) => (

            <Link
              key={service.id}
              href={service.href}
              className="rounded-2xl border bg-slate-50 p-6 transition hover:border-blue-500 hover:shadow-lg"
            >

              <div className="text-4xl">
                {service.icon}
              </div>

              <h3 className="mt-4 font-bold">
                {service.title}
              </h3>

            </Link>

          ))}

        </div>

      </div>

    </section>
  );
}