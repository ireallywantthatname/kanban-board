"use client";

import type { ComponentType } from "react";
import type { OldIconProps } from "react-old-icons";

type DesktopIconProps = {
  label: string;
  Icon: ComponentType<OldIconProps>;
  onOpen: () => void;
};

export function DesktopIcon({ label, Icon, onOpen }: DesktopIconProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-[88px] flex-col items-center gap-1 border-0 bg-transparent p-1 outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-dashed focus-visible:outline-white"
    >
      <Icon size={32} />
      <span className="desktop-icon-label">{label}</span>
    </button>
  );
}
