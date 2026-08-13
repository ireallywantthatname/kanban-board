import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  normalizeEmail,
  requireMembership,
  requireUserId,
} from "./lib";

const pendingInviteReturn = v.object({
  _id: v.id("workspaceInvites"),
  workspaceId: v.id("workspaces"),
  workspaceName: v.string(),
  invitedByName: v.optional(v.string()),
  invitedByEmail: v.optional(v.string()),
  email: v.string(),
});

const workspaceInviteReturn = v.object({
  _id: v.id("workspaceInvites"),
  email: v.string(),
  invitedBy: v.id("users"),
});

export const invite = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
  },
  returns: v.id("workspaceInvites"),
  handler: async (ctx, args) => {
    const { userId } = await requireMembership(ctx, args.workspaceId);
    const email = normalizeEmail(args.email);
    if (email.length === 0) {
      throw new Error("Email is required");
    }
    const caller = await ctx.db.get(userId);
    if (caller?.email && normalizeEmail(caller.email) === email) {
      throw new Error("You cannot invite yourself");
    }
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (existingUser) {
      const member = await ctx.db
        .query("workspaceMembers")
        .withIndex("by_workspaceId_and_userId", (q) =>
          q
            .eq("workspaceId", args.workspaceId)
            .eq("userId", existingUser._id),
        )
        .unique();
      if (member) {
        throw new Error("Already a member");
      }
    }
    const existingInvite = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_workspaceId_and_email", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("email", email),
      )
      .unique();
    if (existingInvite) {
      throw new Error("Already invited");
    }
    return await ctx.db.insert("workspaceInvites", {
      workspaceId: args.workspaceId,
      email,
      invitedBy: userId,
    });
  },
});

export const listPending = query({
  args: {},
  returns: v.array(pendingInviteReturn),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user?.email) {
      return [];
    }
    const email = normalizeEmail(user.email);
    const invites = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_email", (q) => q.eq("email", email))
      .take(50);
    const result = [];
    for (const invite of invites) {
      const workspace = await ctx.db.get(invite.workspaceId);
      if (!workspace) {
        continue;
      }
      const inviter = await ctx.db.get(invite.invitedBy);
      result.push({
        _id: invite._id,
        workspaceId: invite.workspaceId,
        workspaceName: workspace.name,
        invitedByName: inviter?.name,
        invitedByEmail: inviter?.email,
        email: invite.email,
      });
    }
    return result;
  },
});

export const listForWorkspace = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  returns: v.array(workspaceInviteReturn),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.workspaceId);
    const invites = await ctx.db
      .query("workspaceInvites")
      .withIndex("by_workspaceId", (q) =>
        q.eq("workspaceId", args.workspaceId),
      )
      .take(100);
    return invites.map((invite) => ({
      _id: invite._id,
      email: invite.email,
      invitedBy: invite.invitedBy,
    }));
  },
});

export const accept = mutation({
  args: {
    inviteId: v.id("workspaceInvites"),
  },
  returns: v.id("workspaces"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Not found");
    }
    const user = await ctx.db.get(userId);
    if (!user?.email || normalizeEmail(user.email) !== invite.email) {
      throw new Error("Not found");
    }
    const workspace = await ctx.db.get(invite.workspaceId);
    if (!workspace) {
      await ctx.db.delete(args.inviteId);
      throw new Error("Not found");
    }
    const existing = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspaceId_and_userId", (q) =>
        q.eq("workspaceId", invite.workspaceId).eq("userId", userId),
      )
      .unique();
    if (!existing) {
      await ctx.db.insert("workspaceMembers", {
        workspaceId: invite.workspaceId,
        userId,
        role: "member",
      });
    }
    await ctx.db.delete(args.inviteId);
    return invite.workspaceId;
  },
});

export const decline = mutation({
  args: {
    inviteId: v.id("workspaceInvites"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Not found");
    }
    const user = await ctx.db.get(userId);
    if (!user?.email || normalizeEmail(user.email) !== invite.email) {
      throw new Error("Not found");
    }
    await ctx.db.delete(args.inviteId);
    return null;
  },
});

export const revoke = mutation({
  args: {
    inviteId: v.id("workspaceInvites"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Not found");
    }
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspaceId_and_userId", (q) =>
        q.eq("workspaceId", invite.workspaceId).eq("userId", userId),
      )
      .unique();
    const isOwner = membership?.role === "owner";
    const isSender = invite.invitedBy === userId;
    if (!isOwner && !isSender) {
      throw new Error("Not found");
    }
    await ctx.db.delete(args.inviteId);
    return null;
  },
});
