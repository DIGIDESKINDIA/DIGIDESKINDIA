"use client";

import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

export function Progress({
  value,
  className,
  showLabel = false,
}: ProgressProps) {
  const percentage = Math.max(
    0,
    Math.min(100, value)
  );

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex justify-between text-sm font-medium">
          <span>Progress</span>
          <span>{percentage}%</span>
        </div>
      )}

      <div
        className={cn(
          "h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800",
          className
        )}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 transition-all duration-300"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}