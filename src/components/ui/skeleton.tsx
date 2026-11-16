import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "skeleton-shimmer rounded-lg bg-surface-muted",
        className,
      )}
      aria-hidden
      {...props}
    />
  );
}

export function PageLoadingSkeleton({
  label = "Loading…",
}: {
  label?: string;
}) {
  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-4 px-3 py-5 sm:px-4 animate-fade-in"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-56" />
    </div>
  );
}
