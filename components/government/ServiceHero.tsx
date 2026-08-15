"use client";

interface Props {
  title: string;
  description: string;
}

export default function ServiceHero({
  title,
  description,
}: Props) {
  return (
    <section className="bg-gradient-to-r from-blue-700 to-cyan-500 py-20 text-white">
      <div className="mx-auto max-w-7xl px-5">

        <h1 className="text-5xl font-black">

          {title}

        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8">

          {description}

        </p>

      </div>
    </section>
  );
}