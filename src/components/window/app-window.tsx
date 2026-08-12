"use client";

import type { PointerEvent, ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type AppWindowProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  onClose?: () => void;
  children: ReactNode;
  active?: boolean;
  onTitlePointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
};

export function AppWindow({
  title,
  onClose,
  children,
  active = true,
  onTitlePointerDown,
  className,
  style,
  ...props
}: AppWindowProps) {
  return (
    <div className={cn("win-window", className)} style={style} {...props}>
      <div
        className="win-titlebar"
        style={active ? undefined : { background: "#808080" }}
        onPointerDown={onTitlePointerDown}
      >
        <span className="win-titlebar-text flex-1">{title}</span>
        {onClose ? (
          <button
            type="button"
            className="win-title-btn"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Close"
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="win-content">{children}</div>
    </div>
  );
}
