import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
  {
    variants: {
      variant: {
        default:
          "bg-slate-100 text-slate-700",

        primary:
          "bg-blue-100 text-blue-700",

        success:
          "bg-green-100 text-green-700",

        warning:
          "bg-yellow-100 text-yellow-700",

        danger:
          "bg-red-100 text-red-700",
      },
    },

    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({
  className,
  variant,
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        badgeVariants({
          variant,
        }),
        className
      )}
      {...props}
    />
  );
}