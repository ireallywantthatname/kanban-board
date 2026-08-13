"use client";

import { useEffect } from "react";
import { Windows95Help } from "react-old-icons";
import { AppWindow } from "@/components/window/app-window";

type HelpDialogProps = {
  onClose: () => void;
};

export function HelpDialog({ onClose }: HelpDialogProps) {
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
        title="Kanban Help"
        icon={<Windows95Help size={16} />}
        onClose={onClose}
        className="shell-dialog shell-dialog-help"
      >
        <div className="shell-dialog-body shell-dialog-body-stacked">
          <span className="shell-dialog-icon" aria-hidden="true">
            <Windows95Help size={32} />
          </span>
          <ul className="help-dialog-list">
            <li>Double-click a desktop icon to open a board or workspace.</li>
            <li>Drag works between personal board windows to move them.</li>
            <li>Use Start → Workspaces to create or open a shared board.</li>
            <li>Invite others by email from a workspace window or icon.</li>
            <li>Start → Invitations… opens invites sent to your email.</li>
            <li>Use Start → New Work… or Find… to create or search works.</li>
            <li>Log Off or Shut Down ends your session.</li>
          </ul>
        </div>
        <div className="shell-dialog-actions">
          <button type="button" className="default" onClick={onClose}>
            OK
          </button>
        </div>
      </AppWindow>
    </div>
  );
}
