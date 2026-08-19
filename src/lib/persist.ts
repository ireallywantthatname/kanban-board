"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import type { BoardId } from "@/lib/boards";
import {
  type CachedSession,
  type CachedWork,
  type CachedWorkspace,
  db,
} from "@/lib/db";
import type { WindowFrame, WindowGeom, WindowId } from "@/lib/window-shell";
import { type ParsedWindowId, parseWindowId } from "@/lib/windows";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export type WorkRow = FunctionReturnType<typeof api.works.list>[number];
export type WorkspaceRow = FunctionReturnType<
  typeof api.workspaces.listMine
>[number];

type WorksArgs =
  | { board: BoardId }
  | { workspaceId: Id<"workspaces"> }
  | "skip";

const PERSISTABLE_KINDS = new Set<ParsedWindowId["kind"]>([
  "board",
  "workspace",
  "find",
  "help",
  "invitations",
]);

function boardSnapshotKey(userId: string, board: BoardId) {
  return `board:${userId}:${board}`;
}

function workspaceWorksSnapshotKey(userId: string, workspaceId: string) {
  return `workspaceWorks:${userId}:${workspaceId}`;
}

function worksAllSnapshotKey(userId: string) {
  return `worksAll:${userId}`;
}

function workspacesSnapshotKey(userId: string) {
  return `workspaces:${userId}`;
}

function toCachedWork(userId: string, work: WorkRow): CachedWork {
  return {
    userId,
    workId: work._id,
    ownerId: work.userId,
    board: work.board,
    workspaceId: work.workspaceId,
    workspaceName: work.workspaceName,
    title: work.title,
    done: work.done,
    creationTime: work._creationTime,
  };
}

function fromCachedWork(row: CachedWork): WorkRow {
  return {
    _id: row.workId as Id<"works">,
    _creationTime: row.creationTime,
    userId: row.ownerId as Id<"users">,
    board: row.board,
    workspaceId: row.workspaceId as Id<"workspaces"> | undefined,
    workspaceName: row.workspaceName,
    title: row.title,
    done: row.done,
  };
}

function toCachedWorkspace(
  userId: string,
  workspace: WorkspaceRow,
): CachedWorkspace {
  return {
    userId,
    workspaceId: workspace._id,
    name: workspace.name,
    ownerId: workspace.ownerId,
    role: workspace.role,
  };
}

function fromCachedWorkspace(row: CachedWorkspace): WorkspaceRow {
  return {
    _id: row.workspaceId as Id<"workspaces">,
    name: row.name,
    ownerId: row.ownerId as Id<"users">,
    role: row.role,
  };
}

function sortWorks(rows: CachedWork[]) {
  return rows
    .slice()
    .sort((a, b) => b.creationTime - a.creationTime)
    .map(fromCachedWork);
}

async function hasSnapshot(key: string) {
  const store = db;
  if (!store) return false;
  return (await store.snapshots.get(key)) !== undefined;
}

export async function replaceBoardWorks(
  userId: string,
  board: BoardId,
  works: WorkRow[],
) {
  const store = db;
  if (!store) return;
  const rows = works.map((work) => toCachedWork(userId, work));
  await store.transaction("rw", store.works, store.snapshots, async () => {
    await store.works.where("[userId+board]").equals([userId, board]).delete();
    if (rows.length > 0) {
      await store.works.bulkPut(rows);
    }
    await store.snapshots.put({ key: boardSnapshotKey(userId, board) });
  });
}

export async function replaceWorkspaceWorks(
  userId: string,
  workspaceId: Id<"workspaces">,
  works: WorkRow[],
) {
  const store = db;
  if (!store) return;
  const rows = works.map((work) => toCachedWork(userId, work));
  await store.transaction("rw", store.works, store.snapshots, async () => {
    await store.works
      .where("[userId+workspaceId]")
      .equals([userId, workspaceId])
      .delete();
    if (rows.length > 0) {
      await store.works.bulkPut(rows);
    }
    await store.snapshots.put({
      key: workspaceWorksSnapshotKey(userId, workspaceId),
    });
  });
}

export async function replaceAllWorks(userId: string, works: WorkRow[]) {
  const store = db;
  if (!store) return;
  const rows = works.map((work) => toCachedWork(userId, work));
  const boards = new Set<BoardId>();
  const workspaceIds = new Set<string>();
  for (const work of works) {
    if (work.board) boards.add(work.board);
    if (work.workspaceId) workspaceIds.add(work.workspaceId);
  }
  await store.transaction("rw", store.works, store.snapshots, async () => {
    await store.works.where("userId").equals(userId).delete();
    if (rows.length > 0) {
      await store.works.bulkPut(rows);
    }
    await store.snapshots.put({ key: worksAllSnapshotKey(userId) });
    for (const board of boards) {
      await store.snapshots.put({ key: boardSnapshotKey(userId, board) });
    }
    for (const workspaceId of workspaceIds) {
      await store.snapshots.put({
        key: workspaceWorksSnapshotKey(userId, workspaceId),
      });
    }
  });
}

export async function replaceWorkspaces(
  userId: string,
  workspaces: WorkspaceRow[],
) {
  const store = db;
  if (!store) return;
  const rows = workspaces.map((workspace) =>
    toCachedWorkspace(userId, workspace),
  );
  await store.transaction("rw", store.workspaces, store.snapshots, async () => {
    await store.workspaces.where("userId").equals(userId).delete();
    if (rows.length > 0) {
      await store.workspaces.bulkPut(rows);
    }
    await store.snapshots.put({ key: workspacesSnapshotKey(userId) });
  });
}

function parseGeom(value: unknown): WindowGeom | null {
  if (!value || typeof value !== "object") return null;
  const geom = value as Record<string, unknown>;
  if (
    typeof geom.x !== "number" ||
    typeof geom.y !== "number" ||
    typeof geom.w !== "number" ||
    typeof geom.h !== "number"
  ) {
    return null;
  }
  return { x: geom.x, y: geom.y, w: geom.w, h: geom.h };
}

function parseFrame(value: unknown): WindowFrame | null {
  if (!value || typeof value !== "object") return null;
  const frame = value as Record<string, unknown>;
  if (typeof frame.id !== "string") return null;
  const parsed = parseWindowId(frame.id);
  if (!parsed || !PERSISTABLE_KINDS.has(parsed.kind)) return null;
  if (typeof frame.minimized !== "boolean") return null;
  if (typeof frame.maximized !== "boolean") return null;
  let geom: WindowGeom | null = null;
  if (frame.geom != null) {
    geom = parseGeom(frame.geom);
    if (!geom) return null;
  }
  let restoreGeom: WindowGeom | null = null;
  if (frame.restoreGeom != null) {
    restoreGeom = parseGeom(frame.restoreGeom);
    if (!restoreGeom) return null;
  }
  return {
    id: frame.id as WindowId,
    minimized: frame.minimized,
    maximized: frame.maximized,
    geom,
    restoreGeom,
  };
}

export function persistableSession(
  frames: WindowFrame[],
  focusOrder: WindowId[],
): { frames: WindowFrame[]; focusOrder: WindowId[] } {
  const nextFrames = frames.filter((frame) => {
    const parsed = parseWindowId(frame.id);
    return parsed !== null && PERSISTABLE_KINDS.has(parsed.kind);
  });
  const ids = new Set(nextFrames.map((frame) => frame.id));
  return {
    frames: nextFrames,
    focusOrder: focusOrder.filter((id) => ids.has(id)),
  };
}

export async function saveSession(
  userId: string,
  frames: WindowFrame[],
  focusOrder: WindowId[],
) {
  if (!db) return;
  const session = persistableSession(frames, focusOrder);
  await db.sessions.put({
    userId,
    frames: session.frames,
    focusOrder: session.focusOrder,
    updatedAt: Date.now(),
  });
}

export async function loadSession(
  userId: string,
): Promise<CachedSession | null> {
  if (!db) return null;
  try {
    const row = await db.sessions.get(userId);
    if (!row || !Array.isArray(row.frames) || !Array.isArray(row.focusOrder)) {
      return null;
    }
    const frames = row.frames
      .map(parseFrame)
      .filter((frame): frame is WindowFrame => frame !== null);
    const ids = new Set(frames.map((frame) => frame.id));
    const focusOrder = row.focusOrder.filter(
      (id): id is WindowId => typeof id === "string" && ids.has(id as WindowId),
    );
    return {
      userId,
      frames,
      focusOrder,
      updatedAt: row.updatedAt,
    };
  } catch {
    return null;
  }
}

export function useCachedWorks(args: WorksArgs) {
  const me = useQuery(api.users.current, args === "skip" ? "skip" : {});
  const userId = me?._id;
  const remote = useQuery(
    api.works.list,
    args === "skip" || !userId ? "skip" : args,
  );
  const board = args !== "skip" && "board" in args ? args.board : undefined;
  const workspaceId =
    args !== "skip" && "workspaceId" in args ? args.workspaceId : undefined;

  const cached = useLiveQuery(async () => {
    if (!db || !userId || args === "skip") return undefined;
    if (board) {
      const warmed =
        (await hasSnapshot(boardSnapshotKey(userId, board))) ||
        (await hasSnapshot(worksAllSnapshotKey(userId)));
      if (!warmed) return undefined;
      const rows = await db.works
        .where("[userId+board]")
        .equals([userId, board])
        .toArray();
      return sortWorks(rows);
    }
    if (workspaceId) {
      const warmed =
        (await hasSnapshot(workspaceWorksSnapshotKey(userId, workspaceId))) ||
        (await hasSnapshot(worksAllSnapshotKey(userId)));
      if (!warmed) return undefined;
      const rows = await db.works
        .where("[userId+workspaceId]")
        .equals([userId, workspaceId])
        .toArray();
      return sortWorks(rows);
    }
    return undefined;
  }, [userId, board, workspaceId, args === "skip"]);

  useEffect(() => {
    if (!userId || remote === undefined) return;
    if (board) {
      void replaceBoardWorks(userId, board, remote);
      return;
    }
    if (workspaceId) {
      void replaceWorkspaceWorks(userId, workspaceId, remote);
    }
  }, [userId, board, workspaceId, remote]);

  return remote ?? cached;
}

export function useCachedWorksAll() {
  const me = useQuery(api.users.current);
  const userId = me?._id;
  const remote = useQuery(api.works.listAll, userId ? {} : "skip");

  const cached = useLiveQuery(async () => {
    if (!db || !userId) return undefined;
    if (!(await hasSnapshot(worksAllSnapshotKey(userId)))) return undefined;
    const rows = await db.works.where("userId").equals(userId).toArray();
    return sortWorks(rows);
  }, [userId]);

  useEffect(() => {
    if (!userId || remote === undefined) return;
    void replaceAllWorks(userId, remote);
  }, [userId, remote]);

  return remote ?? cached;
}

export function useCachedWorkspaces(enabled = true) {
  const me = useQuery(api.users.current, enabled ? {} : "skip");
  const userId = me?._id;
  const remote = useQuery(
    api.workspaces.listMine,
    enabled && userId ? {} : "skip",
  );

  const cached = useLiveQuery(async () => {
    if (!db || !userId || !enabled) return undefined;
    if (!(await hasSnapshot(workspacesSnapshotKey(userId)))) return undefined;
    const rows = await db.workspaces.where("userId").equals(userId).toArray();
    return rows.map(fromCachedWorkspace);
  }, [userId, enabled]);

  useEffect(() => {
    if (!userId || remote === undefined) return;
    void replaceWorkspaces(userId, remote);
  }, [userId, remote]);

  return remote ?? cached;
}
