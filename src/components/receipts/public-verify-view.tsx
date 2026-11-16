"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoneySats, formatMoneyXof } from "@/lib/format";

export type PublicVerifyPayload = {
  publicId: string;
  integrityHash: string;
  currency: string;
  totalMinor: number;
  issuedAt: string;
  npub: string;
  pubkeyHex: string;
  eventId: string;
  verification: { signatureValid: boolean; hashMatches: boolean };
  payment: {
    paymentState: string;
    amountPaidMinor: number;
    totalMinor: number;
    settlementNote: string;
  };
  publishedToRelay: boolean;
  publishedRelay: string | null;
  thirdPartyCanVerify: string[];
  thirdPartyCannotSee: string[];
};

export function PublicVerifyView({
  data,
  locale = "en",
}: {
  data: PublicVerifyPayload;
  locale?: string;
}) {
  const amount =
    data.currency === "SAT"
      ? formatMoneySats(data.totalMinor, locale)
      : formatMoneyXof(data.totalMinor, locale);

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col gap-4 bg-surface px-3 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Public receipt verification</CardTitle>
          <CardDescription>
            No customer personal data or line items on this screen.
          </CardDescription>
        </CardHeader>
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge
            tone={data.verification.signatureValid ? "success" : "danger"}
          >
            {data.verification.signatureValid
              ? "NIP-01 signature valid"
              : "Invalid signature"}
          </Badge>
          <Badge tone={data.verification.hashMatches ? "success" : "danger"}>
            {data.verification.hashMatches ? "Hash matches" : "Tampered hash"}
          </Badge>
          <Badge
            tone={
              data.payment.paymentState === "PAID" ? "success" : "warning"
            }
          >
            Backend: {data.payment.paymentState}
          </Badge>
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Attested total</dt>
            <dd className="tabular-nums font-medium">{amount}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Currency</dt>
            <dd>{data.currency}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Public id</dt>
            <dd className="break-all font-mono text-xs">{data.publicId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Integrity hash</dt>
            <dd className="break-all font-mono text-xs">{data.integrityHash}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Merchant npub</dt>
            <dd className="break-all font-mono text-xs">{data.npub}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Event id</dt>
            <dd className="break-all font-mono text-xs">{data.eventId}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-amber-900">{data.payment.settlementNote}</p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What a third party can verify</CardTitle>
        </CardHeader>
        <ul className="list-disc space-y-1 pl-5 text-sm text-navy">
          {data.thirdPartyCanVerify.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs font-medium uppercase text-muted-foreground">
          Cannot see from public attestation alone
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {data.thirdPartyCannotSee.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {data.publishedToRelay ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Published to relay: {data.publishedRelay}
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Not published to a public relay (merchant opt-in required).
          </p>
        )}
      </Card>
    </div>
  );
}
