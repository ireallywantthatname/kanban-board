"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppWindow } from "@/components/window/app-window";

export function AuthWindow() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const formData = new FormData(e.currentTarget);
    formData.set("flow", flow);
    try {
      await signIn("password", formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <AppWindow title="Kanban Board">
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={busy}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  flow === "signIn" ? "current-password" : "new-password"
                }
                required
                minLength={8}
                disabled={busy}
              />
            </div>
            {error ? <div className="text-[#800000]">{error}</div> : null}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="submit" disabled={busy}>
                {flow === "signIn" ? "Sign in" : "Sign up"}
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => {
                  setFlow(flow === "signIn" ? "signUp" : "signIn");
                  setError(null);
                }}
              >
                {flow === "signIn" ? "Sign up" : "Sign in"}
              </Button>
            </div>
          </form>
        </AppWindow>
      </div>
    </div>
  );
}
