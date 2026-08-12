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
import type { ResizeEdge, WindowFrame, WindowGeom } from "@/lib/window-shell";

const MIN_W = 280;
const MIN_H = 200;
const DEFAULT_W = 520;
const DEFAULT_H = 360;
const CASCADE = 24;
const ORIGIN = 32;
const TITLE_SLACK = 40;

type DragState = {
  board: BoardId;
  kind: "move" | "resize";
  edge?: ResizeEdge;
  startX: number;
  startY: number;
  orig: WindowGeom;
};

type WindowManagerProps = {
  frames: WindowFrame[];
  focusOrder: BoardId[];
  activeId: BoardId | null;
  onClose: (board: BoardId) => void;
  onFocus: (board: BoardId) => void;
  onMinimize: (board: BoardId) => void;
  onToggleMaximize: (board: BoardId) => void;
  onGeomChange: (board: BoardId, geom: WindowGeom) => void;
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

function applyResize(
  edge: ResizeEdge,
  orig: WindowGeom,
  dx: number,
  dy: number,
  containerW: number,
  containerH: number,
): WindowGeom {
  let { x, y, w, h } = orig;

  if (edge.includes("e")) {
    w = Math.max(MIN_W, orig.w + dx);
  }
  if (edge.includes("s")) {
    h = Math.max(MIN_H, orig.h + dy);
  }
  if (edge.includes("w")) {
    const nextW = Math.max(MIN_W, orig.w - dx);
    x = orig.x + (orig.w - nextW);
    w = nextW;
  }
  if (edge.includes("n")) {
    const nextH = Math.max(MIN_H, orig.h - dy);
    y = orig.y + (orig.h - nextH);
    h = nextH;
  }

  if (x + w > containerW) {
    if (edge.includes("e")) w = Math.max(MIN_W, containerW - x);
    else x = Math.max(0, containerW - w);
  }
  if (y + h > containerH) {
    if (edge.includes("s")) h = Math.max(MIN_H, containerH - y);
    else y = Math.max(0, containerH - h);
  }
  if (x < 0) {
    if (edge.includes("w")) {
      w = Math.max(MIN_W, w + x);
      x = 0;
    } else {
      x = 0;
    }
  }
  if (y < 0) {
    if (edge.includes("n")) {
      h = Math.max(MIN_H, h + y);
      y = 0;
    } else {
      y = 0;
    }
  }

  return { x, y, w, h };
}

export function WindowManager({
  frames,
  focusOrder,
  activeId,
  onClose,
  onFocus,
  onMinimize,
  onToggleMaximize,
  onGeomChange,
}: WindowManagerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [localGeom, setLocalGeom] = useState<Partial<Record<BoardId, WindowGeom>>>({});

  const measure = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    return {
      w: rect?.width ?? 1280,
      h: rect?.height ?? 720,
    };
  }, []);

  useEffect(() => {
    const openIds = new Set(frames.map((f) => f.id));
    setLocalGeom((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const key of Object.keys(next) as BoardId[]) {
        if (!openIds.has(key)) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [frames]);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const { w: cw, h: ch } = measure();
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;

      let next: WindowGeom;
      if (drag.kind === "move") {
        const pos = clampMove(drag.orig.x + dx, drag.orig.y + dy, drag.orig.w, cw, ch);
        next = { x: pos.x, y: pos.y, w: drag.orig.w, h: drag.orig.h };
      } else {
        next = applyResize(drag.edge ?? "se", drag.orig, dx, dy, cw, ch);
      }

      setLocalGeom((prev) => ({ ...prev, [drag.board]: next }));
    }

    function onUp() {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      setLocalGeom((prev) => {
        const g = prev[drag.board];
        if (g) onGeomChange(drag.board, g);
        return prev;
      });
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [measure, onGeomChange]);

  const resolved = useMemo(() => {
    const { w: cw, h: ch } = measure();
    const result: Partial<Record<BoardId, WindowGeom>> = {};
    frames.forEach((frame, index) => {
      if (frame.maximized) {
        result[frame.id] = { x: 0, y: 0, w: cw, h: ch };
        return;
      }
      result[frame.id] =
        localGeom[frame.id] ??
        frame.geom ??
        defaultGeom(index, cw, ch);
    });
    return result;
  }, [frames, localGeom, measure]);

  const zIndexFor = useCallback(
    (board: BoardId) => {
      const idx = focusOrder.lastIndexOf(board);
      if (idx >= 0) return 20 + idx;
      const openIdx = frames.findIndex((f) => f.id === board);
      return 20 + (openIdx < 0 ? 0 : openIdx);
    },
    [focusOrder, frames],
  );

  const startMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>, board: BoardId) => {
      const frame = frames.find((f) => f.id === board);
      if (!frame || frame.maximized || frame.minimized) return;
      const g = resolved[board];
      if (!g) return;
      onFocus(board);
      dragRef.current = {
        board,
        kind: "move",
        startX: e.clientX,
        startY: e.clientY,
        orig: g,
      };
      setLocalGeom((prev) => ({ ...prev, [board]: g }));
    },
    [frames, onFocus, resolved],
  );

  const startResize = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, board: BoardId, edge: ResizeEdge) => {
      e.stopPropagation();
      e.preventDefault();
      const frame = frames.find((f) => f.id === board);
      if (!frame || frame.maximized || frame.minimized) return;
      const g = resolved[board];
      if (!g) return;
      onFocus(board);
      dragRef.current = {
        board,
        kind: "resize",
        edge,
        startX: e.clientX,
        startY: e.clientY,
        orig: g,
      };
      setLocalGeom((prev) => ({ ...prev, [board]: g }));
    },
    [frames, onFocus, resolved],
  );

  const edges: ResizeEdge[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {frames.map((frame) => {
        if (frame.minimized) return null;
        const g = resolved[frame.id];
        if (!g) return null;
        return (
          <div
            key={frame.id}
            className="absolute"
            style={{
              left: g.x,
              top: g.y,
              width: g.w,
              height: g.h,
              zIndex: zIndexFor(frame.id),
            }}
            onPointerDown={() => onFocus(frame.id)}
          >
            <BoardWindow
              board={frame.id}
              onClose={() => onClose(frame.id)}
              onMinimize={() => onMinimize(frame.id)}
              onMaximize={() => onToggleMaximize(frame.id)}
              active={activeId === frame.id}
              maximized={frame.maximized}
              className="h-full w-full"
              onTitlePointerDown={(e) => startMove(e, frame.id)}
              onTitleDoubleClick={() => onToggleMaximize(frame.id)}
            />
            {!frame.maximized
              ? edges.map((edge) => (
                  <div
                    key={edge}
                    className={`win-resize win-resize-${edge}`}
                    onPointerDown={(e) => startResize(e, frame.id, edge)}
                  />
                ))
              : null}
          </div>
        );
      })}
    </div>
  );
}
