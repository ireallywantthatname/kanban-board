"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { BoardWindow } from "@/components/board/board-window";
import type { BoardId } from "@/lib/boards";

const MIN_W = 280;
const MIN_H = 200;
const DEFAULT_W = 520;
const DEFAULT_H = 360;
const CASCADE = 24;
const ORIGIN = 32;
const TITLE_SLACK = 40;

type WindowGeom = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type DragState = {
  board: BoardId;
  kind: "move" | "resize";
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
};

type WindowManagerProps = {
  openBoards: BoardId[];
  onClose: (board: BoardId) => void;
};

function defaultGeom(index: number, containerW: number, containerH: number): WindowGeom {
  const offset = (index % 4) * CASCADE;
  const w = Math.max(MIN_W, Math.min(DEFAULT_W, Math.max(containerW - 64, MIN_W)));
  const h = Math.max(MIN_H, Math.min(DEFAULT_H, Math.max(containerH - 64, MIN_H)));
  return {
    x: ORIGIN + offset,
    y: ORIGIN + offset,
    w,
    h,
  };
}

function clampMove(
  x: number,
  y: number,
  w: number,
  containerW: number,
  containerH: number,
): { x: number; y: number } {
  const maxX = Math.max(containerW - TITLE_SLACK, 0);
  const minX = Math.min(TITLE_SLACK - w, 0);
  const maxY = Math.max(containerH - TITLE_SLACK, 0);
  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(0, y)),
  };
}

export function WindowManager({ openBoards, onClose }: WindowManagerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const prevOpenRef = useRef<BoardId[]>([]);
  const [geom, setGeom] = useState<Partial<Record<BoardId, WindowGeom>>>({});
  const [focusOrder, setFocusOrder] = useState<BoardId[]>([]);

  const measure = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    return {
      w: rect?.width ?? 1280,
      h: rect?.height ?? 720,
    };
  }, []);

  const focus = useCallback((board: BoardId) => {
    setFocusOrder((prev) => [...prev.filter((b) => b !== board), board]);
  }, []);

  useEffect(() => {
    const prev = prevOpenRef.current;
    const added = openBoards.filter((b) => !prev.includes(b));
    const removed = prev.filter((b) => !openBoards.includes(b));
    prevOpenRef.current = openBoards;

    if (added.length > 0) {
      const { w: cw, h: ch } = measure();
      setGeom((prevGeom) => {
        const next = { ...prevGeom };
        let cascadeIndex = openBoards.length - added.length;
        for (const board of added) {
          if (!next[board]) {
            next[board] = defaultGeom(cascadeIndex, cw, ch);
          }
          cascadeIndex += 1;
        }
        return next;
      });
      setFocusOrder((prevFocus) => {
        let next = prevFocus.filter((b) => openBoards.includes(b));
        for (const board of added) {
          next = [...next.filter((b) => b !== board), board];
        }
        return next;
      });
    }

    if (removed.length > 0) {
      setFocusOrder((prevFocus) =>
        prevFocus.filter((b) => openBoards.includes(b)),
      );
      if (dragRef.current && removed.includes(dragRef.current.board)) {
        dragRef.current = null;
      }
    }
  }, [openBoards, measure]);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const { w: cw, h: ch } = measure();
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;

      if (drag.kind === "move") {
        const next = clampMove(
          drag.origX + dx,
          drag.origY + dy,
          drag.origW,
          cw,
          ch,
        );
        setGeom((prev) => ({
          ...prev,
          [drag.board]: {
            x: next.x,
            y: next.y,
            w: drag.origW,
            h: drag.origH,
          },
        }));
      } else {
        setGeom((prev) => ({
          ...prev,
          [drag.board]: {
            x: drag.origX,
            y: drag.origY,
            w: Math.max(MIN_W, drag.origW + dx),
            h: Math.max(MIN_H, drag.origH + dy),
          },
        }));
      }
    }

    function onUp() {
      dragRef.current = null;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [measure]);

  const resolvedGeom = useMemo(() => {
    const { w: cw, h: ch } = measure();
    const result: Partial<Record<BoardId, WindowGeom>> = {};
    openBoards.forEach((board, index) => {
      result[board] = geom[board] ?? defaultGeom(index, cw, ch);
    });
    return result;
  }, [openBoards, geom, measure]);

  const activeBoard =
    focusOrder.filter((b) => openBoards.includes(b)).at(-1) ??
    openBoards.at(-1);

  const zIndexFor = useCallback(
    (board: BoardId) => {
      const idx = focusOrder.lastIndexOf(board);
      if (idx >= 0) return 20 + idx;
      const openIdx = openBoards.indexOf(board);
      return 20 + (openIdx < 0 ? 0 : openIdx);
    },
    [focusOrder, openBoards],
  );

  const startMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>, board: BoardId) => {
      const g = resolvedGeom[board];
      if (!g) return;
      focus(board);
      dragRef.current = {
        board,
        kind: "move",
        startX: e.clientX,
        startY: e.clientY,
        origX: g.x,
        origY: g.y,
        origW: g.w,
        origH: g.h,
      };
      if (!geom[board]) {
        setGeom((prev) => ({ ...prev, [board]: g }));
      }
    },
    [focus, geom, resolvedGeom],
  );

  const startResize = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, board: BoardId) => {
      e.stopPropagation();
      e.preventDefault();
      const g = resolvedGeom[board];
      if (!g) return;
      focus(board);
      dragRef.current = {
        board,
        kind: "resize",
        startX: e.clientX,
        startY: e.clientY,
        origX: g.x,
        origY: g.y,
        origW: g.w,
        origH: g.h,
      };
      if (!geom[board]) {
        setGeom((prev) => ({ ...prev, [board]: g }));
      }
    },
    [focus, geom, resolvedGeom],
  );

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {openBoards.map((board) => {
        const g = resolvedGeom[board];
        if (!g) return null;
        return (
          <div
            key={board}
            className="absolute"
            style={{
              left: g.x,
              top: g.y,
              width: g.w,
              height: g.h,
              zIndex: zIndexFor(board),
            }}
            onPointerDown={() => focus(board)}
          >
            <BoardWindow
              board={board}
              onClose={() => onClose(board)}
              active={activeBoard === board}
              className="h-full w-full"
              onTitlePointerDown={(e) => startMove(e, board)}
            />
            <div
              className="win-resize-se"
              onPointerDown={(e) => startResize(e, board)}
            />
          </div>
        );
      })}
    </div>
  );
}
