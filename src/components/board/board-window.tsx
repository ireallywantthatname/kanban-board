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

const DRAG_THRESHOLD = 5;

type BoardWindowProps = HTMLAttributes<HTMLDivElement> & {
  board: BoardId;
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
  const works = useQuery(api.works.list, { board });
  const create = useMutation(api.works.create);
  const remove = useMutation(api.works.remove);
  const move = useMutation(api.works.move);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"works"> | null>(null);
  const BoardIcon = BOARDS.find((b) => b.id === board)?.Icon;
  const count = works?.length;
  const pendingRef = useRef(false);

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
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
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
          fromBoard: board,
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

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      await create({ board, title: value });
      setTitle("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppWindow
      title={boardLabel(board)}
      onClose={onClose}
      onMinimize={onMinimize}
      onMaximize={onMaximize}
      active={active}
      maximized={maximized}
      icon={BoardIcon ? <BoardIcon size={16} /> : undefined}
      className={className}
      style={style}
      onTitlePointerDown={onTitlePointerDown}
      onTitleDoubleClick={onTitleDoubleClick}
      statusBar={
        <p className="status-bar-field">
          {works === undefined
            ? "Loading..."
            : count === 1
              ? "1 item"
              : `${count ?? 0} items`}
        </p>
      }
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
      </form>
      <div className="sunken-panel board-list" data-board-drop={board}>
        {works === undefined ? (
          <div className="board-loading">Loading list...</div>
        ) : works.length === 0 ? (
          <div className="board-empty">
            {BoardIcon ? <BoardIcon size={32} /> : null}
            <div>This list is empty.</div>
            <div className="board-empty-hint">
              Type a title above and press Add.
            </div>
          </div>
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
                <span className="flex-1 break-words">{work.title}</span>
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
