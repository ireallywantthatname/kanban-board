import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { boardValidator } from "./schema";
import { requireUserId } from "./lib";

const workReturn = v.object({
  _id: v.id("works"),
  _creationTime: v.number(),
  userId: v.id("users"),
  board: boardValidator,
  title: v.string(),
});

export const list = query({
  args: {
    board: boardValidator,
  },
  returns: v.array(workReturn),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("works")
      .withIndex("by_userId_and_board", (q) =>
        q.eq("userId", userId).eq("board", args.board),
      )
      .order("desc")
      .take(200);
  },
});

export const listAll = query({
  args: {},
  returns: v.array(workReturn),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("works")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(500);
  },
});

export const create = mutation({
  args: {
    board: boardValidator,
    title: v.string(),
  },
  returns: v.id("works"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const title = args.title.trim();
    if (title.length === 0) {
      throw new Error("Title is required");
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
    const userId = await requireUserId(ctx);
    const work = await ctx.db.get(args.id);
    if (!work || work.userId !== userId) {
      throw new Error("Not found");
    }
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
    if (!work || work.userId !== userId) {
      throw new Error("Not found");
    }
    if (work.board === args.board) {
      return null;
    }
    await ctx.db.patch(args.id, { board: args.board });
    return null;
  },
});
