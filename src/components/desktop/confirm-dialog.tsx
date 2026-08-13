"use client";

import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import type { OldIconProps } from "react-old-icons";
import { AppWindow } from "@/components/window/app-window";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  Icon: ComponentType<OldIconProps>;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  Icon,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete.");
      setBusy(false);
    }
  }

  return (
    <div className="shell-dialog-root" role="presentation">
      <AppWindow
        title={title}
        icon={<Icon size={16} />}
        onClose={onClose}
        className="shell-dialog shell-dialog-session"
      >
        <div className="shell-dialog-body">
          <span className="shell-dialog-icon" aria-hidden="true">
            <Icon size={32} />
          </span>
          <p className="shell-dialog-message">{message}</p>
        </div>
        {error ? <p className="shell-dialog-error">{error}</p> : null}
        <div className="shell-dialog-actions">
          <button
            type="button"
            className="default"
            onClick={() => void handleConfirm()}
            disabled={busy}
          >
            {confirmLabel}
          </button>
          <button type="button" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
        </div>
      </AppWindow>
    </div>
  );
}