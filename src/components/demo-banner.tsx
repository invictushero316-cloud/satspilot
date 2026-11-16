"use client";

import { IconAlert } from "@/components/icons";
import { useLocale } from "@/lib/i18n/locale-context";

export function DemoBanner() {
  const { dictionary } = useLocale();

  return (
    <div
      role="status"
      className="flex items-start gap-2 border-b border-amber-200/80 bg-amber-50/95 px-3 py-2.5 text-xs text-amber-950 backdrop-blur-sm sm:px-4 sm:text-sm animate-fade-in"
    >
      <IconAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
      <p className="leading-snug">{dictionary.demoBanner}</p>
    </div>
  );
}
