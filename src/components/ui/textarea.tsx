import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Textarea({
  className,
  invalid,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-navy shadow-sm placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/25 disabled:cursor-not-allowed disabled:opacity-70",
        invalid
          ? "border-danger focus-visible:ring-danger/30"
          : "border-border hover:border-navy/25",
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}
