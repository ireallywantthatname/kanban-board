"use client";

import type { PointerEvent, ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type AppWindowProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  children: ReactNode;
  active?: boolean;
  maximized?: boolean;
  icon?: ReactNode;
  statusBar?: ReactNode;
  onTitlePointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  onTitleDoubleClick?: () => void;
};

export function AppWindow({
  title,
  onClose,
  onMinimize,
  onMaximize,
  children,
  active = true,
  maximized = false,
  icon,
  statusBar,
  onTitlePointerDown,
  onTitleDoubleClick,
  className,
  style,
  ...props
}: AppWindowProps) {
  return (
    <div className={cn("window app-window", className)} style={style} {...props}>
      <div
        className={cn("title-bar", !active && "inactive")}
        onPointerDown={onTitlePointerDown}
        onDoubleClick={onTitleDoubleClick}
      >
        <div className="title-bar-text">
          {icon ? <span className="app-window-icon">{icon}</span> : null}
          <span>{title}</span>
        </div>
        <div className="title-bar-controls">
          {onMinimize ? (
            <button
              type="button"
              aria-label="Minimize"
              onClick={(e) => {
                e.stopPropagation();
                onMinimize();
              }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : null}
          {onMaximize ? (
            <button
              type="button"
              aria-label={maximized ? "Restore" : "Maximize"}
              onClick={(e) => {
                e.stopPropagation();
                onMaximize();
              }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : null}
          {onClose ? (
            <button
              type="button"
              aria-label="Close"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : null}
        </div>
      </div>
      <div className="window-body app-window-body">{children}</div>
      {statusBar ? (
        <div className="status-bar app-status-bar">{statusBar}</div>
      ) : null}
    </div>
  );
}
