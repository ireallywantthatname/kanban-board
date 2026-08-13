"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Windows95Help,
  Windows95Inbox,
  Windows95NetworkNeighborhood,
  Windows95Notepad,
  Windows95SavedSearch,
  WindowsShutDown,
  WindowsXPLogOff,
  WindowsXPUsers,
} from "react-old-icons";
import type { Id } from "../../../convex/_generated/dataModel";
import { BOARDS } from "@/lib/boards";
import type { WindowFrame, WindowId } from "@/lib/window-shell";
import { playSound } from "@/lib/sound";
import { parseWindowId, windowTitle } from "@/lib/windows";
import { cn } from "@/lib/utils";
import { Clock } from "./clock";
import { StartMenu } from "./start-menu";

type TaskbarProps = {
  frames: WindowFrame[];
  activeId: WindowId | null;
  workspaces?: { _id: Id<"workspaces">; name: string }[];
  onOpenBoard: (board: WindowId) => void;
  onTaskButtonClick: (board: WindowId) => void;
};

function TaskbarIcon({ id }: { id: WindowId }) {
  const parsed = parseWindowId(id);
  switch (parsed?.kind) {
    case "board": {
      const Icon = BOARDS.find((b) => b.id === parsed.board)?.Icon;
      return Icon ? <Icon size={16} /> : null;
    }
    case "workspace":
    case "new-workspace":
    case "rename-workspace":
    case "delete-workspace":
    case "leave-workspace":
      return <Windows95NetworkNeighborhood size={16} />;
    case "find":
      return <Windows95SavedSearch size={16} />;
    case "new-work":
      return <Windows95Notepad size={16} />;
    case "help":
      return <Windows95Help size={16} />;
    case "invitations":
      return <Windows95Inbox size={16} />;
    case "invite":
      return <WindowsXPUsers size={16} />;
    case "log-off":
      return <WindowsXPLogOff size={16} />;
    case "shut-down":
      return <WindowsShutDown size={16} />;
    default:
      return <Windows95Notepad size={16} />;
  }
}

export function Taskbar({
  frames,
  activeId,
  workspaces = [],
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
          onClick={() =>
            setMenuOpen((v) => {
              const next = !v;
              if (next) playSound("MenuPopup");
              return next;
            })
          }
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
          workspaces={workspaces}
        />
      </div>
      <div className="taskbar-divider" />
      <div className="taskbar-apps" aria-label="Running applications">
        {frames.map((frame) => {
          const selected = activeId === frame.id && !frame.minimized;
          return (
            <button
              key={frame.id}
              type="button"
              data-taskbar-window={frame.id}
              className={cn("taskbar-app-button", selected && "selected")}
              onClick={() => onTaskButtonClick(frame.id)}
            >
              <TaskbarIcon id={frame.id} />
              <span className="taskbar-app-label">
                {windowTitle(frame.id, workspaces)}
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
