import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SummaryCard({
  label,
  value,
  hint,
  accent = "navy",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "navy" | "success";
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden p-3.5 sm:p-4 transition-transform duration-200 hover:-translate-y-0.5",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-1",
          accent === "success" ? "bg-success/70" : "bg-navy/70",
        )}
        aria-hidden
      />
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 text-xl font-semibold tabular-nums tracking-tight sm:text-2xl",
          accent === "success" ? "text-success" : "text-navy",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </Card>
  );
}
