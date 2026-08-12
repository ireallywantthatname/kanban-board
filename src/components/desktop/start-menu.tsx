"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useEffect, useRef } from "react";
import { WindowsXPLogOff } from "react-old-icons";
import { BOARDS, type BoardId } from "@/lib/boards";

type StartMenuProps = {
  open: boolean;
  onClose: () => void;
  onOpenBoard: (board: BoardId) => void;
};

export function StartMenu({ open, onClose, onOpenBoard }: StartMenuProps) {
  const { signOut } = useAuthActions();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div ref={ref} className="start-menu" role="menu" aria-label="Start Menu">
      <div className="start-menu-banner" aria-hidden="true">
        <span className="start-menu-banner-text">Windows 98</span>
      </div>
      <ul className="start-menu-list">
        {BOARDS.map((board) => (
          <li key={board.id}>
            <button
              type="button"
              className="start-menu-item"
              role="menuitem"
              onClick={() => {
                onOpenBoard(board.id);
                onClose();
              }}
            >
              <span className="start-menu-item-icon">
                <board.Icon size={24} />
              </span>
              <span>{board.label}</span>
            </button>
          </li>
        ))}
        <li className="start-menu-divider" role="separator" />
        <li>
          <button
            type="button"
            className="start-menu-item"
            role="menuitem"
            onClick={() => {
              void signOut();
              onClose();
            }}
          >
            <span className="start-menu-item-icon">
              <WindowsXPLogOff size={24} />
            </span>
            <span>Sign out</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
