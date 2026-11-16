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
import { useToast } from "@/components/ui/toast";
import type { Customer, Merchant } from "@/data/types";
import { formatMoneyXof } from "@/lib/format";
import { createIdempotencyKey } from "@/lib/idempotency-client";
import { useLocale } from "@/lib/i18n/locale-context";
import {
  createCustomerAction,
  recordRepaymentAction,
  type ActionState,
} from "@/server/actions/bookkeeping";

function CreateCustomerForm({
  merchantId,
  onDone,
}: {
  merchantId: string;
  onDone: () => void;
}) {
  const { dictionary } = useLocale();
  const { push } = useToast();
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState | null, FormData>(
    async (prev, formData) => {
      const result = await createCustomerAction(prev, formData);
      if (result.ok) {
        push(dictionary.customers.saved, "success");
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
      <div>
        <Label htmlFor="cname">{dictionary.products.name}</Label>
        <Input id="cname" name="name" required />
      </div>
      <div>
        <Label htmlFor="cphone">{dictionary.customers.phone}</Label>
        <Input id="cphone" name="phone" />
      </div>
      {state && !state.ok ? <FieldError message={state.error} /> : null}
      <Button type="submit" className="w-full" loading={pending}>
        {dictionary.common.save}
      </Button>
    </form>
  );
}

function RepayForm({
  merchantId,
  customer,
  onDone,
}: {
  merchantId: string;
  customer: Customer;
  onDone: () => void;
}) {
  const { dictionary, locale } = useLocale();
  const { push } = useToast();
  const router = useRouter();
  const [amount, setAmount] = useState(String(customer.balanceOwedXof));
  const [idempotencyKey] = useState(() => createIdempotencyKey("repay"));
  const [state, formAction, pending] = useActionState<ActionState | null, FormData>(
    async (prev, formData) => {
      const result = await recordRepaymentAction(prev, formData);
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
      <input type="hidden" name="customerId" value={customer.id} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <p className="text-sm text-muted-foreground">
        {customer.name} — {formatMoneyXof(customer.balanceOwedXof, locale)}
      </p>
      <div>
        <Label htmlFor="ramount">{dictionary.common.amount}</Label>
        <Input
          id="ramount"
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

export function CustomersView({
  merchants,
  activeMerchantId,
  customers,
}: {
  merchants: Merchant[];
  activeMerchantId: string;
  customers: Customer[];
}) {
  const { dictionary, locale } = useLocale();
  const [addOpen, setAddOpen] = useState(false);
  const [addKey, setAddKey] = useState(0);
  const [repayCustomer, setRepayCustomer] = useState<Customer | null>(null);
  const [repayKey, setRepayKey] = useState(0);

  return (
    <AppShell
      titleKey="customers.title"
      merchants={merchants}
      activeMerchantId={activeMerchantId}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{dictionary.customers.title}</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setAddKey((k) => k + 1);
              setAddOpen(true);
            }}
          >
            {dictionary.customers.add}
          </Button>
        </CardHeader>
        {customers.length === 0 ? (
          <EmptyState title={dictionary.customers.empty} />
        ) : (
          <DataTable
            rows={customers}
            columns={[
              {
                key: "name",
                header: dictionary.products.name,
                cell: (row) => row.name,
              },
              {
                key: "phone",
                header: dictionary.customers.phone,
                cell: (row) => row.phone || "—",
              },
              {
                key: "owed",
                header: dictionary.customers.owed,
                className: "tabular-nums",
                cell: (row) =>
                  row.balanceOwedXof > 0 ? (
                    <span className="font-medium text-navy">
                      {formatMoneyXof(row.balanceOwedXof, locale)}
                    </span>
                  ) : (
                    <Badge tone="success">{dictionary.customers.noneOwed}</Badge>
                  ),
              },
              {
                key: "actions",
                header: dictionary.common.actions,
                cell: (row) =>
                  row.balanceOwedXof > 0 ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setRepayKey((k) => k + 1);
                        setRepayCustomer(row);
                      }}
                    >
                      {dictionary.customers.repay}
                    </Button>
                  ) : (
                    "—"
                  ),
              },
            ]}
          />
        )}
      </Card>

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={dictionary.customers.add}
      >
        <CreateCustomerForm
          key={addKey}
          merchantId={activeMerchantId}
          onDone={() => setAddOpen(false)}
        />
      </Dialog>

      <Dialog
        open={Boolean(repayCustomer)}
        onClose={() => setRepayCustomer(null)}
        title={dictionary.customers.repayTitle}
      >
        {repayCustomer ? (
          <RepayForm
            key={repayKey}
            merchantId={activeMerchantId}
            customer={repayCustomer}
            onDone={() => setRepayCustomer(null)}
          />
        ) : null}
      </Dialog>
    </AppShell>
  );
}
