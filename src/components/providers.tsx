"use client";

import type { ReactNode } from "react";

import { ToastProvider } from "@/components/ui/toast";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import type { SupportedLocale } from "@/lib/i18n/locales";

export function Providers({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: SupportedLocale;
}) {
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <ToastProvider>{children}</ToastProvider>
    </LocaleProvider>
  );
}
