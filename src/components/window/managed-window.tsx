"use client";

import { Windows95NetworkNeighborhood } from "react-old-icons";
import { BoardWindow } from "@/components/board/board-window";
import { ConfirmDialog } from "@/components/desktop/confirm-dialog";
import { FindDialog } from "@/components/desktop/find-dialog";
import { HelpDialog } from "@/components/desktop/help-dialog";
import { InvitationsDialog } from "@/components/desktop/invitations-dialog";
import { InviteDialog } from "@/components/desktop/invite-dialog";
import { NameWorkspaceDialog } from "@/components/desktop/name-workspace-dialog";
import { NewWorkDialog } from "@/components/desktop/new-work-dialog";
import { SessionDialog } from "@/components/desktop/session-dialog";
import type { WindowChrome, WindowId } from "@/lib/windows";
import { parseWindowId, windowTitle } from "@/lib/windows";
import type { Id } from "../../../convex/_generated/dataModel";

export type WorkspaceInfo = {
  _id: Id<"workspaces">;
  name: string;
  role?: "owner" | "member";
};

type ManagedWindowProps = WindowChrome & {
  id: WindowId;
  workspaces: WorkspaceInfo[];
  onOpenBoard: (id: WindowId) => void;
  onInvite?: (workspaceId: Id<"workspaces">) => void;
  onWorkCreated: (id: WindowId) => void;
  onInviteAccepted: (workspaceId: Id<"workspaces">) => void;
  onCreateWorkspace: (name: string) => Promise<void>;
  onRenameWorkspace: (
    workspaceId: Id<"workspaces">,
    name: string,
  ) => Promise<void>;
  onDeleteWorkspace: (workspaceId: Id<"workspaces">) => Promise<void>;
  onLeaveWorkspace: (workspaceId: Id<"workspaces">) => Promise<void>;
  onLogOff: () => void;
  onShutDown: () => void;
};

export function ManagedWindow({
  id,
  workspaces,
  onOpenBoard,
  onInvite,
  onWorkCreated,
  onInviteAccepted,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
  onLeaveWorkspace,
  onLogOff,
  onShutDown,
  ...chrome
}: ManagedWindowProps) {
  const parsed = parseWindowId(id);
  if (!parsed) return null;

  if (parsed.kind === "board") {
    return (
      <BoardWindow board={parsed.board} className="h-full w-full" {...chrome} />
    );
  }

  if (parsed.kind === "workspace") {
    return (
      <BoardWindow
        workspaceId={parsed.workspaceId}
        workspaceName={windowTitle(id, workspaces)}
        onInvite={onInvite ? () => onInvite(parsed.workspaceId) : undefined}
        className="h-full w-full"
        {...chrome}
      />
    );
  }

  if (parsed.kind === "find") {
    return <FindDialog onOpenBoard={onOpenBoard} {...chrome} />;
  }

  if (parsed.kind === "new-work") {
    return <NewWorkDialog onCreated={onWorkCreated} {...chrome} />;
  }

  if (parsed.kind === "help") {
    return <HelpDialog {...chrome} />;
  }

  if (parsed.kind === "invitations") {
    return <InvitationsDialog onAccepted={onInviteAccepted} {...chrome} />;
  }

  if (parsed.kind === "new-workspace") {
    return (
      <NameWorkspaceDialog
        title="New Workspace"
        message="Type a name for the workspace."
        onSubmit={onCreateWorkspace}
        {...chrome}
      />
    );
  }

  if (parsed.kind === "invite") {
    const workspace = workspaces.find((w) => w._id === parsed.workspaceId);
    return (
      <InviteDialog
        workspaceId={parsed.workspaceId}
        isOwner={workspace?.role === "owner"}
        {...chrome}
      />
    );
  }

  if (parsed.kind === "rename-workspace") {
    const workspace = workspaces.find((w) => w._id === parsed.workspaceId);
    return (
      <NameWorkspaceDialog
        title="Rename Workspace"
        message="Type a new name for the workspace."
        initialName={workspace?.name ?? ""}
        onSubmit={(name) => onRenameWorkspace(parsed.workspaceId, name)}
        {...chrome}
      />
    );
  }

  if (parsed.kind === "delete-workspace") {
    const workspace = workspaces.find((w) => w._id === parsed.workspaceId);
    return (
      <ConfirmDialog
        title="Delete Workspace"
        message={`Delete ${workspace?.name ?? "Workspace"}? All works will be removed.`}
        confirmLabel="Yes"
        cancelLabel="No"
        Icon={Windows95NetworkNeighborhood}
        onConfirm={() => onDeleteWorkspace(parsed.workspaceId)}
        {...chrome}
      />
    );
  }

  if (parsed.kind === "leave-workspace") {
    const workspace = workspaces.find((w) => w._id === parsed.workspaceId);
    return (
      <ConfirmDialog
        title="Leave Workspace"
        message={`Leave ${workspace?.name ?? "Workspace"}?`}
        confirmLabel="Yes"
        cancelLabel="No"
        Icon={Windows95NetworkNeighborhood}
        onConfirm={() => onLeaveWorkspace(parsed.workspaceId)}
        {...chrome}
      />
    );
  }

  if (parsed.kind === "log-off") {
    return <SessionDialog kind="log-off" onConfirm={onLogOff} {...chrome} />;
  }

  return <SessionDialog kind="shut-down" onConfirm={onShutDown} {...chrome} />;
}
