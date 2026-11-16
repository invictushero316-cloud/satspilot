"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  createMerchantAction,
  type MerchantActionResult,
} from "@/server/actions/merchant";

const initial: MerchantActionResult | null = null;

export function CreateMerchantForm() {
  const [state, formAction, pending] = useActionState(
    createMerchantAction,
    initial,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Business name</Label>
        <Input id="name" name="name" required disabled={pending} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" disabled={pending} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" disabled={pending} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="locale">Language</Label>
        <Select id="locale" name="locale" defaultValue="en" disabled={pending}>
          <option value="en">English</option>
          <option value="fr">Français</option>
        </Select>
      </div>
      <input type="hidden" name="displayCurrency" value="XOF" />
      {state && !state.ok ? <FieldError message={state.error} /> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Create merchant profile"}
      </Button>
    </form>
  );
}
