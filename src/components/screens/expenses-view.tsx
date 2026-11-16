"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type { Expense, Merchant } from "@/data/types";
import { formatDateTime, formatMoneyXof } from "@/lib/format";
import { createIdempotencyKey } from "@/lib/idempotency-client";
import { useLocale } from "@/lib/i18n/locale-context";
import {
  createExpenseAction,
  type ActionState,
} from "@/server/actions/bookkeeping";

function ExpenseForm({
  merchantId,
  onDone,
}: {
  merchantId: string;
  onDone: () => void;
}) {
  const { dictionary } = useLocale();
  const { push } = useToast();
  const router = useRouter();
  const [idempotencyKey] = useState(() => createIdempotencyKey("expense"));
  const today = new Date().toISOString().slice(0, 10);
  const [state, formAction, pending] = useActionState<ActionState | null, FormData>(
    async (prev, formData) => {
      const result = await createExpenseAction(prev, formData);
      if (result.ok) {
        push(dictionary.expenses.saved, "success");
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
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <div>
        <Label htmlFor="ecat">{dictionary.expenses.category}</Label>
        <Input id="ecat" name="category" required />
      </div>
      <div>
        <Label htmlFor="edesc">{dictionary.expenses.description}</Label>
        <Textarea id="edesc" name="description" required />
      </div>
      <div>
        <Label htmlFor="eamount">{dictionary.expenses.amount}</Label>
        <Input id="eamount" name="amountMinor" inputMode="numeric" required />
      </div>
      <div>
        <Label htmlFor="edate">{dictionary.expenses.occurredOn}</Label>
        <Input
          id="edate"
          name="occurredOn"
          type="date"
          defaultValue={today}
          required
        />
      </div>
      {state && !state.ok ? <FieldError message={state.error} /> : null}
      <Button type="submit" className="w-full" loading={pending}>
        {dictionary.common.save}
      </Button>
    </form>
  );
}

export function ExpensesView({
  merchants,
  activeMerchantId,
  expenses,
  filters,
}: {
  merchants: Merchant[];
  activeMerchantId: string;
  expenses: Expense[];
  filters: { from?: string; to?: string; category?: string };
}) {
  const { dictionary, locale } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [from, setFrom] = useState(filters.from ?? "");
  const [to, setTo] = useState(filters.to ?? "");
  const [categoryFilter, setCategoryFilter] = useState(filters.category ?? "");

  function applyFilters() {
    const params = new URLSearchParams();
    params.set("merchantId", activeMerchantId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (categoryFilter) params.set("category", categoryFilter);
    router.push(`/expenses?${params.toString()}`);
  }

  return (
    <AppShell
      titleKey="expenses.title"
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
            <Label>{dictionary.expenses.category}</Label>
            <Input
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={applyFilters}>
              {dictionary.common.filter}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{dictionary.expenses.history}</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setFormKey((k) => k + 1);
              setOpen(true);
            }}
          >
            {dictionary.expenses.record}
          </Button>
        </CardHeader>
        {expenses.length === 0 ? (
          <EmptyState title={dictionary.expenses.empty} />
        ) : (
          <DataTable
            rows={expenses}
            columns={[
              {
                key: "category",
                header: dictionary.expenses.category,
                cell: (row) => row.category,
              },
              {
                key: "description",
                header: dictionary.expenses.description,
                cell: (row) => row.description,
              },
              {
                key: "amount",
                header: dictionary.expenses.amount,
                className: "tabular-nums",
                cell: (row) => formatMoneyXof(row.amountXof, locale),
              },
              {
                key: "date",
                header: dictionary.common.date,
                cell: (row) => formatDateTime(row.occurredOn, locale),
              },
            ]}
          />
        )}
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={dictionary.expenses.record}
      >
        <ExpenseForm
          key={formKey}
          merchantId={activeMerchantId}
          onDone={() => setOpen(false)}
        />
      </Dialog>
    </AppShell>
  );
}
