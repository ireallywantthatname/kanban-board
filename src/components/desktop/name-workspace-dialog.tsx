"use client";

import { FormEvent, useEffect, useState } from "react";
import { Windows95NetworkNeighborhood } from "react-old-icons";
import { AppWindow } from "@/components/window/app-window";

type NameWorkspaceDialogProps = {
  title: string;
  message: string;
  initialName?: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
};

export function NameWorkspaceDialog({
  title,
  message,
  initialName = "",
  onClose,
  onSubmit,
}: NameWorkspaceDialogProps) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = name.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save workspace.");
      setBusy(false);
    }
  }

  return (
    <div className="shell-dialog-root" role="presentation">
      <AppWindow
        title={title}
        icon={<Windows95NetworkNeighborhood size={16} />}
        onClose={onClose}
        className="shell-dialog"
      >
        <form onSubmit={handleSubmit}>
          <div className="shell-dialog-body">
            <span className="shell-dialog-icon" aria-hidden="true">
              <Windows95NetworkNeighborhood size={32} />
            </span>
            <p className="shell-dialog-message">{message}</p>
          </div>
          <div className="field-row shell-dialog-field">
            <label htmlFor="workspace-name" className="select-none">
              Name:
            </label>
            <input
              id="workspace-name"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              className="flex-1"
            />
          </div>
          {error ? <p className="shell-dialog-error">{error}</p> : null}
          <div className="shell-dialog-actions">
            <button
              type="submit"
              className="default"
              disabled={busy || name.trim().length === 0}
            >
              OK
            </button>
            <button type="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      </AppWindow>
    </div>
  );
}