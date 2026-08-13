import type { ComponentType } from "react";
import {
  Windows2000MyDocuments,
  Windows95Notepad,
  WindowsDatetime,
  WindowsVistaCalendar,
  type OldIconProps,
} from "react-old-icons";

export type BoardId = "all" | "today" | "this_week" | "later";

export type BoardDef = {
  id: BoardId;
  label: string;
  Icon: ComponentType<OldIconProps>;
};

export const BOARDS: BoardDef[] = [
  { id: "all", label: "All", Icon: Windows2000MyDocuments },
  { id: "today", label: "Today", Icon: WindowsDatetime },
  { id: "this_week", label: "This Week", Icon: WindowsVistaCalendar },
  { id: "later", label: "Later", Icon: Windows95Notepad },
];

export function boardLabel(id: BoardId): string {
  return BOARDS.find((b) => b.id === id)?.label ?? id;
}

export function isBoardId(value: string): value is BoardId {
  return BOARDS.some((b) => b.id === value);
}
