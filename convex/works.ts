import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireMembership, requireUserId } from "./lib";
import { boardValidator } from "./schema";

const workReturn = v.object({
  _id: v.id("works"),
  _creationTime: v.number(),
  userId: v.id("users"),
  board: v.optional(boardValidator),
  workspaceId: v.optional(v.id("workspaces")),
  workspaceName: v.optional(v.string()),
  title: v.string(),
  done: v.optional(v.boolean()),
});

function withWorkspaceName(work: Doc<"works">, workspaceName?: string) {
  return {
    _id: work._id,
    _creationTime: work._creationTime,
    userId: work.userId,
    board: work.board,
    workspaceId: work.workspaceId,
    workspaceName,
    title: work.title,
    done: work.done,
  };
}

async function requireWorkAccess(
  ctx: Parameters<typeof requireUserId>[0],
  work: Doc<"works"> | null,
) {
  const userId = await requireUserId(ctx);
  if (!work) {
    throw new Error("Not found");
  }
  if (work.workspaceId) {
    await requireMembership(ctx, work.workspaceId);
    return work;
  }
  if (work.userId !== userId) {
    throw new Error("Not found");
  }
  return work;
}

export const list = query({
  args: {
    board: v.optional(boardValidator),
    workspaceId: v.optional(v.id("workspaces")),
  },
  returns: v.array(workReturn),
  handler: async (ctx, args) => {
    if (args.workspaceId && args.board) {
      throw new Error("Not found");
    }
    if (args.workspaceId) {
      const { workspace } = await requireMembership(ctx, args.workspaceId);
      const works = await ctx.db
        .query("works")
        .withIndex("by_workspaceId", (q) =>
          q.eq("workspaceId", args.workspaceId),
        )
        .order("desc")
        .take(200);
      return works.map((work) => withWorkspaceName(work, workspace.name));
    }
    if (!args.board) {
      throw new Error("Not found");
    }
    const userId = await requireUserId(ctx);
    const works = await ctx.db
      .query("works")
      .withIndex("by_userId_and_board", (q) =>
        q.eq("userId", userId).eq("board", args.board),
      )
      .order("desc")
      .take(200);
    return works.map((work) => withWorkspaceName(work));
  },
});

export const listAll = query({
  args: {},
  returns: v.array(workReturn),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const personal = await ctx.db
      .query("works")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(500);
    const items = personal
      .filter((work) => work.workspaceId === undefined)
      .map((work) => withWorkspaceName(work));
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(50);
    for (const membership of memberships) {
      const workspace = await ctx.db.get(membership.workspaceId);
      if (!workspace) {
        continue;
      }
      const works = await ctx.db
        .query("works")
        .withIndex("by_workspaceId", (q) =>
          q.eq("workspaceId", membership.workspaceId),
        )
        .order("desc")
        .take(200);
      for (const work of works) {
        items.push(withWorkspaceName(work, workspace.name));
      }
    }
    return items;
  },
});

export const create = mutation({
  args: {
    board: v.optional(boardValidator),
    workspaceId: v.optional(v.id("workspaces")),
    title: v.string(),
  },
  returns: v.id("works"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const title = args.title.trim();
    if (title.length === 0) {
      throw new Error("Title is required");
    }
    if (args.workspaceId && args.board) {
      throw new Error("Not found");
    }
    if (args.workspaceId) {
      await requireMembership(ctx, args.workspaceId);
      return await ctx.db.insert("works", {
        userId,
        workspaceId: args.workspaceId,
        title,
      });
    }
    if (!args.board) {
      throw new Error("Not found");
    }
    return await ctx.db.insert("works", {
      userId,
      board: args.board,
      title,
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("works"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const work = await ctx.db.get(args.id);
    await requireWorkAccess(ctx, work);
    await ctx.db.delete(args.id);
    return null;
  },
});

export const move = mutation({
  args: {
    id: v.id("works"),
    board: boardValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const work = await ctx.db.get(args.id);
    if (!work || work.userId !== userId || work.workspaceId) {
      throw new Error("Not found");
    }
    if (work.board === args.board) {
      return null;
    }
    await ctx.db.patch(args.id, { board: args.board });
    return null;
  },
});

export const setDone = mutation({
  args: {
    id: v.id("works"),
    done: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const work = await ctx.db.get(args.id);
    await requireWorkAccess(ctx, work);
    await ctx.db.patch(args.id, { done: args.done });
    return null;
  },
});

export const rename = mutation({
  args: {
    id: v.id("works"),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const work = await ctx.db.get(args.id);
    await requireWorkAccess(ctx, work);
    const title = args.title.trim();
    if (title.length === 0) {
      throw new Error("Title is required");
    }
    await ctx.db.patch(args.id, { title });
    return null;
  },
});
