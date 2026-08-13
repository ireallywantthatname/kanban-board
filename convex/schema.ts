import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const boardValidator = v.union(
  v.literal("all"),
  v.literal("today"),
  v.literal("this_week"),
  v.literal("later"),
);

export default defineSchema({
  ...authTables,
  works: defineTable({
    userId: v.id("users"),
    board: boardValidator,
    title: v.string(),
  })
    .index("by_userId_and_board", ["userId", "board"])
    .index("by_userId", ["userId"]),
});
