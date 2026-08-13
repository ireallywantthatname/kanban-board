import type { Id } from "../../convex/_generated/dataModel";
import { boardLabel, isBoardId, type BoardId } from "@/lib/boards";

export type WindowId = BoardId | `ws:${string}`;

export function workspaceWindowId(id: Id<"workspaces">): WindowId {
  return `ws:${id}`;
}

export function parseWindowId(
  id: string,
):
  | { kind: "board"; board: BoardId }
  | { kind: "workspace"; workspaceId: Id<"workspaces"> }
  | null {
  if (isBoardId(id)) {
    return { kind: "board", board: id };
  }
  if (id.startsWith("ws:") && id.length > 3) {
    return {
      kind: "workspace",
      workspaceId: id.slice(3) as Id<"workspaces">,
    };
  }
  return null;
}

export function windowTitle(
  id: WindowId,
  workspaces: { _id: Id<"workspaces">; name: string }[] = [],
): string {
  const parsed = parseWindowId(id);
  if (!parsed) return id;
  if (parsed.kind === "board") return boardLabel(parsed.board);
  return (
    workspaces.find((workspace) => workspace._id === parsed.workspaceId)
      ?.name ?? "Workspace"
  );
}