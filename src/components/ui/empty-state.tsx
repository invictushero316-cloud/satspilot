import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-gradient-to-b from-white/70 to-surface-muted/50 px-4 py-12 text-center animate-fade-in",
        className,
      )}
    >
      <div
        className="mb-3 flex size-10 items-center justify-center rounded-xl bg-navy-soft text-navy"
        aria-hidden
      >
        <span className="text-lg font-semibold">·</span>
      </div>
      <p className="text-sm font-medium text-navy">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
