"use client";

import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { Windows95SavedSearch } from "react-old-icons";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppWindow } from "@/components/window/app-window";
import { boardLabel, type BoardId } from "@/lib/boards";
import { cn } from "@/lib/utils";

type FindDialogProps = {
  onClose: () => void;
  onOpenBoard: (board: BoardId) => void;
};

export function FindDialog({ onClose, onOpenBoard }: FindDialogProps) {
  const works = useQuery(api.works.listAll);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<Id<"works"> | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const filtered = useMemo(() => {
    if (works === undefined) return undefined;
    const q = query.trim().toLowerCase();
    if (!q) return works;
    return works.filter((w) => w.title.toLowerCase().includes(q));
  }, [works, query]);

  useEffect(() => {
    if (!filtered || filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((w) => w._id === selectedId)) {
      setSelectedId(filtered[0]._id);
    }
  }, [filtered, selectedId]);

  function openSelected() {
    if (!filtered || !selectedId) return;
    const work = filtered.find((w) => w._id === selectedId);
    if (!work) return;
    onOpenBoard(work.board as BoardId);
    onClose();
  }

  const count = filtered?.length;
  const status =
    works === undefined
      ? "Loading..."
      : count === 1
        ? "1 item"
        : `${count ?? 0} items`;

  return (
    <div className="shell-dialog-root" role="presentation">
      <AppWindow
        title="Find Work"
        icon={<Windows95SavedSearch size={16} />}
        onClose={onClose}
        className="shell-dialog shell-dialog-find"
        statusBar={<p className="status-bar-field">{status}</p>}
      >
        <div className="field-row shell-dialog-field">
          <label htmlFor="find-work-query" className="select-none">
            Find:
          </label>
          <input
            id="find-work-query"
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
        </div>
        <div className="sunken-panel find-dialog-results">
          {filtered === undefined ? (
            <div className="board-loading">Searching...</div>
          ) : works !== undefined && works.length === 0 ? (
            <div className="board-empty">
              <div>No works yet.</div>
              <div className="board-empty-hint">
                Create one with Start → New Work…
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="board-empty">
              <div>No matches.</div>
              <div className="board-empty-hint">Try a different title.</div>
            </div>
          ) : (
            <ul className="flex flex-col">
              {filtered.map((work) => (
                <li key={work._id}>
                  <button
                    type="button"
                    className={cn(
                      "find-result-row",
                      selectedId === work._id && "selected",
                    )}
                    onClick={() => setSelectedId(work._id)}
                    onDoubleClick={() => {
                      onOpenBoard(work.board as BoardId);
                      onClose();
                    }}
                  >
                    <span className="find-result-title">{work.title}</span>
                    <span className="find-result-board">
                      {boardLabel(work.board as BoardId)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="shell-dialog-actions">
          <button
            type="button"
            className="default"
            disabled={!selectedId}
            onClick={openSelected}
          >
            Open
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </AppWindow>
    </div>
  );
}
