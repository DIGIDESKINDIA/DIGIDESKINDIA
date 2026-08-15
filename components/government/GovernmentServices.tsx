"use client";

import { useMemo, useState } from "react";

import GovernmentSearch from "./GovernmentSearch";
import GovernmentCategories from "./GovernmentCategories";
import GovernmentCard from "./GovernmentCard";
import { governmentServices } from "./governmentData";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function GovernmentServices() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    return governmentServices.filter((service) => {
      const categoryMatch =
        category === "All" ||
        service.category === category;

      const searchMatch =
        service.title
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        service.description
          .toLowerCase()
          .includes(search.toLowerCase());

      return categoryMatch && searchMatch;
    });
  }, [search, category]);

  return (
    <section className={isDark ? "bg-[#050B18] py-24" : "bg-white py-24"}>
      <div className="mx-auto max-w-7xl px-5">

        <GovernmentSearch
          value={search}
          onChange={setSearch}
        />

        <GovernmentCategories
          active={category}
          onChange={setCategory}
        />

        <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((service) => (
            <GovernmentCard
              key={service.id}
              service={service}
            />
          ))}
        </div>

      </div>
    </section>
  );
}