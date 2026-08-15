"use client";

import { useMemo } from "react";

interface Props {
  totalPages: number;

  value: number[];

  onChange(
    pages: number[]
  ): void;
}

export default function PageSelector({
  totalPages,
  value,
  onChange,
}: Props) {
  const selected = useMemo(
    () => new Set(value),
    [value]
  );

  function toggle(
    page: number
  ) {
    const pages = new Set(
      value
    );

    if (pages.has(page)) {
      pages.delete(page);
    } else {
      pages.add(page);
    }

    onChange(
      Array.from(pages).sort(
        (a, b) => a - b
      )
    );
  }

  function selectAll() {
    onChange(
      Array.from(
        {
          length: totalPages,
        },
        (_, index) => index + 1
      )
    );
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <section className="mt-10 rounded-3xl border bg-white p-6 shadow-sm">

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>

          <h2 className="text-xl font-bold text-slate-800">

            Select Pages

          </h2>

          <p className="text-sm text-slate-500">

            {value.length} of{" "}
            {totalPages} page
            {totalPages > 1
              ? "s"
              : ""}{" "}
            selected

          </p>

        </div>

        <div className="flex gap-3">

          <button
            onClick={selectAll}
            className="rounded-xl border px-4 py-2 text-sm font-semibold transition hover:bg-blue-50"
          >
            Select All
          </button>

          <button
            onClick={clearAll}
            className="rounded-xl border px-4 py-2 text-sm font-semibold transition hover:bg-red-50"
          >
            Clear
          </button>

        </div>

      </div>

      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">

        {Array.from(
          {
            length: totalPages,
          },
          (_, index) => {
            const page =
              index + 1;

            const active =
              selected.has(page);

            return (
              <button
                key={page}
                onClick={() =>
                  toggle(page)
                }
                className={`rounded-xl border py-3 text-sm font-bold transition-all duration-200

                ${
                  active
                    ? "border-blue-600 bg-blue-600 text-white shadow-md"
                    : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                }`}
              >
                {page}
              </button>
            );
          }
        )}

      </div>

    </section>
  );
}