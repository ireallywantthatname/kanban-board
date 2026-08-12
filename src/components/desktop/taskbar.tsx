"use client";

import { useState } from "react";
import { WindowsTaskbarAndStartMenu } from "react-old-icons";
import { Clock } from "./clock";
import { StartMenu } from "./start-menu";

export function Taskbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="win-raised relative z-50 flex h-10 shrink-0 items-center gap-2 px-1">
      <div className="relative">
        <button
          type="button"
          className="win-raised flex h-8 items-center gap-1 px-2 font-bold"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <WindowsTaskbarAndStartMenu size={18} />
          <span>Start</span>
        </button>
        <StartMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      </div>
      <div className="flex-1" />
      <Clock />
    </div>
  );
}
