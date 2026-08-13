import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const boardValidator = v.union(
  v.literal("all"),
  v.literal("today"),
  v.literal("this_week"),
  v.literal("later"),
);

export const memberRoleValidator = v.union(
  v.literal("owner"),
  v.literal("member"),
);

export default defineSchema({
  ...authTables,
  works: defineTable({
    userId: v.id("users"),
    board: v.optional(boardValidator),
    workspaceId: v.optional(v.id("workspaces")),
    title: v.string(),
    done: v.optional(v.boolean()),
  })
    .index("by_userId_and_board", ["userId", "board"])
    .index("by_userId", ["userId"])
    .index("by_workspaceId", ["workspaceId"]),
  workspaces: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
  }).index("by_ownerId", ["ownerId"]),
  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: memberRoleValidator,
  })
    .index("by_workspaceId", ["workspaceId"])
    .index("by_userId", ["userId"])
    .index("by_workspaceId_and_userId", ["workspaceId", "userId"]),
  workspaceInvites: defineTable({
    workspaceId: v.id("workspaces"),
    email: v.string(),
    invitedBy: v.id("users"),
  })
    .index("by_email", ["email"])
    .index("by_workspaceId", ["workspaceId"])
    .index("by_workspaceId_and_email", ["workspaceId", "email"]),
});
