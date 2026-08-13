"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { FormEvent, useState } from "react";
import { Windows95Password, WindowsXPUsers } from "react-old-icons";
import { AppWindow } from "@/components/window/app-window";
import { playSound } from "@/lib/sound";

export function AuthWindow() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isSignIn = flow === "signIn";
  const Icon = isSignIn ? Windows95Password : WindowsXPUsers;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const formData = new FormData(e.currentTarget);
    formData.set("flow", flow);
    try {
      await signIn("password", formData);
    } catch (err) {
      playSound("SystemExclamation");
      const raw = err instanceof Error ? err.message : "";
      setError(
        raw && !raw.includes("CONVEX") && raw.length < 80
          ? raw
          : isSignIn
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
        title={isSignIn ? "Enter Network Password" : "Add User"}
        icon={<Icon size={16} />}
        className="auth-window"
      >
        <form onSubmit={onSubmit}>
          <div className="shell-dialog-body">
            <span className="shell-dialog-icon" aria-hidden="true">
              <Icon size={32} />
            </span>
            <p className="shell-dialog-message">
              {isSignIn
                ? "Type your email and password to log on to Kanban Board."
                : "Type an email and password to add a new user."}
            </p>
          </div>
          <div className="field-row shell-dialog-field">
            <label htmlFor="email" className="select-none">
              Email:
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              disabled={busy}
              className="flex-1"
            />
          </div>
          <div className="field-row shell-dialog-field">
            <label htmlFor="password" className="select-none">
              Password:
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignIn ? "current-password" : "new-password"}
              required
              minLength={8}
              disabled={busy}
              className="flex-1"
            />
          </div>
          {error ? <p className="shell-dialog-error">{error}</p> : null}
          <div className="shell-dialog-actions">
            <button type="submit" className="default" disabled={busy}>
              OK
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setFlow(isSignIn ? "signUp" : "signIn");
                setError(null);
              }}
            >
              {isSignIn ? "New User..." : "Cancel"}
            </button>
          </div>
        </form>
      </AppWindow>
    </div>
  );
}
