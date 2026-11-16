"use client";

import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { SummaryCard } from "@/components/ui/summary-card";
import type { DashboardSummary, Merchant, Sale } from "@/data/types";
import { formatDateTime, formatMoneyXof } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";

function paymentTone(state: Sale["paymentState"]) {
  if (state === "paid") return "success" as const;
  if (state === "partially_paid") return "warning" as const;
  return "neutral" as const;
}

export function DashboardView({
  merchants,
  activeMerchantId,
  summary,
}: {
  merchants: Merchant[];
  activeMerchantId: string;
  summary: DashboardSummary;
}) {
  const { dictionary, locale } = useLocale();
  const q = `?merchantId=${encodeURIComponent(activeMerchantId)}`;

  return (
    <AppShell
      titleKey="dashboard.title"
      merchants={merchants}
      activeMerchantId={activeMerchantId}
    >
      <div className="space-y-5">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            className="animate-fade-up stagger-1"
            label={dictionary.dashboard.todayRevenue}
            value={formatMoneyXof(summary.todayGrossSalesXof, locale)}
            accent="success"
            hint={dictionary.dashboard.grossSalesHint}
          />
          <SummaryCard
            className="animate-fade-up stagger-2"
            label={dictionary.dashboard.todayReceipts}
            value={formatMoneyXof(summary.todayReceiptsXof, locale)}
            hint={dictionary.money.xofNote}
          />
          <SummaryCard
            className="animate-fade-up stagger-3"
            label={dictionary.dashboard.saleCount}
            value={String(summary.todaySaleCount)}
          />
          <SummaryCard
            className="animate-fade-up stagger-4"
            label={dictionary.dashboard.outstanding}
            value={formatMoneyXof(summary.outstandingBalancesXof, locale)}
            hint={dictionary.money.xofNote}
          />
        </section>

        <Card className="animate-fade-up stagger-2">
          <CardHeader>
            <CardTitle>{dictionary.dashboard.analyticsTitle}</CardTitle>
            <CardDescription>{dictionary.dashboard.notProfitNote}</CardDescription>
          </CardHeader>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-surface-muted/50 px-3 py-2.5">
              <dt className="text-muted-foreground">
                {dictionary.dashboard.grossSales}
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-navy">
                {formatMoneyXof(summary.analytics.grossSalesXof, locale)}
              </dd>
            </div>
            <div className="rounded-xl bg-surface-muted/50 px-3 py-2.5">
              <dt className="text-muted-foreground">
                {dictionary.dashboard.receipts}
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-navy">
                {formatMoneyXof(summary.analytics.receiptsXof, locale)}
              </dd>
            </div>
            <div className="rounded-xl bg-surface-muted/50 px-3 py-2.5">
              <dt className="text-muted-foreground">
                {dictionary.dashboard.refunds}
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-navy">
                {formatMoneyXof(summary.analytics.refundsXof, locale)}
              </dd>
            </div>
            <div className="rounded-xl bg-surface-muted/50 px-3 py-2.5">
              <dt className="text-muted-foreground">
                {dictionary.dashboard.expenses}
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-navy">
                {formatMoneyXof(summary.analytics.expensesXof, locale)}
              </dd>
            </div>
            <div className="rounded-xl bg-surface-muted/50 px-3 py-2.5 sm:col-span-2">
              <dt className="text-muted-foreground">
                {dictionary.dashboard.salesMinusExpenses}
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-navy">
                {formatMoneyXof(
                  summary.analytics.salesMinusExpensesXof,
                  locale,
                )}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="animate-fade-up stagger-3">
          <CardHeader>
            <CardTitle>{dictionary.dashboard.quickActions}</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/sales/new${q}`}
              className="pressable inline-flex h-11 w-full items-center justify-center rounded-xl bg-navy px-4 text-sm font-medium text-white shadow-sm hover:bg-navy/90 sm:flex-1"
            >
              {dictionary.dashboard.recordSale}
            </Link>
            <Link
              href={`/sales${q}`}
              className="pressable inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-medium text-navy hover:bg-surface-muted sm:flex-1"
            >
              {dictionary.dashboard.viewSales}
            </Link>
            <Link
              href={`/expenses${q}`}
              className="pressable inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-medium text-navy hover:bg-surface-muted sm:flex-1"
            >
              {dictionary.dashboard.recordExpense}
            </Link>
          </div>
        </Card>

        <Card className="animate-fade-up stagger-4">
          <CardHeader className="mb-2 flex flex-row items-center justify-between gap-2">
            <CardTitle>{dictionary.dashboard.latestTransactions}</CardTitle>
          </CardHeader>
          {summary.latestSales.length === 0 ? (
            <EmptyState
              title={dictionary.sale.empty}
              description={dictionary.dashboard.recordSale}
              action={
                <Link
                  href={`/sales/new${q}`}
                  className="pressable inline-flex h-11 items-center justify-center rounded-xl bg-navy px-4 text-sm font-medium text-white"
                >
                  {dictionary.dashboard.recordSale}
                </Link>
              }
            />
          ) : (
            <DataTable
              rows={summary.latestSales}
              columns={[
                {
                  key: "product",
                  header: dictionary.sale.product,
                  cell: (row: Sale) => row.productName,
                },
                {
                  key: "total",
                  header: dictionary.sale.total,
                  className: "tabular-nums",
                  cell: (row: Sale) => formatMoneyXof(row.totalXof, locale),
                },
                {
                  key: "paid",
                  header: dictionary.sale.paid,
                  cell: (row: Sale) => (
                    <Badge tone={paymentTone(row.paymentState)}>
                      {row.paymentState === "paid"
                        ? dictionary.sale.states.paid
                        : row.paymentState === "partially_paid"
                          ? dictionary.sale.states.partial
                          : dictionary.sale.states.unpaid}
                    </Badge>
                  ),
                },
                {
                  key: "date",
                  header: dictionary.common.date,
                  cell: (row: Sale) => formatDateTime(row.createdAt, locale),
                },
              ]}
            />
          )}
        </Card>
      </div>
    </AppShell>
  );
}
