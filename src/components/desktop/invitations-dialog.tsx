"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Windows95Inbox } from "react-old-icons";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppWindow } from "@/components/window/app-window";

type InvitationsDialogProps = {
  onClose: () => void;
  onAccepted: (workspaceId: Id<"workspaces">) => void;
};

export function InvitationsDialog({
  onClose,
  onAccepted,
}: InvitationsDialogProps) {
  const pending = useQuery(api.invites.listPending);
  const accept = useMutation(api.invites.accept);
  const decline = useMutation(api.invites.decline);
  const [busyId, setBusyId] = useState<Id<"workspaceInvites"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function onAccept(inviteId: Id<"workspaceInvites">) {
    if (busyId) return;
    setBusyId(inviteId);
    setError(null);
    try {
      const workspaceId = await accept({ inviteId });
      onAccepted(workspaceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept.");
      setBusyId(null);
    }
  }

  async function onDecline(inviteId: Id<"workspaceInvites">) {
    if (busyId) return;
    setBusyId(inviteId);
    setError(null);
    try {
      await decline({ inviteId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not decline.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="shell-dialog-root" role="presentation">
      <AppWindow
        title="Invitations"
        icon={<Windows95Inbox size={16} />}
        onClose={onClose}
        className="shell-dialog shell-dialog-invite"
        statusBar={
          <p className="status-bar-field">
            {pending === undefined
              ? "Loading..."
              : pending.length === 1
                ? "1 invitation"
                : `${pending.length} invitations`}
          </p>
        }
      >
        {error ? <p className="shell-dialog-error">{error}</p> : null}
        <div className="sunken-panel invite-list invite-list-tall">
          {pending === undefined ? (
            <div className="board-loading">Loading...</div>
          ) : pending.length === 0 ? (
            <div className="board-empty">
              <div>No invitations.</div>
              <div className="board-empty-hint">
                When someone invites you, it will show up here.
              </div>
            </div>
          ) : (
            <ul className="flex flex-col">
              {pending.map((row) => {
                const from = row.invitedByName || row.invitedByEmail || "Someone";
                return (
                  <li key={row._id} className="invite-row">
                    <span className="invite-row-name">
                      {from} invited you to {row.workspaceName}.
                    </span>
                    <button
                      type="button"
                      className="default min-h-0 min-w-0 h-6 px-2"
                      disabled={busyId !== null}
                      onClick={() => void onAccept(row._id)}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="min-h-0 min-w-0 h-6 px-2"
                      disabled={busyId !== null}
                      onClick={() => void onDecline(row._id)}
                    >
                      Decline
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="shell-dialog-actions">
          <button type="button" className="default" onClick={onClose}>
            Close
          </button>
        </div>
      </AppWindow>
    </div>
  );
}