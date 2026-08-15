"use client";

interface Props {
  eligibility: string[];
}

export default function ServiceEligibility({
  eligibility,
}: Props) {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-5">

        <h2 className="text-3xl font-bold">
          Eligibility
        </h2>

        <ul className="mt-8 space-y-4">
          {eligibility.map((item) => (
            <li
              key={item}
              className="rounded-xl border bg-green-50 p-5"
            >
              ✔ {item}
            </li>
          ))}
        </ul>

      </div>
    </section>
  );
}