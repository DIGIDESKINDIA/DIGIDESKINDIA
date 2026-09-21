"use client";

import { useMemo, useState } from "react";

import { pdfTools } from "./pdfData";
import PdfCard from "./PdfCard";
import PdfSearch from "./PdfSearch";
import PdfCategories from "./PdfCategories";
import PdfHero from "./PdfHero";

export default function PdfGrid() {
  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("All");

  const filtered =
    useMemo(() => {
      return pdfTools.filter(
        (tool) => {
          const matchCategory =
            category === "All" ||
            tool.category === category;

          const matchSearch =
            tool.title
              .toLowerCase()
              .includes(
                search.toLowerCase()
              ) ||
            tool.description
              .toLowerCase()
              .includes(
                search.toLowerCase()
              );

          return (
            matchCategory &&
            matchSearch
          );
        }
      );
    }, [search, category]);

  return (
    <section id="tools" className="bg-[#f7f9fc] py-7 sm:py-9 dark:bg-[#07111f]">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <PdfHero>
          <div className="space-y-3">
            <PdfSearch value={search} onChange={setSearch} />
            <PdfCategories active={category} onChange={setCategory} />
          </div>
        </PdfHero>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {filtered.map((tool) => (
            <PdfCard key={tool.id} tool={tool} />
          ))}
        </div>
      </div>
    </section>
  );
}