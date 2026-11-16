"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { Merchant, Sale } from "@/data/types";
import { formatDateTime, formatMoneyXof } from "@/lib/format";
import { createIdempotencyKey } from "@/lib/idempotency-client";
import { useLocale } from "@/lib/i18n/locale-context";
import {
  recordSalePaymentAction,
  type ActionState,
} from "@/server/actions/bookkeeping";

function SalePaymentForm({
  merchantId,
  sale,
  onDone,
}: {
  merchantId: string;
  sale: Sale;
  onDone: () => void;
}) {
  const { dictionary, locale } = useLocale();
  const { push } = useToast();
  const router = useRouter();
  const due = sale.totalXof - sale.amountPaidXof;
  const [amount, setAmount] = useState(String(due));
  const [idempotencyKey] = useState(() => createIdempotencyKey("salepay"));
  const [state, formAction, pending] = useActionState<ActionState | null, FormData>(
    async (prev, formData) => {
      const result = await recordSalePaymentAction(prev, formData);
      if (result.ok) {
        push(dictionary.common.success, "success");
        onDone();
        router.refresh();
      }
      return result;
    },
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="merchantId" value={merchantId} />
      <input type="hidden" name="saleId" value={sale.id} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <p className="text-sm text-muted-foreground">
        {dictionary.sale.due}: {formatMoneyXof(due, locale)}
      </p>
      <div>
        <Label htmlFor="amount">{dictionary.common.amount}</Label>
        <Input
          id="amount"
          name="amountMinor"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      {state && !state.ok ? <FieldError message={state.error} /> : null}
      <Button type="submit" className="w-full" loading={pending}>
        {dictionary.common.confirm}
      </Button>
    </form>
  );
}

export function SalesHistoryView({
  merchants,
  activeMerchantId,
  sales,
  filters,
}: {
  merchants: Merchant[];
  activeMerchantId: string;
  sales: Sale[];
  filters: { from?: string; to?: string; paymentState?: string };
}) {
  const { dictionary, locale } = useLocale();
  const router = useRouter();
  const [from, setFrom] = useState(filters.from ?? "");
  const [to, setTo] = useState(filters.to ?? "");
  const [paymentState, setPaymentState] = useState(filters.paymentState ?? "");
  const [paySale, setPaySale] = useState<Sale | null>(null);
  const [payKey, setPayKey] = useState(0);

  function applyFilters() {
    const params = new URLSearchParams();
    params.set("merchantId", activeMerchantId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (paymentState) params.set("paymentState", paymentState);
    router.push(`/sales?${params.toString()}`);
  }

  return (
    <AppShell
      titleKey="sale.historyTitle"
      merchants={merchants}
      activeMerchantId={activeMerchantId}
    >
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{dictionary.common.filter}</CardTitle>
        </CardHeader>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label>{dictionary.common.from}</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>{dictionary.common.to}</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label>{dictionary.sale.paid}</Label>
            <Select
              value={paymentState}
              onChange={(e) => setPaymentState(e.target.value)}
            >
              <option value="">—</option>
              <option value="UNPAID">{dictionary.sale.states.unpaid}</option>
              <option value="PARTIALLY_PAID">
                {dictionary.sale.states.partial}
              </option>
              <option value="PAID">{dictionary.sale.states.paid}</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={applyFilters}>
              {dictionary.common.filter}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{dictionary.sale.historyTitle}</CardTitle>
          <Button
            size="sm"
            onClick={() =>
              router.push(
                `/sales/new?merchantId=${encodeURIComponent(activeMerchantId)}`,
              )
            }
          >
            {dictionary.sale.title}
          </Button>
        </CardHeader>
        {sales.length === 0 ? (
          <EmptyState title={dictionary.sale.empty} />
        ) : (
          <DataTable
            rows={sales}
            columns={[
              {
                key: "name",
                header: dictionary.sale.product,
                cell: (row) => row.productName,
              },
              {
                key: "total",
                header: dictionary.sale.total,
                className: "tabular-nums",
                cell: (row) => formatMoneyXof(row.totalXof, locale),
              },
              {
                key: "paid",
                header: dictionary.sale.paid,
                className: "tabular-nums",
                cell: (row) => formatMoneyXof(row.amountPaidXof, locale),
              },
              {
                key: "state",
                header: dictionary.common.status,
                cell: (row) => (
                  <Badge
                    tone={
                      row.paymentState === "paid"
                        ? "success"
                        : row.paymentState === "partially_paid"
                          ? "warning"
                          : "neutral"
                    }
                  >
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
                cell: (row) => formatDateTime(row.createdAt, locale),
              },
              {
                key: "actions",
                header: dictionary.common.actions,
                cell: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        router.push(
                          `/sales/${row.id}/receipt?merchantId=${encodeURIComponent(activeMerchantId)}`,
                        )
                      }
                    >
                      {dictionary.receipt.title}
                    </Button>
                    {row.paymentState !== "paid" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setPayKey((k) => k + 1);
                          setPaySale(row);
                        }}
                      >
                        {dictionary.sale.recordPayment}
                      </Button>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Dialog
        open={Boolean(paySale)}
        onClose={() => setPaySale(null)}
        title={dictionary.sale.recordPayment}
      >
        {paySale ? (
          <SalePaymentForm
            key={payKey}
            merchantId={activeMerchantId}
            sale={paySale}
            onDone={() => setPaySale(null)}
          />
        ) : null}
      </Dialog>
    </AppShell>
  );
}
