"use client";

import { useEffect, useRef, useState } from "react";
import {
  Windows95Help,
  Windows95Inbox,
  Windows95NetworkNeighborhood,
  Windows95Notepad,
  Windows95SavedSearch,
  WindowsFolder,
  WindowsShutDown,
  WindowsXPLogOff,
} from "react-old-icons";
import type { Id } from "../../../convex/_generated/dataModel";
import { BOARDS } from "@/lib/boards";
import { cn } from "@/lib/utils";
import type { WindowId } from "@/lib/window-shell";
import { workspaceWindowId } from "@/lib/windows";

type StartMenuProps = {
  open: boolean;
  onClose: () => void;
  onOpenBoard: (board: WindowId) => void;
  workspaces?: { _id: Id<"workspaces">; name: string }[];
};

export function StartMenu({
  open,
  onClose,
  onOpenBoard,
  workspaces = [],
}: StartMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [flyout, setFlyout] = useState<null | "programs" | "workspaces">(null);

  useEffect(() => {
    if (!open) {
      setFlyout(null);
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

  function run(id: WindowId) {
    onClose();
    onOpenBoard(id);
  }

  return (
    <div ref={ref} className="start-menu" role="menu" aria-label="Start Menu">
      <ul className="start-menu-list">
        <li
          className="start-menu-programs"
          onPointerEnter={() => setFlyout("programs")}
        >
          <button
            type="button"
            className={cn("start-menu-item has-submenu", flyout === "programs" && "open")}
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={flyout === "programs"}
            onClick={() => setFlyout("programs")}
          >
            <span className="start-menu-item-icon">
              <WindowsFolder size={24} />
            </span>
            <span className="start-menu-item-label">Programs</span>
            <span className="start-menu-submenu-arrow" aria-hidden="true" />
          </button>
          {flyout === "programs" ? (
            <ul className="start-menu-submenu" role="menu">
              {BOARDS.map((board) => (
                <li key={board.id}>
                  <button
                    type="button"
                    className="start-menu-item"
                    role="menuitem"
                    onClick={() => run(board.id)}
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
        <li
          className="start-menu-programs"
          onPointerEnter={() => setFlyout("workspaces")}
        >
          <button
            type="button"
            className={cn(
              "start-menu-item has-submenu",
              flyout === "workspaces" && "open",
            )}
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={flyout === "workspaces"}
            onClick={() => setFlyout("workspaces")}
          >
            <span className="start-menu-item-icon">
              <Windows95NetworkNeighborhood size={24} />
            </span>
            <span className="start-menu-item-label">Workspaces</span>
            <span className="start-menu-submenu-arrow" aria-hidden="true" />
          </button>
          {flyout === "workspaces" ? (
            <ul className="start-menu-submenu" role="menu">
              {workspaces.map((workspace) => (
                <li key={workspace._id}>
                  <button
                    type="button"
                    className="start-menu-item"
                    role="menuitem"
                    onClick={() => run(workspaceWindowId(workspace._id))}
                  >
                    <span className="start-menu-item-icon">
                      <Windows95NetworkNeighborhood size={24} />
                    </span>
                    <span className="start-menu-item-label">
                      {workspace.name}
                    </span>
                  </button>
                </li>
              ))}
              {workspaces.length > 0 ? (
                <li className="start-menu-divider" role="separator" />
              ) : null}
              <li>
                <button
                  type="button"
                  className="start-menu-item"
                  role="menuitem"
                  onClick={() => run("new-workspace")}
                >
                  <span className="start-menu-item-icon">
                    <Windows95NetworkNeighborhood size={24} />
                  </span>
                  <span className="start-menu-item-label">New Workspace…</span>
                </button>
              </li>
            </ul>
          ) : null}
        </li>
        <li onPointerEnter={() => setFlyout(null)}>
          <button
            type="button"
            className="start-menu-item"
            role="menuitem"
            onClick={() => run("new-work")}
          >
            <span className="start-menu-item-icon">
              <Windows95Notepad size={24} />
            </span>
            <span className="start-menu-item-label">New Work…</span>
          </button>
        </li>
        <li onPointerEnter={() => setFlyout(null)}>
          <button
            type="button"
            className="start-menu-item"
            role="menuitem"
            onClick={() => run("find")}
          >
            <span className="start-menu-item-icon">
              <Windows95SavedSearch size={24} />
            </span>
            <span className="start-menu-item-label">Find…</span>
          </button>
        </li>
        <li onPointerEnter={() => setFlyout(null)}>
          <button
            type="button"
            className="start-menu-item"
            role="menuitem"
            onClick={() => run("invitations")}
          >
            <span className="start-menu-item-icon">
              <Windows95Inbox size={24} />
            </span>
            <span className="start-menu-item-label">Invitations…</span>
          </button>
        </li>
        <li onPointerEnter={() => setFlyout(null)}>
          <button
            type="button"
            className="start-menu-item"
            role="menuitem"
            onClick={() => run("help")}
          >
            <span className="start-menu-item-icon">
              <Windows95Help size={24} />
            </span>
            <span className="start-menu-item-label">Help</span>
          </button>
        </li>
        <li className="start-menu-divider" role="separator" />
        <li onPointerEnter={() => setFlyout(null)}>
          <button
            type="button"
            className="start-menu-item"
            role="menuitem"
            onClick={() => run("log-off")}
          >
            <span className="start-menu-item-icon">
              <WindowsXPLogOff size={24} />
            </span>
            <span className="start-menu-item-label">Log Off…</span>
          </button>
        </li>
        <li onPointerEnter={() => setFlyout(null)}>
          <button
            type="button"
            className="start-menu-item"
            role="menuitem"
            onClick={() => run("shut-down")}
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
