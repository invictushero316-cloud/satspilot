import { formatSats, formatXof } from "@/lib/money";

export function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatMoneyXof(amount: number, locale: string): string {
  return formatXof(amount, locale);
}

export function formatMoneySats(amount: number, locale: string): string {
  return formatSats(amount, locale);
}
