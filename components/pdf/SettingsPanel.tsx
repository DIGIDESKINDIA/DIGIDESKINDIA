"use client";

import { ReactNode } from "react";
import {
  Settings2,
  ChevronDown,
} from "lucide-react";

interface SettingsPanelProps {
  title?: string;

  description?: string;

  children: ReactNode;

  defaultOpen?: boolean;
}

export default function SettingsPanel({
  title = "Advanced Settings",

  description = "Configure additional options for this PDF operation.",

  children,

  defaultOpen = true,
}: SettingsPanelProps) {
  return (
    <details
      open={defaultOpen}
      className="rounded-3xl border border-slate-200 bg-white shadow-sm transition-all"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-3xl px-6 py-5 transition hover:bg-slate-50">

        <div className="flex items-center gap-4">

          <div className="rounded-xl bg-blue-100 p-3">

            <Settings2
              size={22}
              className="text-blue-600"
            />

          </div>

          <div>

            <h2 className="text-lg font-bold text-slate-900">

              {title}

            </h2>

            <p className="mt-1 text-sm text-slate-500">

              {description}

            </p>

          </div>

        </div>

        <ChevronDown
          size={22}
          className="text-slate-500 transition-transform duration-300 group-open:rotate-180"
        />

      </summary>

      <div className="border-t border-slate-200 p-6">

        <div className="grid gap-6">

          {children}

        </div>

      </div>

    </details>
  );
}