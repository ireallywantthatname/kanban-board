"use client";

import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import type { OldIconProps } from "react-old-icons";
import { AppWindow } from "@/components/window/app-window";
import { playSound } from "@/lib/sound";
import type { WindowChrome } from "@/lib/windows";

type ConfirmDialogProps = WindowChrome & {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  Icon: ComponentType<OldIconProps>;
  onConfirm: () => Promise<void> | void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  Icon,
  onConfirm,
  onClose,
  onMinimize,
  onMaximize,
  active,
  maximized,
  onTitlePointerDown,
  onTitleDoubleClick,
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
      playSound("SystemExclamation");
      setError(err instanceof Error ? err.message : "Could not complete.");
      setBusy(false);
    }
  }

  return (
    <AppWindow
      title={title}
      icon={<Icon size={16} />}
      onClose={onClose}
      onMinimize={onMinimize}
      onMaximize={onMaximize}
      active={active}
      maximized={maximized}
      onTitlePointerDown={onTitlePointerDown}
      onTitleDoubleClick={onTitleDoubleClick}
      className="h-full w-full"
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
  );
}
