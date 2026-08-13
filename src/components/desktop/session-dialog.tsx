"use client";

import { useEffect } from "react";
import { WindowsShutDown, WindowsXPLogOff } from "react-old-icons";
import { Button } from "@/components/ui/button";
import { AppWindow } from "@/components/window/app-window";

type SessionDialogProps = {
  kind: "log-off" | "shut-down";
  onConfirm: () => void;
  onClose: () => void;
};

export function SessionDialog({ kind, onConfirm, onClose }: SessionDialogProps) {
  const isLogOff = kind === "log-off";
  const Icon = isLogOff ? WindowsXPLogOff : WindowsShutDown;
  const title = isLogOff ? "Log Off" : "Shut Down Windows";
  const message = isLogOff
    ? "Are you sure you want to log off?"
    : "Shut down Kanban Board? All windows will close.";
  const confirmLabel = isLogOff ? "Yes" : "OK";
  const cancelLabel = isLogOff ? "No" : "Cancel";

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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
        <div className="shell-dialog-actions">
          <Button type="button" className="default" onClick={onConfirm}>
            {confirmLabel}
          </Button>
          <Button type="button" onClick={onClose}>
            {cancelLabel}
          </Button>
        </div>
      </AppWindow>
    </div>
  );
}
