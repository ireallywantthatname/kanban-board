"use client";

import { useConvexAuth } from "convex/react";
import { useCallback, useRef, useState } from "react";
import { AuthWindow } from "@/components/auth/auth-window";
import { DesktopIcon } from "@/components/desktop/desktop-icon";
import { Taskbar } from "@/components/desktop/taskbar";
import { ContextMenu } from "@/components/ui/context-menu";
import { WindowManager } from "@/components/window/window-manager";
import {
  animateTitlebar,
  rectFromElement,
  taskbarButtonEl,
  titlebarIconHtml,
  waitFrames,
  windowTitlebarEl,
} from "@/lib/animate-titlebar";
import { BOARDS, boardLabel, type BoardId } from "@/lib/boards";
import type { WindowFrame, WindowGeom } from "@/lib/window-shell";

type MenuState = {
  x: number;
  y: number;
  board: BoardId;
} | null;

export function DesktopShell() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [frames, setFrames] = useState<WindowFrame[]>([]);
  const [focusOrder, setFocusOrder] = useState<BoardId[]>([]);
  const [selectedIcon, setSelectedIcon] = useState<BoardId | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [restoringIds, setRestoringIds] = useState<Set<BoardId>>(() => new Set());
  const animatingRef = useRef<Set<BoardId>>(new Set());

  const activeId =
    focusOrder.filter((id) => frames.some((f) => f.id === id && !f.minimized)).at(-1) ??
    frames.filter((f) => !f.minimized).at(-1)?.id ??
    null;

  const setMinimized = useCallback((board: BoardId, minimized: boolean) => {
    setFrames((prev) =>
      prev.map((f) => (f.id === board ? { ...f, minimized } : f)),
    );
  }, []);

  const focusBoard = useCallback((board: BoardId) => {
    setFocusOrder((prev) => [...prev.filter((b) => b !== board), board]);
  }, []);

  const minimizeBoard = useCallback(
    async (board: BoardId) => {
      if (animatingRef.current.has(board)) return;
      const frame = frames.find((f) => f.id === board);
      if (!frame || frame.minimized) return;

      animatingRef.current.add(board);
      try {
        const from = rectFromElement(windowTitlebarEl(board));
        const to = rectFromElement(taskbarButtonEl(board));
        if (from && to) {
          await animateTitlebar(from, to, {
            title: boardLabel(board),
            iconHtml: titlebarIconHtml(board),
            active: activeId === board,
          });
        }
        setMinimized(board, true);
      } finally {
        animatingRef.current.delete(board);
      }
    },
    [activeId, frames, setMinimized],
  );

  const restoreBoard = useCallback(
    async (board: BoardId) => {
      if (animatingRef.current.has(board)) return;
      const frame = frames.find((f) => f.id === board);
      if (!frame || !frame.minimized) {
        focusBoard(board);
        return;
      }

      animatingRef.current.add(board);
      const from = rectFromElement(taskbarButtonEl(board));

      setRestoringIds((prev) => new Set(prev).add(board));
      setMinimized(board, false);
      focusBoard(board);

      try {
        let to = null as ReturnType<typeof rectFromElement>;
        for (let i = 0; i < 12 && !to; i++) {
          await waitFrames(1);
          to = rectFromElement(windowTitlebarEl(board));
        }
        if (from && to) {
          await animateTitlebar(from, to, {
            title: boardLabel(board),
            iconHtml: titlebarIconHtml(board),
            active: true,
          });
        }
      } finally {
        setRestoringIds((prev) => {
          const next = new Set(prev);
          next.delete(board);
          return next;
        });
        animatingRef.current.delete(board);
      }
    },
    [focusBoard, frames, setMinimized],
  );

  const openBoard = useCallback(
    (board: BoardId) => {
      const existing = frames.find((f) => f.id === board);
      if (existing) {
        if (existing.minimized) {
          void restoreBoard(board);
        } else {
          focusBoard(board);
        }
        setSelectedIcon(board);
        return;
      }
      setFrames((prev) => [
        ...prev,
        {
          id: board,
          minimized: false,
          maximized: false,
          geom: null,
          restoreGeom: null,
        },
      ]);
      setFocusOrder((prev) => [...prev.filter((b) => b !== board), board]);
      setSelectedIcon(board);
    },
    [focusBoard, frames, restoreBoard],
  );

  const closeBoard = useCallback((board: BoardId) => {
    animatingRef.current.delete(board);
    setRestoringIds((prev) => {
      if (!prev.has(board)) return prev;
      const next = new Set(prev);
      next.delete(board);
      return next;
    });
    setFrames((prev) => prev.filter((f) => f.id !== board));
    setFocusOrder((prev) => prev.filter((b) => b !== board));
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
        void restoreBoard(board);
        return;
      }
      if (activeId === board) {
        void minimizeBoard(board);
        return;
      }
      focusBoard(board);
    },
    [activeId, focusBoard, frames, minimizeBoard, restoreBoard],
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
                setMenu({ x: e.clientX, y: e.clientY, board: board.id });
              }}
            />
          ))}
        </div>
        <WindowManager
          frames={frames}
          focusOrder={focusOrder}
          activeId={activeId}
          restoringIds={restoringIds}
          onClose={closeBoard}
          onFocus={focusBoard}
          onMinimize={(board) => {
            void minimizeBoard(board);
          }}
          onToggleMaximize={toggleMaximize}
          onGeomChange={onGeomChange}
        />
        {menu ? (
          <ContextMenu
            x={menu.x}
            y={menu.y}
            onClose={() => setMenu(null)}
            items={[
              {
                id: "open",
                label: "Open",
                onSelect: () => openBoard(menu.board),
              },
            ]}
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
