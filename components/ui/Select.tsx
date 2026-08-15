"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface Option {
  label: string;
  value: string;
}

interface SelectProps {
  options: Option[];
  value: string;
  onChange(
    value: string
  ): void;
}

export function Select({
  options,
  value,
  onChange,
}: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) =>
        onChange(e.target.value)
      }
      className={cn(
        "h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition",
        "focus:border-blue-600",
        "dark:border-slate-700 dark:bg-slate-900"
      )}
    >
      {options.map((item) => (
        <option
          key={item.value}
          value={item.value}
        >
          {item.label}
        </option>
      ))}
    </select>
  );
}