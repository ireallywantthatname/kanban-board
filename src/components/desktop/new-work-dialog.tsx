"use client";

import { useMutation } from "convex/react";
import { FormEvent, useEffect, useState } from "react";
import { Windows95Notepad } from "react-old-icons";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppWindow } from "@/components/window/app-window";
import { BOARDS, type BoardId } from "@/lib/boards";

type NewWorkDialogProps = {
  onClose: () => void;
  onCreated: (board: BoardId) => void;
};

export function NewWorkDialog({ onClose, onCreated }: NewWorkDialogProps) {
  const create = useMutation(api.works.create);
  const [title, setTitle] = useState("");
  const [board, setBoard] = useState<BoardId>("today");
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
      await create({ board, title: value });
      onCreated(board);
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
            <Label htmlFor="new-work-title">Title:</Label>
            <Input
              id="new-work-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
              className="flex-1"
            />
          </div>
          <div className="field-row shell-dialog-field">
            <Label htmlFor="new-work-board">Board:</Label>
            <select
              id="new-work-board"
              value={board}
              onChange={(e) => setBoard(e.target.value as BoardId)}
              disabled={busy}
              className="shell-dialog-select"
            >
              {BOARDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          {error ? <p className="shell-dialog-error">{error}</p> : null}
          <div className="shell-dialog-actions">
            <Button
              type="submit"
              className="default"
              disabled={busy || title.trim().length === 0}
            >
              OK
            </Button>
            <Button type="button" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      </AppWindow>
    </div>
  );
}
