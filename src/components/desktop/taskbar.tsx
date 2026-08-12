"use client";

import { useState } from "react";
import { WindowsTaskbarAndStartMenu } from "react-old-icons";
import { BOARDS, boardLabel, type BoardId } from "@/lib/boards";
import type { WindowFrame } from "@/lib/window-shell";
import { cn } from "@/lib/utils";
import { Clock } from "./clock";
import { StartMenu } from "./start-menu";

type TaskbarProps = {
  frames: WindowFrame[];
  activeId: BoardId | null;
  onOpenBoard: (board: BoardId) => void;
  onTaskButtonClick: (board: BoardId) => void;
};

export function Taskbar({
  frames,
  activeId,
  onOpenBoard,
  onTaskButtonClick,
}: TaskbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="taskbar">
      <div className="taskbar-start">
        <button
          type="button"
          className={cn("taskbar-start-button", menuOpen && "active")}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <WindowsTaskbarAndStartMenu size={16} />
          <span>Start</span>
        </button>
        <StartMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onOpenBoard={onOpenBoard}
        />
      </div>
      <div className="taskbar-divider" />
      <div className="taskbar-apps" aria-label="Running applications">
        {frames.map((frame) => {
          const def = BOARDS.find((b) => b.id === frame.id);
          const selected = activeId === frame.id && !frame.minimized;
          return (
            <button
              key={frame.id}
              type="button"
              className={cn("taskbar-app-button", selected && "selected")}
              onClick={() => onTaskButtonClick(frame.id)}
            >
              {def ? <def.Icon size={16} /> : null}
              <span className="taskbar-app-label">{boardLabel(frame.id)}</span>
            </button>
          );
        })}
      </div>
      <div className="taskbar-tray">
        <Clock />
      </div>
    </div>
  );
}
