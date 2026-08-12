"use client";

import { useConvexAuth } from "convex/react";
import { useCallback, useState } from "react";
import { AuthWindow } from "@/components/auth/auth-window";
import { DesktopIcon } from "@/components/desktop/desktop-icon";
import { Taskbar } from "@/components/desktop/taskbar";
import { ContextMenu } from "@/components/ui/context-menu";
import { WindowManager } from "@/components/window/window-manager";
import { BOARDS, type BoardId } from "@/lib/boards";
import type { WindowFrame, WindowGeom } from "@/lib/window-shell";

type MenuState = {
  x: number;
  y: number;
  target: "desktop" | BoardId;
} | null;

export function DesktopShell() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [frames, setFrames] = useState<WindowFrame[]>([]);
  const [focusOrder, setFocusOrder] = useState<BoardId[]>([]);
  const [selectedIcon, setSelectedIcon] = useState<BoardId | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);

  const activeId =
    focusOrder.filter((id) => frames.some((f) => f.id === id && !f.minimized)).at(-1) ??
    frames.filter((f) => !f.minimized).at(-1)?.id ??
    null;

  const openBoard = useCallback((board: BoardId) => {
    setFrames((prev) => {
      const existing = prev.find((f) => f.id === board);
      if (existing) {
        return prev.map((f) =>
          f.id === board ? { ...f, minimized: false } : f,
        );
      }
      return [
        ...prev,
        {
          id: board,
          minimized: false,
          maximized: false,
          geom: null,
          restoreGeom: null,
        },
      ];
    });
    setFocusOrder((prev) => [...prev.filter((b) => b !== board), board]);
    setSelectedIcon(board);
  }, []);

  const closeBoard = useCallback((board: BoardId) => {
    setFrames((prev) => prev.filter((f) => f.id !== board));
    setFocusOrder((prev) => prev.filter((b) => b !== board));
  }, []);

  const focusBoard = useCallback((board: BoardId) => {
    setFocusOrder((prev) => [...prev.filter((b) => b !== board), board]);
  }, []);

  const minimizeBoard = useCallback((board: BoardId) => {
    setFrames((prev) =>
      prev.map((f) => (f.id === board ? { ...f, minimized: true } : f)),
    );
  }, []);

  const toggleMaximize = useCallback((board: BoardId) => {
    setFrames((prev) =>
      prev.map((f) => {
        if (f.id !== board) return f;
        if (f.maximized) {
          return {
            ...f,
            maximized: false,
            geom: f.restoreGeom ?? f.geom,
            restoreGeom: null,
          };
        }
        return {
          ...f,
          maximized: true,
          restoreGeom: f.geom,
        };
      }),
    );
    setFocusOrder((prev) => [...prev.filter((b) => b !== board), board]);
  }, []);

  const onGeomChange = useCallback((board: BoardId, geom: WindowGeom) => {
    setFrames((prev) =>
      prev.map((f) =>
        f.id === board ? { ...f, geom, maximized: false } : f,
      ),
    );
  }, []);

  const onTaskButtonClick = useCallback(
    (board: BoardId) => {
      const frame = frames.find((f) => f.id === board);
      if (!frame) return;
      if (frame.minimized) {
        setFrames((prev) =>
          prev.map((f) => (f.id === board ? { ...f, minimized: false } : f)),
        );
        focusBoard(board);
        return;
      }
      if (activeId === board) {
        minimizeBoard(board);
        return;
      }
      focusBoard(board);
    },
    [activeId, focusBoard, frames, minimizeBoard],
  );

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="min-h-0 flex-1">
          <AuthWindow />
        </div>
        <div className="taskbar">
          <span style={{ fontWeight: 700, padding: "0 6px" }}>Kanban Board</span>
          <div className="flex-1" />
          <div className="taskbar-tray">
            <span className="taskbar-clock">Sign in</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div
        className="relative min-h-0 flex-1"
        onClick={() => setSelectedIcon(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY, target: "desktop" });
        }}
      >
        <div className="absolute top-2 left-2 z-[5] flex flex-col gap-2">
          {BOARDS.map((board) => (
            <DesktopIcon
              key={board.id}
              label={board.label}
              Icon={board.Icon}
              selected={selectedIcon === board.id}
              onSelect={() => setSelectedIcon(board.id)}
              onOpen={() => openBoard(board.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedIcon(board.id);
                setMenu({ x: e.clientX, y: e.clientY, target: board.id });
              }}
            />
          ))}
        </div>
        <WindowManager
          frames={frames}
          focusOrder={focusOrder}
          activeId={activeId}
          onClose={closeBoard}
          onFocus={focusBoard}
          onMinimize={minimizeBoard}
          onToggleMaximize={toggleMaximize}
          onGeomChange={onGeomChange}
        />
        {menu ? (
          <ContextMenu
            x={menu.x}
            y={menu.y}
            onClose={() => setMenu(null)}
            items={
              menu.target === "desktop"
                ? [
                    {
                      id: "about",
                      label: "About Kanban98",
                      onSelect: () => {
                        window.alert("Kanban Board — Windows 98 style");
                      },
                    },
                  ]
                : [
                    {
                      id: "open",
                      label: "Open",
                      onSelect: () => openBoard(menu.target as BoardId),
                    },
                  ]
            }
          />
        ) : null}
      </div>
      <Taskbar
        frames={frames}
        activeId={activeId}
        onOpenBoard={openBoard}
        onTaskButtonClick={onTaskButtonClick}
      />
    </div>
  );
}
