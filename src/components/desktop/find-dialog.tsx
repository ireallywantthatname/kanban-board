"use client";

import { useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { Windows95SavedSearch } from "react-old-icons";
import { AppWindow } from "@/components/window/app-window";
import { boardLabel, isBoardId } from "@/lib/boards";
import { useCachedWorksAll } from "@/lib/persist";
import { desktopSearchParams } from "@/lib/url-state";
import { cn } from "@/lib/utils";
import type { WindowChrome, WindowId } from "@/lib/windows";
import { workspaceWindowId } from "@/lib/windows";
import type { Id } from "../../../convex/_generated/dataModel";

type FindWork = {
  workspaceId?: Id<"workspaces">;
  board?: "all" | "today" | "this_week" | "later";
};

function targetForWork(work: FindWork): WindowId | null {
  if (work.workspaceId) return workspaceWindowId(work.workspaceId);
  if (work.board && isBoardId(work.board)) return work.board;
  return null;
}

type FindDialogProps = WindowChrome & {
  onOpenBoard: (board: WindowId) => void;
};

export function FindDialog({
  onClose,
  onOpenBoard,
  onMinimize,
  onMaximize,
  active,
  maximized,
  onTitlePointerDown,
  onTitleDoubleClick,
}: FindDialogProps) {
  const works = useCachedWorksAll();
  const [query, setQuery] = useQueryState("q", desktopSearchParams.q);
  const [selectedId, setSelectedId] = useState<Id<"works"> | null>(null);

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
    const target = targetForWork(work);
    if (!target) return;
    onOpenBoard(target);
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
    <AppWindow
      title="Find Work"
      icon={<Windows95SavedSearch size={16} />}
      onClose={onClose}
      onMinimize={onMinimize}
      onMaximize={onMaximize}
      active={active}
      maximized={maximized}
      onTitlePointerDown={onTitlePointerDown}
      onTitleDoubleClick={onTitleDoubleClick}
      className="h-full w-full"
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
                    const target = targetForWork(work);
                    if (!target) return;
                    onOpenBoard(target);
                    onClose();
                  }}
                >
                  <span
                    className={cn(
                      "find-result-title",
                      work.done && "line-through",
                    )}
                  >
                    {work.title}
                  </span>
                  <span className="find-result-board">
                    {work.workspaceName
                      ? work.workspaceName
                      : work.board && isBoardId(work.board)
                        ? boardLabel(work.board)
                        : ""}
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
  );
}
