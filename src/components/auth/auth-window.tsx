"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { FormEvent, useState } from "react";
import { Windows95Password } from "react-old-icons";
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
      setError(
        err instanceof Error
          ? err.message
          : flow === "signIn"
            ? "Could not sign in. Check email and password."
            : "Could not create account. Try a different email.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <AppWindow
        title="Kanban Board"
        icon={<Windows95Password size={16} />}
        statusBar={
          <p className="status-bar-field">
            {busy
              ? "Working..."
              : flow === "signIn"
                ? "Sign in to continue"
                : "Create a new account"}
          </p>
        }
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="field-row-stacked">
            <label htmlFor="email" className="select-none">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={busy}
              className="w-full"
            />
          </div>
          <div className="field-row-stacked">
            <label htmlFor="password" className="select-none">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={
                flow === "signIn" ? "current-password" : "new-password"
              }
              required
              minLength={8}
              disabled={busy}
              className="w-full"
            />
          </div>
          {error ? <div className="form-error">{error}</div> : null}
          <div className="field-row pt-1">
            <button type="submit" className="default" disabled={busy}>
              {flow === "signIn" ? "Sign in" : "Sign up"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setFlow(flow === "signIn" ? "signUp" : "signIn");
                setError(null);
              }}
            >
              {flow === "signIn" ? "Sign up" : "Sign in"}
            </button>
          </div>
        </form>
      </AppWindow>
    </div>
  );
}
