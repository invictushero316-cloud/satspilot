import type { ReactNode } from "react";

import { APP_NAME } from "@/lib/constants";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="auth-atmosphere relative flex min-h-full flex-1 items-center justify-center px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(11 31 58 / 8%) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="relative w-full max-w-md animate-fade-up space-y-6 rounded-2xl border border-border/80 bg-white/95 p-6 shadow-[var(--shadow-soft)] backdrop-blur-sm sm:p-7">
        <div className="space-y-2 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-navy">
            {APP_NAME}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-navy sm:text-3xl">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        </div>
        {children}
        {footer}
      </div>
    </main>
  );
}
