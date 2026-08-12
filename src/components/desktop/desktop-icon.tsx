"use client";

import type { ComponentType } from "react";
import type { OldIconProps } from "react-old-icons";
import { cn } from "@/lib/utils";

type DesktopIconProps = {
  label: string;
  Icon: ComponentType<OldIconProps>;
  selected?: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
};

export function DesktopIcon({
  label,
  Icon,
  selected = false,
  onSelect,
  onOpen,
  onContextMenu,
}: DesktopIconProps) {
  return (
    <button
      type="button"
      className={cn("desktop-icon", selected && "selected")}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onOpen();
        }
      }}
      onContextMenu={onContextMenu}
    >
      <Icon size={32} />
      <span className="desktop-icon-label">{label}</span>
    </button>
  );
}
