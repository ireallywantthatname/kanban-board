"use client";

import { forwardRef, type ReactNode, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type AppWindowProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  onClose?: () => void;
  children: ReactNode;
  active?: boolean;
};

export const AppWindow = forwardRef<HTMLDivElement, AppWindowProps>(
  function AppWindow(
    { title, onClose, children, active = true, className, style, ...props },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={cn("win-window", className)}
        style={style}
        {...props}
      >
        <div
          className="win-titlebar"
          style={
            active
              ? undefined
              : { background: "#808080" }
          }
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
              onMouseDown={(e) => e.stopPropagation()}
              aria-label="Close"
            >
              ×
            </button>
          ) : null}
        </div>
        <div className="win-content">{children}</div>
      </div>
    );
  },
);
