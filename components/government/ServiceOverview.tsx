"use client";

interface Props {
  description: string;
  processingTime: string;
}

export default function ServiceOverview({
  description,
  processingTime,
}: Props) {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-5">

        <h2 className="text-3xl font-bold text-slate-900">
          Overview
        </h2>

        <p className="mt-5 max-w-4xl leading-8 text-slate-600">
          {description}
        </p>

        <div className="mt-8 rounded-2xl bg-blue-50 p-6">
          <h3 className="font-semibold text-blue-700">
            Processing Time
          </h3>

          <p className="mt-2 text-lg font-bold">
            {processingTime}
          </p>
        </div>

      </div>
    </section>
  );
}