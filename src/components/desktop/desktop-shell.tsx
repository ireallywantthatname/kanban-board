"use client";

import { useConvexAuth } from "convex/react";
import { useCallback, useState } from "react";
import { AuthWindow } from "@/components/auth/auth-window";
import { DesktopIcon } from "@/components/desktop/desktop-icon";
import { Taskbar } from "@/components/desktop/taskbar";
import { WindowManager } from "@/components/window/window-manager";
import { BOARDS, type BoardId } from "@/lib/boards";

export function DesktopShell() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [openBoards, setOpenBoards] = useState<BoardId[]>([]);

  const openBoard = useCallback((board: BoardId) => {
    setOpenBoards((prev) => (prev.includes(board) ? prev : [...prev, board]));
  }, []);

  const closeBoard = useCallback((board: BoardId) => {
    setOpenBoards((prev) => prev.filter((b) => b !== board));
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#3a6ea5] text-white">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-full w-full flex-col bg-[#3a6ea5]">
        <div className="min-h-0 flex-1">
          <AuthWindow />
        </div>
        <div className="win-raised flex h-10 shrink-0 items-center px-2">
          <span className="font-bold">Kanban Board</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#3a6ea5]">
      <div className="relative min-h-0 flex-1">
        <div className="absolute top-2 left-2 z-[5] flex flex-col gap-3">
          {BOARDS.map((board) => (
            <DesktopIcon
              key={board.id}
              label={board.label}
              Icon={board.Icon}
              onOpen={() => openBoard(board.id)}
            />
          ))}
        </div>
        <WindowManager openBoards={openBoards} onClose={closeBoard} />
      </div>
      <Taskbar />
    </div>
  );
}
