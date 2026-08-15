"use client";

interface Props {
  badge?: string;
  title: string;
  subtitle: string;
}

export default function SectionHeading({
  badge,
  title,
  subtitle,
}: Props) {
  return (
    <div className="mb-14 text-center">

      {badge && (
        <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-semibold text-blue-700">
          {badge}
        </span>
      )}

      <h2 className="mt-5 text-5xl font-black text-slate-900">
        {title}
      </h2>

      <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">
        {subtitle}
      </p>

    </div>
  );
}