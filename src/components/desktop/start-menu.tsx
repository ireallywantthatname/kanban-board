"use client";

import { useEffect, useRef, useState } from "react";
import {
  Windows95Help,
  Windows95Notepad,
  Windows95SavedSearch,
  WindowsFolder,
  WindowsShutDown,
  WindowsXPLogOff,
} from "react-old-icons";
import { BOARDS, type BoardId } from "@/lib/boards";
import { cn } from "@/lib/utils";

type StartMenuProps = {
  open: boolean;
  onClose: () => void;
  onOpenBoard: (board: BoardId) => void;
  onNewWork: () => void;
  onFind: () => void;
  onHelp: () => void;
  onLogOff: () => void;
  onShutDown: () => void;
};

export function StartMenu({
  open,
  onClose,
  onOpenBoard,
  onNewWork,
  onFind,
  onHelp,
  onLogOff,
  onShutDown,
}: StartMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [programsOpen, setProgramsOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setProgramsOpen(false);
      return;
    }
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

  function run(action: () => void) {
    onClose();
    action();
  }

  return (
    <div ref={ref} className="start-menu" role="menu" aria-label="Start Menu">
      <div className="start-menu-banner" aria-hidden="true">
        <span className="start-menu-banner-text">Windows 98</span>
      </div>
      <ul className="start-menu-list">
        <li
          className="start-menu-programs"
          onPointerEnter={() => setProgramsOpen(true)}
        >
          <button
            type="button"
            className={cn("start-menu-item has-submenu", programsOpen && "open")}
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={programsOpen}
            onClick={() => setProgramsOpen(true)}
          >
            <span className="start-menu-item-icon">
              <WindowsFolder size={24} />
            </span>
            <span className="start-menu-item-label">Programs</span>
            <span className="start-menu-submenu-arrow" aria-hidden="true" />
          </button>
          {programsOpen ? (
            <ul className="start-menu-submenu" role="menu">
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
                    <span className="start-menu-item-label">{board.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
        <li onPointerEnter={() => setProgramsOpen(false)}>
          <button
            type="button"
            className="start-menu-item"
            role="menuitem"
            onClick={() => run(onNewWork)}
          >
            <span className="start-menu-item-icon">
              <Windows95Notepad size={24} />
            </span>
            <span className="start-menu-item-label">New Work…</span>
          </button>
        </li>
        <li onPointerEnter={() => setProgramsOpen(false)}>
          <button
            type="button"
            className="start-menu-item"
            role="menuitem"
            onClick={() => run(onFind)}
          >
            <span className="start-menu-item-icon">
              <Windows95SavedSearch size={24} />
            </span>
            <span className="start-menu-item-label">Find…</span>
          </button>
        </li>
        <li onPointerEnter={() => setProgramsOpen(false)}>
          <button
            type="button"
            className="start-menu-item"
            role="menuitem"
            onClick={() => run(onHelp)}
          >
            <span className="start-menu-item-icon">
              <Windows95Help size={24} />
            </span>
            <span className="start-menu-item-label">Help</span>
          </button>
        </li>
        <li className="start-menu-divider" role="separator" />
        <li onPointerEnter={() => setProgramsOpen(false)}>
          <button
            type="button"
            className="start-menu-item"
            role="menuitem"
            onClick={() => run(onLogOff)}
          >
            <span className="start-menu-item-icon">
              <WindowsXPLogOff size={24} />
            </span>
            <span className="start-menu-item-label">Log Off…</span>
          </button>
        </li>
        <li onPointerEnter={() => setProgramsOpen(false)}>
          <button
            type="button"
            className="start-menu-item"
            role="menuitem"
            onClick={() => run(onShutDown)}
          >
            <span className="start-menu-item-icon">
              <WindowsShutDown size={24} />
            </span>
            <span className="start-menu-item-label">Shut Down…</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
