import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<
  HTMLInputElement,
  InputProps
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm transition-all",
        "placeholder:text-slate-400",
        "focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-blue-900",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };