"use client";

import { useEffect } from "react";
import { WindowsShutDown, WindowsXPLogOff } from "react-old-icons";
import { AppWindow } from "@/components/window/app-window";
import type { WindowChrome } from "@/lib/windows";

type SessionDialogProps = WindowChrome & {
  kind: "log-off" | "shut-down";
  onConfirm: () => void;
};

export function SessionDialog({
  kind,
  onConfirm,
  onClose,
  onMinimize,
  onMaximize,
  active,
  maximized,
  onTitlePointerDown,
  onTitleDoubleClick,
}: SessionDialogProps) {
  const isLogOff = kind === "log-off";
  const Icon = isLogOff ? WindowsXPLogOff : WindowsShutDown;
  const title = isLogOff ? "Log Off" : "Shut Down Windows";
  const message = isLogOff
    ? "Are you sure you want to log off?"
    : "Shut down Kanban Board?";
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
      <div className="shell-dialog-actions">
        <button type="button" className="default" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" onClick={onClose}>
          {cancelLabel}
        </button>
      </div>
    </AppWindow>
  );
}
