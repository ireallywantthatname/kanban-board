import type { Id } from "../../convex/_generated/dataModel";
import type { BoardId } from "@/lib/boards";

export type WorkDragPayload = {
  workId: Id<"works">;
  fromBoard: BoardId;
  title: string;
  sourceEl: HTMLElement;
};

export type WorkDragCallbacks = {
  onDrop: (payload: WorkDragPayload, toBoard: BoardId) => void | Promise<void>;
};

const DROP_ATTR = "data-board-drop";
const HIGHLIGHT_CLASS = "drop-target-highlight";
const GHOST_CLASS = "work-drag-ghost";
const BODY_CLASS = "work-dragging";
const SOURCE_CLASS = "work-drag-source";

type Session = {
  payload: WorkDragPayload;
  callbacks: WorkDragCallbacks;
  offsetX: number;
  offsetY: number;
  ghost: HTMLElement;
  dropTarget: HTMLElement | null;
  dropBoard: BoardId | null;
};

let session: Session | null = null;

function isBoardId(value: string): value is BoardId {
  return (
    value === "all" ||
    value === "today" ||
    value === "this_week" ||
    value === "later"
  );
}

function findBoardDropTarget(x: number, y: number): {
  el: HTMLElement;
  board: BoardId;
} | null {
  for (const node of document.elementsFromPoint(x, y)) {
    if (!(node instanceof Element)) continue;
    const el = node.closest(`[${DROP_ATTR}]`);
    if (!(el instanceof HTMLElement)) continue;
    const board = el.getAttribute(DROP_ATTR);
    if (board && isBoardId(board)) {
      return { el, board };
    }
  }
  return null;
}

function setDropTarget(next: HTMLElement | null, board: BoardId | null) {
  if (!session) return;
  if (session.dropTarget === next) {
    session.dropBoard = board;
    return;
  }
  if (session.dropTarget) {
    session.dropTarget.classList.remove(HIGHLIGHT_CLASS);
  }
  session.dropTarget = next;
  session.dropBoard = board;
  if (next) {
    next.classList.add(HIGHLIGHT_CLASS);
  }
}

function createGhost(payload: WorkDragPayload, x: number, y: number, offsetX: number, offsetY: number) {
  const ghost = document.createElement("div");
  ghost.className = GHOST_CLASS;
  ghost.textContent = payload.title;
  ghost.style.left = `${x - offsetX}px`;
  ghost.style.top = `${y - offsetY}px`;
  const width = payload.sourceEl.getBoundingClientRect().width;
  if (width > 0) {
    ghost.style.width = `${width}px`;
  }
  document.body.appendChild(ghost);
  return ghost;
}

function onPointerMove(e: PointerEvent) {
  if (!session) return;
  session.ghost.style.left = `${e.clientX - session.offsetX}px`;
  session.ghost.style.top = `${e.clientY - session.offsetY}px`;

  const hit = findBoardDropTarget(e.clientX, e.clientY);
  if (!hit || hit.board === session.payload.fromBoard) {
    setDropTarget(null, null);
    return;
  }
  setDropTarget(hit.el, hit.board);
}

function cleanup() {
  if (!session) return;
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("pointercancel", onPointerUp);
  if (session.dropTarget) {
    session.dropTarget.classList.remove(HIGHLIGHT_CLASS);
  }
  session.payload.sourceEl.classList.remove(SOURCE_CLASS);
  if (session.ghost.parentElement) {
    session.ghost.parentElement.removeChild(session.ghost);
  }
  document.body.classList.remove(BODY_CLASS);
  session = null;
}

function onPointerUp(e: PointerEvent) {
  if (!session) return;
  const { payload, callbacks, dropBoard } = session;
  const hit = findBoardDropTarget(e.clientX, e.clientY);
  const toBoard =
    hit && hit.board !== payload.fromBoard
      ? hit.board
      : dropBoard && dropBoard !== payload.fromBoard
        ? dropBoard
        : null;
  cleanup();
  if (toBoard) {
    void callbacks.onDrop(payload, toBoard);
  }
}

export function isWorkDragging(): boolean {
  return session !== null;
}

export function startWorkDrag(
  payload: WorkDragPayload,
  clientX: number,
  clientY: number,
  callbacks: WorkDragCallbacks,
): void {
  if (session) return;

  const rect = payload.sourceEl.getBoundingClientRect();
  const offsetX = clientX - rect.left;
  const offsetY = clientY - rect.top;
  const ghost = createGhost(payload, clientX, clientY, offsetX, offsetY);

  payload.sourceEl.classList.add(SOURCE_CLASS);
  document.body.classList.add(BODY_CLASS);

  session = {
    payload,
    callbacks,
    offsetX,
    offsetY,
    ghost,
    dropTarget: null,
    dropBoard: null,
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  onPointerMove(
    new PointerEvent("pointermove", { clientX, clientY }),
  );
}
