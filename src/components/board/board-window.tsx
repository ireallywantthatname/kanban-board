"use client";

import { useMutation, useQuery } from "convex/react";
import { FormEvent, useState, type PointerEvent, type HTMLAttributes } from "react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BOARDS, boardLabel, type BoardId } from "@/lib/boards";
import { AppWindow } from "@/components/window/app-window";

type BoardWindowProps = HTMLAttributes<HTMLDivElement> & {
  board: BoardId;
  onClose: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  active?: boolean;
  maximized?: boolean;
  onTitlePointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
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
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const BoardIcon = BOARDS.find((b) => b.id === board)?.Icon;
  const count = works?.length;

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
      <form onSubmit={onAdd} className="field-row" style={{ marginBottom: 8 }}>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New work"
          disabled={busy}
          style={{ flex: 1 }}
        />
        <Button type="submit" disabled={busy || title.trim().length === 0}>
          Add
        </Button>
      </form>
      <div className="sunken-panel board-list">
        {works === undefined ? (
          <div className="p-1">Loading...</div>
        ) : works.length === 0 ? (
          <div className="p-1">No works.</div>
        ) : (
          <ul className="flex flex-col">
            {works.map((work) => (
              <li
                key={work._id}
                className="flex items-center gap-2 border-b border-[#dfdfdf] px-1 py-1 last:border-b-0"
              >
                <span className="flex-1 break-words">{work.title}</span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void remove({ id: work._id })}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppWindow>
  );
}
