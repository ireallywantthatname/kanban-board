"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { defaultWindowSize } from "@/lib/windows";
import type { ResizeEdge, WindowFrame, WindowGeom, WindowId } from "@/lib/window-shell";
import {
  ManagedWindow,
  type WorkspaceInfo,
} from "@/components/window/managed-window";

const MIN_W = 280;
const MIN_H = 200;
const CASCADE = 24;
const ORIGIN = 32;
const TITLE_SLACK = 40;

type DragState = {
  board: WindowId;
  kind: "move" | "resize";
  edge?: ResizeEdge;
  startX: number;
  startY: number;
  orig: WindowGeom;
};

type WindowManagerProps = {
  frames: WindowFrame[];
  focusOrder: WindowId[];
  activeId: WindowId | null;
  restoringIds?: ReadonlySet<WindowId>;
  workspaces?: WorkspaceInfo[];
  onInvite?: (workspaceId: Id<"workspaces">) => void;
  onOpenBoard: (id: WindowId) => void;
  onWorkCreated: (id: WindowId) => void;
  onInviteAccepted: (workspaceId: Id<"workspaces">) => void;
  onCreateWorkspace: (name: string) => Promise<void>;
  onRenameWorkspace: (
    workspaceId: Id<"workspaces">,
    name: string,
  ) => Promise<void>;
  onDeleteWorkspace: (workspaceId: Id<"workspaces">) => Promise<void>;
  onLeaveWorkspace: (workspaceId: Id<"workspaces">) => Promise<void>;
  onLogOff: () => void;
  onShutDown: () => void;
  onClose: (id: WindowId) => void;
  onFocus: (id: WindowId) => void;
  onMinimize: (id: WindowId) => void;
  onToggleMaximize: (id: WindowId) => void;
  onGeomChange: (id: WindowId, geom: WindowGeom) => void;
};

function defaultGeom(
  id: WindowId,
  index: number,
  containerW: number,
  containerH: number,
): WindowGeom {
  const offset = (index % 4) * CASCADE;
  const size = defaultWindowSize(id);
  const w = Math.max(MIN_W, Math.min(size.w, Math.max(containerW - 64, MIN_W)));
  const h = Math.max(MIN_H, Math.min(size.h, Math.max(containerH - 64, MIN_H)));
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
  restoringIds,
  onClose,
  onFocus,
  onMinimize,
  onToggleMaximize,
  onGeomChange,
  workspaces = [],
  onInvite,
  onOpenBoard,
  onWorkCreated,
  onInviteAccepted,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
  onLeaveWorkspace,
  onLogOff,
  onShutDown,
}: WindowManagerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [localGeom, setLocalGeom] = useState<Partial<Record<WindowId, WindowGeom>>>({});

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
      for (const key of Object.keys(next) as WindowId[]) {
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
    const result: Partial<Record<WindowId, WindowGeom>> = {};
    frames.forEach((frame, index) => {
      if (frame.maximized) {
        result[frame.id] = { x: 0, y: 0, w: cw, h: ch };
        return;
      }
      result[frame.id] =
        localGeom[frame.id] ??
        frame.geom ??
        defaultGeom(frame.id, index, cw, ch);
    });
    return result;
  }, [frames, localGeom, measure]);

  const zIndexFor = useCallback(
    (board: WindowId) => {
      const idx = focusOrder.lastIndexOf(board);
      if (idx >= 0) return 20 + idx;
      const openIdx = frames.findIndex((f) => f.id === board);
      return 20 + (openIdx < 0 ? 0 : openIdx);
    },
    [focusOrder, frames],
  );

  const startMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>, board: WindowId) => {
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
    (e: ReactPointerEvent<HTMLDivElement>, board: WindowId, edge: ResizeEdge) => {
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
        const restoring = restoringIds?.has(frame.id) ?? false;
        return (
          <div
            key={frame.id}
            data-window-id={frame.id}
            className="absolute"
            style={{
              left: g.x,
              top: g.y,
              width: g.w,
              height: g.h,
              zIndex: zIndexFor(frame.id),
              visibility: restoring ? "hidden" : "visible",
            }}
            onPointerDown={() => onFocus(frame.id)}
          >
            <ManagedWindow
              id={frame.id}
              workspaces={workspaces}
              onOpenBoard={onOpenBoard}
              onInvite={onInvite}
              onWorkCreated={onWorkCreated}
              onInviteAccepted={onInviteAccepted}
              onCreateWorkspace={onCreateWorkspace}
              onRenameWorkspace={onRenameWorkspace}
              onDeleteWorkspace={onDeleteWorkspace}
              onLeaveWorkspace={onLeaveWorkspace}
              onLogOff={onLogOff}
              onShutDown={onShutDown}
              onClose={() => onClose(frame.id)}
              onMinimize={() => onMinimize(frame.id)}
              onMaximize={() => onToggleMaximize(frame.id)}
              active={activeId === frame.id}
              maximized={frame.maximized}
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
