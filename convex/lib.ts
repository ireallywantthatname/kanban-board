import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export async function requireUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Not signed in");
  }
  return userId;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function requireMembership(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
): Promise<{
  userId: Id<"users">;
  workspace: Doc<"workspaces">;
  member: Doc<"workspaceMembers">;
}> {
  const userId = await requireUserId(ctx);
  const workspace = await ctx.db.get(workspaceId);
  if (!workspace) {
    throw new Error("Not found");
  }
  const member = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspaceId_and_userId", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId),
    )
    .unique();
  if (!member) {
    throw new Error("Not found");
  }
  return { userId, workspace, member };
}

export async function requireWorkspaceOwner(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
): Promise<{
  userId: Id<"users">;
  workspace: Doc<"workspaces">;
  member: Doc<"workspaceMembers">;
}> {
  const result = await requireMembership(ctx, workspaceId);
  if (result.member.role !== "owner") {
    throw new Error("Only the owner can do that");
  }
  return result;
}
