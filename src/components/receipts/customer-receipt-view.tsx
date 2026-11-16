"use client";

import { QRCodeSVG } from "qrcode.react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoneySats, formatMoneyXof } from "@/lib/format";

export type CustomerReceiptPayload = {
  publicId: string;
  merchantName: string;
  issuedAt: string;
  currency: string;
  totalMinor: number;
  lines: Array<{
    productName: string;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
    currency: string;
  }>;
  payment: {
    paymentState: string;
    amountPaidMinor: number;
    totalMinor: number;
    settledPayments: Array<{
      method: string;
      status: string;
      amountFiatMinor: number | null;
      amountSats: number | null;
      settledAt: string | null;
    }>;
    settlementNote: string;
  };
  verification: {
    signatureValid: boolean;
    hashMatches: boolean;
    integrityHash: string;
    npub: string;
    eventId: string;
  };
  verifyUrl: string;
  customerUrl: string;
  privacyNote: string;
  settlementDisclaimer: string;
};

function formatAmount(currency: string, minor: number, locale: string) {
  if (currency === "SAT") return formatMoneySats(minor, locale);
  return formatMoneyXof(minor, locale);
}

export function CustomerReceiptView({
  receipt,
  locale = "en",
}: {
  receipt: CustomerReceiptPayload;
  locale?: string;
}) {
  const paidTone =
    receipt.payment.paymentState === "PAID"
      ? "success"
      : receipt.payment.paymentState === "PARTIALLY_PAID"
        ? "warning"
        : "danger";

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col gap-4 bg-surface px-3 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Receipt</CardTitle>
          <CardDescription>{receipt.merchantName}</CardDescription>
        </CardHeader>
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge tone={paidTone}>{receipt.payment.paymentState}</Badge>
          <Badge tone={receipt.verification.signatureValid ? "success" : "danger"}>
            {receipt.verification.signatureValid
              ? "Signature valid"
              : "Invalid signature"}
          </Badge>
          <Badge tone={receipt.verification.hashMatches ? "success" : "danger"}>
            {receipt.verification.hashMatches ? "Hash intact" : "Hash mismatch"}
          </Badge>
        </div>

        <ul className="space-y-2 text-sm">
          {receipt.lines.map((line, i) => (
            <li
              key={`${line.productName}-${i}`}
              className="flex justify-between gap-3 border-b border-border/60 pb-2"
            >
              <span>
                {line.quantity} × {line.productName}
              </span>
              <span className="tabular-nums">
                {formatAmount(line.currency, line.lineTotalMinor, locale)}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-3 flex justify-between text-sm font-semibold">
          <span>Total</span>
          <span className="tabular-nums">
            {formatAmount(receipt.currency, receipt.totalMinor, locale)}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Paid (backend):{" "}
          {formatAmount(
            receipt.currency,
            receipt.payment.amountPaidMinor,
            locale,
          )}
        </p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Share / verify</CardTitle>
        </CardHeader>
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl border border-border bg-white p-3">
            <QRCodeSVG value={receipt.customerUrl} size={180} level="M" />
          </div>
          <p className="break-all text-center font-mono text-[11px] text-muted-foreground">
            {receipt.customerUrl}
          </p>
          <a
            href={receipt.verifyUrl}
            className="text-sm font-medium text-navy underline"
          >
            Open public verification (no line items)
          </a>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrity</CardTitle>
        </CardHeader>
        <dl className="space-y-2 text-xs text-muted-foreground">
          <div>
            <dt className="font-medium text-navy">Receipt id</dt>
            <dd className="break-all font-mono">{receipt.publicId}</dd>
          </div>
          <div>
            <dt className="font-medium text-navy">Integrity hash</dt>
            <dd className="break-all font-mono">
              {receipt.verification.integrityHash}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-navy">Merchant npub</dt>
            <dd className="break-all font-mono">{receipt.verification.npub}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-amber-900">{receipt.privacyNote}</p>
        <p className="mt-2 text-xs text-amber-900">
          {receipt.settlementDisclaimer}
        </p>
      </Card>
    </div>
  );
}
