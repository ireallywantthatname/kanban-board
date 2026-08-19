import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  mutation,
  query,
} from "./_generated/server";
import { requireMembership, requireUserId, requireWorkspaceOwner } from "./lib";
import { memberRoleValidator } from "./schema";

const PURGE_BATCH = 80;

const workspaceReturn = v.object({
  _id: v.id("workspaces"),
  name: v.string(),
  ownerId: v.id("users"),
  role: memberRoleValidator,
});

const memberReturn = v.object({
  _id: v.id("workspaceMembers"),
  userId: v.id("users"),
  role: memberRoleValidator,
  email: v.optional(v.string()),
  name: v.optional(v.string()),
});

export const listMine = query({
  args: {},
  returns: v.array(workspaceReturn),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(100);
    const result = [];
    for (const membership of memberships) {
      const workspace = await ctx.db.get(membership.workspaceId);
      if (!workspace) {
        continue;
      }
      result.push({
        _id: workspace._id,
        name: workspace.name,
        ownerId: workspace.ownerId,
        role: membership.role,
      });
    }
    return result;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
  },
  returns: v.id("workspaces"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = args.name.trim();
    if (name.length === 0) {
      throw new Error("Name is required");
    }
    const workspaceId = await ctx.db.insert("workspaces", {
      name,
      ownerId: userId,
    });
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId,
      role: "owner",
    });
    return workspaceId;
  },
});

export const rename = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireWorkspaceOwner(ctx, args.workspaceId);
    const name = args.name.trim();
    if (name.length === 0) {
      throw new Error("Name is required");
    }
    await ctx.db.patch(args.workspaceId, { name });
    return null;
  },
});

export const remove = mutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireWorkspaceOwner(ctx, args.workspaceId);
    await ctx.runMutation(internal.workspaces.purgeWorkspace, {
      workspaceId: args.workspaceId,
    });
    return null;
  },
});

export const leave = mutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { member } = await requireMembership(ctx, args.workspaceId);
    if (member.role === "owner") {
      throw new Error("Owners cannot leave");
    }
    await ctx.db.delete(member._id);
    return null;
  },
});

export const listMembers = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  returns: v.array(memberReturn),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.workspaceId);
    const members = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspaceId", (q) => q.eq("workspaceId", args.workspaceId))
      .take(100);
    const result = [];
    for (const member of members) {
      const user = await ctx.db.get(member.userId);
      result.push({
        _id: member._id,
        userId: member.userId,
        role: member.role,
        email: user?.email,
        name: user?.name,
      });
    }
    return result;
  },
});

export const removeMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId } = await requireWorkspaceOwner(ctx, args.workspaceId);
    if (args.userId === userId) {
      throw new Error("Owners cannot leave");
    }
    const member = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspaceId_and_userId", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", args.userId),
      )
      .unique();
    if (!member) {
      throw new Error("Not found");
    }
    await ctx.db.delete(member._id);
    return null;
  },
});

async function deleteIndexedBatch(
  ctx: MutationCtx,
  table: "works" | "workspaceInvites" | "workspaceMembers",
  workspaceId: Id<"workspaces">,
): Promise<boolean> {
  const rows =
    table === "works"
      ? await ctx.db
          .query("works")
          .withIndex("by_workspaceId", (q) => q.eq("workspaceId", workspaceId))
          .take(PURGE_BATCH)
      : table === "workspaceInvites"
        ? await ctx.db
            .query("workspaceInvites")
            .withIndex("by_workspaceId", (q) =>
              q.eq("workspaceId", workspaceId),
            )
            .take(PURGE_BATCH)
        : await ctx.db
            .query("workspaceMembers")
            .withIndex("by_workspaceId", (q) =>
              q.eq("workspaceId", workspaceId),
            )
            .take(PURGE_BATCH);
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length === PURGE_BATCH;
}

export const purgeWorkspace = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      return null;
    }
    if (await deleteIndexedBatch(ctx, "works", args.workspaceId)) {
      await ctx.scheduler.runAfter(0, internal.workspaces.purgeWorkspace, args);
      return null;
    }
    if (await deleteIndexedBatch(ctx, "workspaceInvites", args.workspaceId)) {
      await ctx.scheduler.runAfter(0, internal.workspaces.purgeWorkspace, args);
      return null;
    }
    if (await deleteIndexedBatch(ctx, "workspaceMembers", args.workspaceId)) {
      await ctx.scheduler.runAfter(0, internal.workspaces.purgeWorkspace, args);
      return null;
    }
    await ctx.db.delete(args.workspaceId);
    return null;
  },
});
