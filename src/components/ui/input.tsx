import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, invalid, id, ...props }, ref) {
    return (
      <input
        ref={ref}
        id={id}
        className={cn(
          "h-11 w-full rounded-xl border bg-white px-3 text-sm text-navy shadow-sm placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/25 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70",
          invalid
            ? "border-danger focus-visible:ring-danger/30"
            : "border-border hover:border-navy/25",
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
    );
  },
);
