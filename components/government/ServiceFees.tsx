"use client";

import {
  BadgeIndianRupee,
  Clock3,
} from "lucide-react";

interface Props {
  service: {
    fees?: string;
    processingTime?: string;
  };
}

export default function ServiceFees({
  service,
}: Props) {
  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-2">

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-5 flex items-center gap-3">

            <div className="rounded-2xl bg-green-100 p-3 text-green-700">
              <BadgeIndianRupee size={24} />
            </div>

            <h2 className="text-2xl font-bold text-slate-900">
              Service Fee
            </h2>

          </div>

          <p className="text-lg font-semibold text-slate-700">
            {service.fees || "As per Government Rules"}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-5 flex items-center gap-3">

            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <Clock3 size={24} />
            </div>

            <h2 className="text-2xl font-bold text-slate-900">
              Processing Time
            </h2>

          </div>

          <p className="text-lg font-semibold text-slate-700">
            {service.processingTime || "7–15 Working Days"}
          </p>
        </div>

      </div>
    </section>
  );
}