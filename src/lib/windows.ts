import type { PointerEvent } from "react";
import { type BoardId, boardLabel, isBoardId } from "@/lib/boards";
import type { Id } from "../../convex/_generated/dataModel";

export type ToolWindowId =
  | "find"
  | "new-work"
  | "new-workspace"
  | "help"
  | "invitations"
  | "log-off"
  | "shut-down";

export type WindowId =
  | BoardId
  | ToolWindowId
  | `ws:${string}`
  | `invite:${string}`
  | `rename-ws:${string}`
  | `delete-ws:${string}`
  | `leave-ws:${string}`;

export type ParsedWindowId =
  | { kind: "board"; board: BoardId }
  | { kind: "workspace"; workspaceId: Id<"workspaces"> }
  | { kind: "find" }
  | { kind: "new-work" }
  | { kind: "new-workspace" }
  | { kind: "help" }
  | { kind: "invitations" }
  | { kind: "log-off" }
  | { kind: "shut-down" }
  | { kind: "invite"; workspaceId: Id<"workspaces"> }
  | { kind: "rename-workspace"; workspaceId: Id<"workspaces"> }
  | { kind: "delete-workspace"; workspaceId: Id<"workspaces"> }
  | { kind: "leave-workspace"; workspaceId: Id<"workspaces"> };

export type WindowChrome = {
  onClose: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  active?: boolean;
  maximized?: boolean;
  onTitlePointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  onTitleDoubleClick?: () => void;
};

const TOOL_IDS: readonly ToolWindowId[] = [
  "find",
  "new-work",
  "new-workspace",
  "help",
  "invitations",
  "log-off",
  "shut-down",
];

function isToolWindowId(id: string): id is ToolWindowId {
  return (TOOL_IDS as readonly string[]).includes(id);
}

export function workspaceWindowId(id: Id<"workspaces">): WindowId {
  return `ws:${id}`;
}

export function inviteWindowId(id: Id<"workspaces">): WindowId {
  return `invite:${id}`;
}

export function renameWorkspaceWindowId(id: Id<"workspaces">): WindowId {
  return `rename-ws:${id}`;
}

export function deleteWorkspaceWindowId(id: Id<"workspaces">): WindowId {
  return `delete-ws:${id}`;
}

export function leaveWorkspaceWindowId(id: Id<"workspaces">): WindowId {
  return `leave-ws:${id}`;
}

export function parseWindowId(id: string): ParsedWindowId | null {
  if (isBoardId(id)) {
    return { kind: "board", board: id };
  }
  if (isToolWindowId(id)) {
    return { kind: id };
  }
  if (id.startsWith("ws:") && id.length > 3) {
    return {
      kind: "workspace",
      workspaceId: id.slice(3) as Id<"workspaces">,
    };
  }
  if (id.startsWith("invite:") && id.length > 7) {
    return {
      kind: "invite",
      workspaceId: id.slice(7) as Id<"workspaces">,
    };
  }
  if (id.startsWith("rename-ws:") && id.length > 10) {
    return {
      kind: "rename-workspace",
      workspaceId: id.slice(10) as Id<"workspaces">,
    };
  }
  if (id.startsWith("delete-ws:") && id.length > 10) {
    return {
      kind: "delete-workspace",
      workspaceId: id.slice(10) as Id<"workspaces">,
    };
  }
  if (id.startsWith("leave-ws:") && id.length > 9) {
    return {
      kind: "leave-workspace",
      workspaceId: id.slice(9) as Id<"workspaces">,
    };
  }
  return null;
}

const TITLES: Record<
  Exclude<ParsedWindowId["kind"], "board" | "workspace">,
  string
> = {
  find: "Find Work",
  "new-work": "New Work",
  "new-workspace": "New Workspace",
  help: "Kanban Help",
  invitations: "Invitations",
  "log-off": "Log Off",
  "shut-down": "Shut Down Windows",
  invite: "Invite Users",
  "rename-workspace": "Rename Workspace",
  "delete-workspace": "Delete Workspace",
  "leave-workspace": "Leave Workspace",
};

export function windowTitle(
  id: WindowId,
  workspaces: { _id: Id<"workspaces">; name: string }[] = [],
): string {
  const parsed = parseWindowId(id);
  if (!parsed) return id;
  if (parsed.kind === "board") return boardLabel(parsed.board);
  if (parsed.kind === "workspace") {
    return (
      workspaces.find((workspace) => workspace._id === parsed.workspaceId)
        ?.name ?? "Workspace"
    );
  }
  return TITLES[parsed.kind];
}

export function defaultWindowSize(id: WindowId): { w: number; h: number } {
  const parsed = parseWindowId(id);
  switch (parsed?.kind) {
    case "find":
    case "invitations":
      return { w: 400, h: 320 };
    case "invite":
      return { w: 400, h: 380 };
    case "help":
      return { w: 380, h: 320 };
    case "new-work":
    case "new-workspace":
    case "rename-workspace":
    case "delete-workspace":
    case "leave-workspace":
    case "log-off":
    case "shut-down":
      return { w: 360, h: 220 };
    default:
      return { w: 520, h: 360 };
  }
}

export function boundWorkspaceId(id: WindowId): Id<"workspaces"> | null {
  const parsed = parseWindowId(id);
  if (!parsed) return null;
  if (
    parsed.kind === "workspace" ||
    parsed.kind === "invite" ||
    parsed.kind === "rename-workspace" ||
    parsed.kind === "delete-workspace" ||
    parsed.kind === "leave-workspace"
  ) {
    return parsed.workspaceId;
  }
  return null;
}
