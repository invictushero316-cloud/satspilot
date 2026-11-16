/**
 * Integer money helpers. Never use floating-point for accounting.
 * XOF bookkeeping amounts are distinct from satoshi amounts — no FX conversion.
 */

export type CurrencyCode = "XOF" | "SAT" | "MSAT";

/** Whole XOF (XOF has no fractional subunit in practice). */
export type XofAmount = number & { readonly __brand: "XofAmount" };

/** Satoshis */
export type SatsAmount = number & { readonly __brand: "SatsAmount" };

/** Millisatoshis */
export type MsatsAmount = number & { readonly __brand: "MsatsAmount" };

export function asXof(value: number): XofAmount {
  if (!Number.isInteger(value)) {
    throw new Error("XOF amounts must be integers");
  }
  return value as XofAmount;
}

export function asSats(value: number): SatsAmount {
  if (!Number.isInteger(value)) {
    throw new Error("Sats amounts must be integers");
  }
  return value as SatsAmount;
}

export function asMsats(value: number): MsatsAmount {
  if (!Number.isInteger(value)) {
    throw new Error("Msats amounts must be integers");
  }
  return value as MsatsAmount;
}

export function formatXof(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSats(amount: number, locale: string): string {
  const formatted = new Intl.NumberFormat(
    locale === "fr" ? "fr-FR" : "en-US",
    { maximumFractionDigits: 0 },
  ).format(amount);
  return `${formatted} sats`;
}
