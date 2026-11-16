"use client";

import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import type { Merchant, Payment } from "@/data/types";
import { formatDateTime, formatMoneySats, formatMoneyXof } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";

export function PaymentsView({
  merchants,
  activeMerchantId,
  payments,
  walletConnected,
}: {
  merchants: Merchant[];
  activeMerchantId: string;
  payments: Payment[];
  walletConnected: boolean;
}) {
  const { dictionary, locale } = useLocale();

  return (
    <AppShell
      titleKey="payments.title"
      merchants={merchants}
      activeMerchantId={activeMerchantId}
    >
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{dictionary.payments.title}</CardTitle>
          <CardDescription>{dictionary.payments.cashOnlyNote}</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/payments/receive?merchantId=${activeMerchantId}`}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-navy px-4 text-sm font-medium text-white"
          >
            {dictionary.payments.receiveLightning}
          </Link>
          {!walletConnected ? (
            <Link
              href={`/settings?merchantId=${activeMerchantId}`}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-medium text-navy"
            >
              {dictionary.settings.connectWallet}
            </Link>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dictionary.payments.history}</CardTitle>
          <CardDescription>
            {dictionary.payments.lightningHistory}
          </CardDescription>
        </CardHeader>
        {payments.length === 0 ? (
          <EmptyState title={dictionary.payments.empty} />
        ) : (
          <DataTable
            rows={payments}
            columns={[
              {
                key: "kind",
                header: dictionary.payments.kind,
                cell: (row) => row.kind.replaceAll("_", " "),
              },
              {
                key: "amount",
                header: dictionary.common.amount,
                className: "tabular-nums",
                cell: (row) => {
                  if (row.method === "lightning" && row.amountSats != null) {
                    return formatMoneySats(row.amountSats, locale);
                  }
                  if (row.amountXof == null) return "—";
                  return formatMoneyXof(row.amountXof, locale);
                },
              },
              {
                key: "method",
                header: dictionary.payments.method,
                cell: (row) => row.method,
              },
              {
                key: "status",
                header: dictionary.common.status,
                cell: (row) => (
                  <Badge
                    tone={
                      row.status === "settled"
                        ? "success"
                        : row.status === "pending"
                          ? "warning"
                          : row.status === "expired" || row.status === "failed"
                            ? "danger"
                            : "info"
                    }
                  >
                    {row.status}
                  </Badge>
                ),
              },
              {
                key: "desc",
                header: dictionary.payments.description,
                cell: (row) => row.description || "—",
              },
              {
                key: "date",
                header: dictionary.common.date,
                cell: (row) =>
                  formatDateTime(row.settledAt ?? row.createdAt, locale),
              },
            ]}
          />
        )}
      </Card>
    </AppShell>
  );
}
