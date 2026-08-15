import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: number;
}

export function Spinner({
  className,
  size = 22,
}: SpinnerProps) {
  return (
    <svg
      className={cn(
        "animate-spin",
        className
      )}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />

      <path
        d="M22 12A10 10 0 0012 2"
        stroke="currentColor"
        strokeWidth="3"
      />
    </svg>
  );
}