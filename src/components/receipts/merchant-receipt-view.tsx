"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import type { Merchant } from "@/data/types";
import { formatMoneySats, formatMoneyXof } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import {
  publishReceiptAction,
  type ReceiptActionState,
} from "@/server/actions/receipts";

export type MerchantReceiptPayload = {
  id: string;
  publicId: string;
  saleId: string;
  merchantId: string;
  merchantName: string;
  customerUrl: string;
  verifyUrl: string;
  integrityHash: string;
  eventId: string;
  npub: string;
  currency: string;
  totalMinor: number;
  issuedAt: string;
  publishedToRelay: boolean;
  publishedAt: string | null;
  publishedRelay: string | null;
  verification: { signatureValid: boolean; hashMatches: boolean };
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
    settlementNote: string;
  };
  thirdPartyCanVerify: string[];
  thirdPartyCannotVerify: string[];
};

export function MerchantReceiptView({
  merchants,
  activeMerchantId,
  receipt,
  nostrPublishOptIn,
}: {
  merchants: Merchant[];
  activeMerchantId: string;
  receipt: MerchantReceiptPayload;
  nostrPublishOptIn: boolean;
}) {
  const { locale } = useLocale();
  const { push } = useToast();
  const router = useRouter();

  const [publishState, publishAction, publishPending] = useActionState(
    async (prev: ReceiptActionState | null, formData: FormData) => {
      const result = await publishReceiptAction(prev, formData);
      if (result.ok) {
        push(result.message ?? "Published", "success");
        router.refresh();
      }
      return result;
    },
    null,
  );

  const amount =
    receipt.currency === "SAT"
      ? formatMoneySats(receipt.totalMinor, locale)
      : formatMoneyXof(receipt.totalMinor, locale);

  return (
    <AppShell
      titleKey="receipt.title"
      merchants={merchants}
      activeMerchantId={activeMerchantId}
    >
      <div className="mx-auto grid max-w-2xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Signed receipt</CardTitle>
            <CardDescription>
              Server-managed Nostr identity — merchants never paste an nsec.
            </CardDescription>
          </CardHeader>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge
              tone={
                receipt.verification.signatureValid ? "success" : "danger"
              }
            >
              {receipt.verification.signatureValid
                ? "Signature valid"
                : "Invalid signature"}
            </Badge>
            <Badge tone={receipt.payment.paymentState === "PAID" ? "success" : "warning"}>
              {receipt.payment.paymentState}
            </Badge>
            {receipt.publishedToRelay ? (
              <Badge tone="info">Published</Badge>
            ) : null}
          </div>
          <p className="text-sm font-semibold tabular-nums">{amount}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {receipt.lines.map((line, i) => (
              <li key={`${line.productName}-${i}`}>
                {line.quantity} × {line.productName}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-amber-900">
            {receipt.payment.settlementNote}
          </p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer QR / link</CardTitle>
          </CardHeader>
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-xl border border-border bg-white p-3">
              <QRCodeSVG value={receipt.customerUrl} size={200} level="M" />
            </div>
            <p className="break-all text-center font-mono text-[11px]">
              {receipt.customerUrl}
            </p>
            <a
              href={receipt.verifyUrl}
              className="text-sm text-navy underline"
              target="_blank"
              rel="noreferrer"
            >
              Public verification screen
            </a>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nostr publication</CardTitle>
            <CardDescription>
              Publishes only the integrity hash attestation (kind 31234). No
              names, phones, balances, or NWC data.
            </CardDescription>
          </CardHeader>
          {!nostrPublishOptIn ? (
            <p className="text-sm text-amber-900">
              Enable “Publish receipt attestations” in Settings first (explicit
              opt-in).
            </p>
          ) : (
            <form action={publishAction} className="space-y-3">
              <input type="hidden" name="merchantId" value={activeMerchantId} />
              <input type="hidden" name="saleId" value={receipt.saleId} />
              <div>
                <Label htmlFor="relay">Relay (wss://)</Label>
                <Input
                  id="relay"
                  name="relayUrl"
                  placeholder="wss://relay.damus.io"
                  defaultValue=""
                />
              </div>
              {publishState && !publishState.ok ? (
                <FieldError message={publishState.error} />
              ) : null}
              <Button type="submit" loading={publishPending}>
                {receipt.publishedToRelay
                  ? "Re-check publish (idempotent)"
                  : "Publish attestation"}
              </Button>
            </form>
          )}
          <dl className="mt-4 space-y-1 text-xs text-muted-foreground">
            <div>
              <dt className="font-medium text-navy">npub</dt>
              <dd className="break-all font-mono">{receipt.npub}</dd>
            </div>
            <div>
              <dt className="font-medium text-navy">hash</dt>
              <dd className="break-all font-mono">{receipt.integrityHash}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </AppShell>
  );
}
