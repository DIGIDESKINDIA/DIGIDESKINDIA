"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export function Tooltip({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipPrimitive.Provider>

      <TooltipPrimitive.Root>

        <TooltipPrimitive.Trigger asChild>

          {children}

        </TooltipPrimitive.Trigger>

        <TooltipPrimitive.Content
          sideOffset={8}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-xl"
        >
          {text}
        </TooltipPrimitive.Content>

      </TooltipPrimitive.Root>

    </TooltipPrimitive.Provider>
  );
}