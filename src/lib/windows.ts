import type { Id } from "../../convex/_generated/dataModel";
import { isBoardId, type BoardId } from "@/lib/boards";

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