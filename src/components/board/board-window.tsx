"use client";

import { useMutation, useQuery } from "convex/react";
import {
  FormEvent,
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type HTMLAttributes,
} from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppWindow } from "@/components/window/app-window";
import { BOARDS, boardLabel, type BoardId } from "@/lib/boards";
import { cn } from "@/lib/utils";
import { isWorkDragging, startWorkDrag } from "@/lib/work-drag";
import { Windows95NetworkNeighborhood } from "react-old-icons";

const DRAG_THRESHOLD = 5;

type BoardWindowProps = HTMLAttributes<HTMLDivElement> & {
  board?: BoardId;
  workspaceId?: Id<"workspaces">;
  workspaceName?: string;
  onInvite?: () => void;
  onClose: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  active?: boolean;
  maximized?: boolean;
  onTitlePointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onTitleDoubleClick?: () => void;
};

export function BoardWindow({
  board,
  workspaceId,
  workspaceName,
  onInvite,
  onClose,
  onMinimize,
  onMaximize,
  active,
  maximized,
  onTitlePointerDown,
  onTitleDoubleClick,
  className,
  style,
  ...props
}: BoardWindowProps) {
  const isWorkspace = workspaceId !== undefined;
  const works = useQuery(
    api.works.list,
    isWorkspace ? { workspaceId } : board ? { board } : "skip",
  );
  const members = useQuery(
    api.workspaces.listMembers,
    isWorkspace ? { workspaceId } : "skip",
  );
  const create = useMutation(api.works.create);
  const remove = useMutation(api.works.remove);
  const move = useMutation(api.works.move);
  const setDone = useMutation(api.works.setDone);
  const rename = useMutation(api.works.rename);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"works"> | null>(null);
  const [editingId, setEditingId] = useState<Id<"works"> | null>(null);
  const [draft, setDraft] = useState("");
  const BoardIcon = board ? BOARDS.find((b) => b.id === board)?.Icon : undefined;
  const TitleIcon = isWorkspace ? Windows95NetworkNeighborhood : BoardIcon;
  const count = works?.length;
  const memberCount = members?.length;
  const pendingRef = useRef(false);
  const editRef = useRef<Id<"works"> | null>(null);

  const onDrop = useCallback(
    async (
      payload: { workId: Id<"works"> },
      toBoard: BoardId,
    ) => {
      try {
        await move({ id: payload.workId, board: toBoard });
      } catch {
        return;
      }
    },
    [move],
  );

  function onRowPointerDown(
    e: ReactPointerEvent<HTMLLIElement>,
    work: { _id: Id<"works">; title: string },
  ) {
    if (isWorkspace || !board) return;
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button, input, label")) return;
    if (editingId === work._id) return;
    if (isWorkDragging() || pendingRef.current) return;

    const sourceEl = e.currentTarget;
    const startX = e.clientX;
    const startY = e.clientY;
    pendingRef.current = true;

    const onMove = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
      if (dist <= DRAG_THRESHOLD) return;
      cleanupPending();
      startWorkDrag(
        {
          workId: work._id,
          fromBoard: board!,
          title: work.title,
          sourceEl,
        },
        startX,
        startY,
        { onDrop },
      );
    };

    const onUp = () => {
      cleanupPending();
    };

    function cleanupPending() {
      pendingRef.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function startEdit(work: { _id: Id<"works">; title: string }) {
    editRef.current = work._id;
    setSelectedId(work._id);
    setEditingId(work._id);
    setDraft(work.title);
  }

  function cancelEdit() {
    editRef.current = null;
    setEditingId(null);
    setDraft("");
  }

  async function saveEdit() {
    const id = editRef.current;
    if (!id) return;
    const value = draft.trim();
    editRef.current = null;
    setEditingId(null);
    setDraft("");
    if (!value) return;
    try {
      await rename({ id, title: value });
    } catch {
      return;
    }
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      if (workspaceId) {
        await create({ workspaceId, title: value });
      } else if (board) {
        await create({ board, title: value });
      }
      setTitle("");
    } finally {
      setBusy(false);
    }
  }

  const status =
    works === undefined
      ? "Loading..."
      : [
          count === 1 ? "1 item" : `${count ?? 0} items`,
          isWorkspace && memberCount !== undefined
            ? memberCount === 1
              ? "1 member"
              : `${memberCount} members`
            : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <AppWindow
      title={isWorkspace ? (workspaceName ?? "Workspace") : board ? boardLabel(board) : "Board"}
      onClose={onClose}
      onMinimize={onMinimize}
      onMaximize={onMaximize}
      active={active}
      maximized={maximized}
      icon={TitleIcon ? <TitleIcon size={16} /> : undefined}
      className={className}
      style={style}
      onTitlePointerDown={onTitlePointerDown}
      onTitleDoubleClick={onTitleDoubleClick}
      statusBar={<p className="status-bar-field">{status}</p>}
      {...props}
    >
      <form onSubmit={onAdd} className="field-row board-add-form">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New work"
          disabled={busy}
          className="flex-1"
        />
        <button
          type="submit"
          className="default"
          disabled={busy || title.trim().length === 0}
        >
          Add
        </button>
        {onInvite ? (
          <button type="button" onClick={onInvite}>
            Invite…
          </button>
        ) : null}
      </form>
      <div
        className="sunken-panel board-list"
        data-board-drop={board && !isWorkspace ? board : undefined}
      >
        {works === undefined ? (
          <div className="board-loading">Loading list...</div>
        ) : (
          <ul className="flex flex-col">
            {works.map((work) => (
              <li
                key={work._id}
                className={cn(
                  "work-row flex items-center gap-2 border-b border-[#dfdfdf] px-1 py-1 last:border-b-0",
                  selectedId === work._id && "selected",
                )}
                tabIndex={0}
                onPointerDown={(e) => {
                  setSelectedId(work._id);
                  onRowPointerDown(e, work);
                }}
                onFocus={() => setSelectedId(work._id)}
              >
                <div className="field-row">
                  <input
                    id={`work-done-${work._id}`}
                    type="checkbox"
                    checked={work.done === true}
                    onChange={(e) => {
                      void setDone({ id: work._id, done: e.target.checked });
                    }}
                  />
                  <label htmlFor={`work-done-${work._id}`}>&nbsp;</label>
                </div>
                {editingId === work._id ? (
                  <input
                    type="text"
                    value={draft}
                    autoFocus
                    className="flex-1"
                    onChange={(e) => setDraft(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    onBlur={() => void saveEdit()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void saveEdit();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelEdit();
                      }
                    }}
                  />
                ) : (
                  <span
                    className={cn(
                      "flex-1 break-words",
                      work.done && "line-through",
                    )}
                  >
                    {work.title}
                  </span>
                )}
                <button
                  type="button"
                  className="min-h-0 min-w-0 h-6 px-2"
                  disabled={editingId === work._id}
                  onClick={() => startEdit(work)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="min-h-0 min-w-0 h-6 px-2"
                  onClick={() => void remove({ id: work._id })}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppWindow>
  );
}
