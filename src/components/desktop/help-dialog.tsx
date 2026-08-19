"use client";

import { Windows95Help } from "react-old-icons";
import { AppWindow } from "@/components/window/app-window";
import type { WindowChrome } from "@/lib/windows";

export function HelpDialog({
  onClose,
  onMinimize,
  onMaximize,
  active,
  maximized,
  onTitlePointerDown,
  onTitleDoubleClick,
}: WindowChrome) {
  return (
    <AppWindow
      title="Kanban Help"
      icon={<Windows95Help size={16} />}
      onClose={onClose}
      onMinimize={onMinimize}
      onMaximize={onMaximize}
      active={active}
      maximized={maximized}
      onTitlePointerDown={onTitlePointerDown}
      onTitleDoubleClick={onTitleDoubleClick}
      className="h-full w-full"
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
          <li>Log Off signs out of your account.</li>
          <li>
            Shut Down turns off the desktop. Click the screen to start again.
          </li>
        </ul>
      </div>
      <div className="shell-dialog-actions">
        <button type="button" className="default" onClick={onClose}>
          OK
        </button>
      </div>
    </AppWindow>
  );
}
