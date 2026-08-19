import Dexie, { type Table } from "dexie";
import type { BoardId } from "@/lib/boards";
import type { WindowFrame, WindowId } from "@/lib/window-shell";

export type CachedWork = {
  userId: string;
  workId: string;
  ownerId: string;
  board?: BoardId;
  workspaceId?: string;
  workspaceName?: string;
  title: string;
  done?: boolean;
  creationTime: number;
};

export type CachedWorkspace = {
  userId: string;
  workspaceId: string;
  name: string;
  ownerId: string;
  role: "owner" | "member";
};

export type CachedSession = {
  userId: string;
  frames: WindowFrame[];
  focusOrder: WindowId[];
  updatedAt: number;
};

export type CachedSnapshot = {
  key: string;
};

export class KanbanDB extends Dexie {
  works!: Table<CachedWork, [string, string]>;
  workspaces!: Table<CachedWorkspace, [string, string]>;
  sessions!: Table<CachedSession, string>;
  snapshots!: Table<CachedSnapshot, string>;

  constructor() {
    super("kanban");
    this.version(1).stores({
      works:
        "[userId+workId], userId, [userId+board], [userId+workspaceId]",
      workspaces: "[userId+workspaceId], userId",
      sessions: "userId",
      snapshots: "key",
    });
  }
}

export const db =
  typeof indexedDB === "undefined" ? null : new KanbanDB();
