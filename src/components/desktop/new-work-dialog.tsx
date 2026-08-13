"use client";

import { useMutation, useQuery } from "convex/react";
import { FormEvent, useEffect, useState } from "react";
import { Windows95Notepad } from "react-old-icons";
import { api } from "../../../convex/_generated/api";
import { AppWindow } from "@/components/window/app-window";
import { BOARDS, isBoardId } from "@/lib/boards";
import type { WindowId } from "@/lib/window-shell";
import { parseWindowId, workspaceWindowId } from "@/lib/windows";

type NewWorkDialogProps = {
  onClose: () => void;
  onCreated: (id: WindowId) => void;
};

export function NewWorkDialog({ onClose, onCreated }: NewWorkDialogProps) {
  const create = useMutation(api.works.create);
  const workspaces = useQuery(api.workspaces.listMine);
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState<WindowId>("today");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    try {
      const parsed = parseWindowId(destination);
      if (parsed?.kind === "workspace") {
        await create({ workspaceId: parsed.workspaceId, title: value });
      } else if (isBoardId(destination)) {
        await create({ board: destination, title: value });
      } else {
        throw new Error("Could not create work.");
      }
      onCreated(destination);
    } catch {
      setError("Could not create work.");
      setBusy(false);
    }
  }

  return (
    <div className="shell-dialog-root" role="presentation">
      <AppWindow
        title="New Work"
        icon={<Windows95Notepad size={16} />}
        onClose={onClose}
        className="shell-dialog shell-dialog-new-work"
      >
        <form onSubmit={onSubmit}>
          <div className="shell-dialog-body">
            <span className="shell-dialog-icon" aria-hidden="true">
              <Windows95Notepad size={32} />
            </span>
            <p className="shell-dialog-message">
              Type a title and choose a board.
            </p>
          </div>
          <div className="field-row shell-dialog-field">
            <label htmlFor="new-work-title" className="select-none">
              Title:
            </label>
            <input
              id="new-work-title"
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
              className="flex-1"
            />
          </div>
          <div className="field-row shell-dialog-field">
            <label htmlFor="new-work-board" className="select-none">
              Board:
            </label>
            <select
              id="new-work-board"
              value={destination}
              onChange={(e) => setDestination(e.target.value as WindowId)}
              disabled={busy}
              className="shell-dialog-select"
            >
              <optgroup label="Personal">
                {BOARDS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </optgroup>
              {workspaces && workspaces.length > 0 ? (
                <optgroup label="Workspaces">
                  {workspaces.map((workspace) => (
                    <option
                      key={workspace._id}
                      value={workspaceWindowId(workspace._id)}
                    >
                      {workspace.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </div>
          {error ? <p className="shell-dialog-error">{error}</p> : null}
          <div className="shell-dialog-actions">
            <button
              type="submit"
              className="default"
              disabled={busy || title.trim().length === 0}
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
