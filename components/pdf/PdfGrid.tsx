"use client";

import { useMemo, useState } from "react";

import { pdfTools } from "./pdfData";
import PdfCard from "./PdfCard";
import PdfSearch from "./PdfSearch";
import PdfCategories from "./PdfCategories";

export default function PdfGrid() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    return pdfTools.filter((tool) => {
      const matchCategory =
        category === "All" ||
        tool.category === category;

      const matchSearch =
        tool.title
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        tool.description
          .toLowerCase()
          .includes(search.toLowerCase());

      return matchCategory && matchSearch;
    });
  }, [search, category]);

  return (
    <section
      id="tools"
      className="bg-slate-50 py-24"
    >
      <div className="mx-auto max-w-7xl px-5">

        <div className="mb-12 text-center">

          <h2 className="text-4xl font-black">
            PDF Tools
          </h2>

          <p className="mt-3 text-slate-600">
            {filtered.length} tools available
          </p>

        </div>

        <PdfSearch
          value={search}
          onChange={setSearch}
        />

        <PdfCategories
          active={category}
          onChange={setCategory}
        />

        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          {filtered.map((tool) => (
            <PdfCard
              key={tool.id}
              tool={tool}
            />
          ))}

        </div>

      </div>
    </section>
  );
}