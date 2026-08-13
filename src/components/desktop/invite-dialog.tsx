"use client";

import { useMutation, useQuery } from "convex/react";
import { FormEvent, useEffect, useState } from "react";
import { WindowsXPUsers } from "react-old-icons";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppWindow } from "@/components/window/app-window";

type InviteDialogProps = {
  workspaceId: Id<"workspaces">;
  isOwner: boolean;
  onClose: () => void;
};

export function InviteDialog({
  workspaceId,
  isOwner,
  onClose,
}: InviteDialogProps) {
  const me = useQuery(api.users.current);
  const members = useQuery(api.workspaces.listMembers, { workspaceId });
  const invites = useQuery(api.invites.listForWorkspace, { workspaceId });
  const invite = useMutation(api.invites.invite);
  const revoke = useMutation(api.invites.revoke);
  const removeMember = useMutation(api.workspaces.removeMember);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    try {
      await invite({ workspaceId, email: value });
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not invite.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell-dialog-root" role="presentation">
      <AppWindow
        title="Invite Users"
        icon={<WindowsXPUsers size={16} />}
        onClose={onClose}
        className="shell-dialog shell-dialog-invite"
      >
        <form onSubmit={onInvite}>
          <div className="field-row shell-dialog-field">
            <label htmlFor="invite-email" className="select-none">
              Email:
            </label>
            <input
              id="invite-email"
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="flex-1"
            />
            <button
              type="submit"
              className="default"
              disabled={busy || email.trim().length === 0}
            >
              Add
            </button>
          </div>
        </form>
        {error ? <p className="shell-dialog-error">{error}</p> : null}
        <p className="invite-section-label">Members</p>
        <div className="sunken-panel invite-list">
          {members === undefined ? (
            <div className="board-loading">Loading...</div>
          ) : members.length === 0 ? (
            <div className="board-empty">No members.</div>
          ) : (
            <ul className="flex flex-col">
              {members.map((member) => (
                <li key={member._id} className="invite-row">
                  <span className="invite-row-name">
                    {member.name || member.email || "Member"}
                  </span>
                  <span className="invite-row-role">
                    {member.role === "owner" ? "Owner" : "Member"}
                  </span>
                  {isOwner && member.role !== "owner" ? (
                    <button
                      type="button"
                      className="min-h-0 min-w-0 h-6 px-2"
                      disabled={busy}
                      onClick={() =>
                        void removeMember({
                          workspaceId,
                          userId: member.userId,
                        })
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="invite-section-label">Pending</p>
        <div className="sunken-panel invite-list">
          {invites === undefined ? (
            <div className="board-loading">Loading...</div>
          ) : invites.length === 0 ? (
            <div className="board-empty">No pending invites.</div>
          ) : (
            <ul className="flex flex-col">
              {invites.map((row) => (
                <li key={row._id} className="invite-row">
                  <span className="invite-row-name">{row.email}</span>
                  {isOwner || row.invitedBy === me?._id ? (
                    <button
                      type="button"
                      className="min-h-0 min-w-0 h-6 px-2"
                      disabled={busy}
                      onClick={() => void revoke({ inviteId: row._id })}
                    >
                      Revoke
                    </button>
                  ) : null}
                </li>
              ))}
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