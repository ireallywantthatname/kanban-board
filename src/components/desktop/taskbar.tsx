"use client";

import { useState } from "react";
import Image from "next/image";
import { BOARDS, boardLabel, isBoardId } from "@/lib/boards";
import type { WindowFrame, WindowId } from "@/lib/window-shell";
import { cn } from "@/lib/utils";
import { Clock } from "./clock";
import { StartMenu } from "./start-menu";

type TaskbarProps = {
  frames: WindowFrame[];
  activeId: WindowId | null;
  onOpenBoard: (board: WindowId) => void;
  onTaskButtonClick: (board: WindowId) => void;
  onNewWork: () => void;
  onFind: () => void;
  onHelp: () => void;
  onLogOff: () => void;
  onShutDown: () => void;
};

export function Taskbar({
  frames,
  activeId,
  onOpenBoard,
  onTaskButtonClick,
  onNewWork,
  onFind,
  onHelp,
  onLogOff,
  onShutDown,
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
          <Image
            src="/icons/windows-start.png"
            alt=""
            width={16}
            height={16}
            unoptimized
            draggable={false}
          />
          <span>Start</span>
        </button>
        <StartMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onOpenBoard={onOpenBoard}
          onNewWork={onNewWork}
          onFind={onFind}
          onHelp={onHelp}
          onLogOff={onLogOff}
          onShutDown={onShutDown}
        />
      </div>
      <div className="taskbar-divider" />
      <div className="taskbar-apps" aria-label="Running applications">
        {frames.map((frame) => {
          const def = isBoardId(frame.id)
            ? BOARDS.find((b) => b.id === frame.id)
            : undefined;
          const selected = activeId === frame.id && !frame.minimized;
          return (
            <button
              key={frame.id}
              type="button"
              data-taskbar-window={frame.id}
              className={cn("taskbar-app-button", selected && "selected")}
              onClick={() => onTaskButtonClick(frame.id)}
            >
              {def ? <def.Icon size={16} /> : null}
              <span className="taskbar-app-label">
                {isBoardId(frame.id) ? boardLabel(frame.id) : "Workspace"}
              </span>
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
