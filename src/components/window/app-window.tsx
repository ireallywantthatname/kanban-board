"use client";

import type { PointerEvent, ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import {
  TitlebarCloseIcon,
  TitlebarMaximizeIcon,
  TitlebarMinimizeIcon,
} from "@/components/window/titlebar-icons";

type AppWindowProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  onClose?: () => void;
  children: ReactNode;
  active?: boolean;
  icon?: ReactNode;
  onTitlePointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
};

export function AppWindow({
  title,
  onClose,
  children,
  active = true,
  icon,
  onTitlePointerDown,
  className,
  style,
  ...props
}: AppWindowProps) {
  return (
    <div className={cn("win-window", className)} style={style} {...props}>
      <div
        className={cn("win-titlebar", !active && "win-titlebar-inactive")}
        onPointerDown={onTitlePointerDown}
      >
        <div className="win-titlebar-leading">
          {icon ? <span className="win-title-icon">{icon}</span> : null}
          <span className="win-titlebar-text">{title}</span>
        </div>
        <div className="win-title-controls">
          <button
            type="button"
            className="win-title-btn"
            aria-label="Minimize"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <TitlebarMinimizeIcon />
          </button>
          <button
            type="button"
            className="win-title-btn"
            aria-label="Maximize"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <TitlebarMaximizeIcon />
          </button>
          <button
            type="button"
            className="win-title-btn win-title-btn-close"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <TitlebarCloseIcon />
          </button>
        </div>
      </div>
      <div className="win-content">{children}</div>
    </div>
  );
}
