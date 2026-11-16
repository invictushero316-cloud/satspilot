"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  registerAction,
  type ActionResult,
} from "@/server/actions/auth";

const initial: ActionResult | null = null;

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required disabled={pending} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          At least 10 characters, including a letter and a number.
        </p>
      </div>
      {state && !state.ok ? (
        <div className="animate-fade-in">
          <FieldError message={state.error} />
        </div>
      ) : null}
      <Button type="submit" className="w-full" loading={pending}>
        {pending ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
