"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Windows95Inbox,
  Windows95NetworkNeighborhood,
} from "react-old-icons";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AuthWindow } from "@/components/auth/auth-window";
import { BootScreen } from "@/components/desktop/boot-screen";
import { ConfirmDialog } from "@/components/desktop/confirm-dialog";
import { ContextMenu } from "@/components/desktop/context-menu";
import { DesktopIcon } from "@/components/desktop/desktop-icon";
import { FindDialog } from "@/components/desktop/find-dialog";
import { HelpDialog } from "@/components/desktop/help-dialog";
import { InviteDialog } from "@/components/desktop/invite-dialog";
import { InvitationsDialog } from "@/components/desktop/invitations-dialog";
import { NameWorkspaceDialog } from "@/components/desktop/name-workspace-dialog";
import { NewWorkDialog } from "@/components/desktop/new-work-dialog";
import { SessionDialog } from "@/components/desktop/session-dialog";
import { Taskbar } from "@/components/desktop/taskbar";
import { WindowManager } from "@/components/window/window-manager";
import {
  animateTitlebar,
  rectFromElement,
  taskbarButtonEl,
  titlebarIconHtml,
  waitFrames,
  windowTitlebarEl,
} from "@/lib/animate-titlebar";
import { BOARDS, type BoardId } from "@/lib/boards";
import type { WindowFrame, WindowGeom, WindowId } from "@/lib/window-shell";
import {
  parseWindowId,
  windowTitle,
  workspaceWindowId,
} from "@/lib/windows";

type IconId = WindowId | "inbox";

type MenuState = {
  x: number;
  y: number;
  target:
    | { kind: "board"; id: BoardId }
    | { kind: "workspace"; id: Id<"workspaces"> };
} | null;

type ShellDialog =
  | null
  | { type: "new-work" }
  | { type: "new-workspace" }
  | { type: "find" }
  | { type: "help" }
  | { type: "log-off" }
  | { type: "shut-down" }
  | { type: "invite"; workspaceId: Id<"workspaces"> }
  | { type: "invitations" }
  | { type: "rename-workspace"; workspaceId: Id<"workspaces">; name: string }
  | { type: "delete-workspace"; workspaceId: Id<"workspaces">; name: string }
  | { type: "leave-workspace"; workspaceId: Id<"workspaces">; name: string };

export function DesktopShell() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const workspaces = useQuery(
    api.workspaces.listMine,
    isAuthenticated ? {} : "skip",
  );
  const pending = useQuery(
    api.invites.listPending,
    isAuthenticated ? {} : "skip",
  );
  const createWorkspace = useMutation(api.workspaces.create);
  const renameWorkspace = useMutation(api.workspaces.rename);
  const removeWorkspace = useMutation(api.workspaces.remove);
  const leaveWorkspace = useMutation(api.workspaces.leave);
  const [frames, setFrames] = useState<WindowFrame[]>([]);
  const [focusOrder, setFocusOrder] = useState<WindowId[]>([]);
  const [selectedIcon, setSelectedIcon] = useState<IconId | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [dialog, setDialog] = useState<ShellDialog>(null);
  const [restoringIds, setRestoringIds] = useState<Set<WindowId>>(
    () => new Set(),
  );
  const animatingRef = useRef<Set<WindowId>>(new Set());
  const openedInvitesRef = useRef(false);
  const workspaceList = workspaces ?? [];
  const titleFor = useCallback(
    (id: WindowId) => windowTitle(id, workspaceList),
    [workspaceList],
  );

  const activeId =
    focusOrder.filter((id) => frames.some((f) => f.id === id && !f.minimized)).at(-1) ??
    frames.filter((f) => !f.minimized).at(-1)?.id ??
    null;

  const setMinimized = useCallback((board: WindowId, minimized: boolean) => {
    setFrames((prev) =>
      prev.map((f) => (f.id === board ? { ...f, minimized } : f)),
    );
  }, []);

  const focusBoard = useCallback((board: WindowId) => {
    setFocusOrder((prev) => [...prev.filter((b) => b !== board), board]);
  }, []);

  const minimizeBoard = useCallback(
    async (board: WindowId) => {
      if (animatingRef.current.has(board)) return;
      const frame = frames.find((f) => f.id === board);
      if (!frame || frame.minimized) return;

      animatingRef.current.add(board);
      try {
        const from = rectFromElement(windowTitlebarEl(board));
        const to = rectFromElement(taskbarButtonEl(board));
        if (from && to) {
          await animateTitlebar(from, to, {
            title: titleFor(board),
            iconHtml: titlebarIconHtml(board),
            active: activeId === board,
          });
        }
        setMinimized(board, true);
      } finally {
        animatingRef.current.delete(board);
      }
    },
    [activeId, frames, setMinimized, titleFor],
  );

  const restoreBoard = useCallback(
    async (board: WindowId) => {
      if (animatingRef.current.has(board)) return;
      const frame = frames.find((f) => f.id === board);
      if (!frame || !frame.minimized) {
        focusBoard(board);
        return;
      }

      animatingRef.current.add(board);
      const from = rectFromElement(taskbarButtonEl(board));

      setRestoringIds((prev) => new Set(prev).add(board));
      setMinimized(board, false);
      focusBoard(board);

      try {
        let to = null as ReturnType<typeof rectFromElement>;
        for (let i = 0; i < 12 && !to; i++) {
          await waitFrames(1);
          to = rectFromElement(windowTitlebarEl(board));
        }
        if (from && to) {
          await animateTitlebar(from, to, {
            title: titleFor(board),
            iconHtml: titlebarIconHtml(board),
            active: true,
          });
        }
      } finally {
        setRestoringIds((prev) => {
          const next = new Set(prev);
          next.delete(board);
          return next;
        });
        animatingRef.current.delete(board);
      }
    },
    [focusBoard, frames, setMinimized, titleFor],
  );

  const openBoard = useCallback(
    (board: WindowId) => {
      const existing = frames.find((f) => f.id === board);
      if (existing) {
        if (existing.minimized) {
          void restoreBoard(board);
        } else {
          focusBoard(board);
        }
        setSelectedIcon(board);
        return;
      }
      setFrames((prev) => [
        ...prev,
        {
          id: board,
          minimized: false,
          maximized: false,
          geom: null,
          restoreGeom: null,
        },
      ]);
      setFocusOrder((prev) => [...prev.filter((b) => b !== board), board]);
      setSelectedIcon(board);
    },
    [focusBoard, frames, restoreBoard],
  );

  const closeBoard = useCallback((board: WindowId) => {
    animatingRef.current.delete(board);
    setRestoringIds((prev) => {
      if (!prev.has(board)) return prev;
      const next = new Set(prev);
      next.delete(board);
      return next;
    });
    setFrames((prev) => prev.filter((f) => f.id !== board));
    setFocusOrder((prev) => prev.filter((b) => b !== board));
  }, []);

  const toggleMaximize = useCallback((board: WindowId) => {
    setFrames((prev) =>
      prev.map((f) => {
        if (f.id !== board) return f;
        if (f.maximized) {
          return {
            ...f,
            maximized: false,
            geom: f.restoreGeom ?? f.geom,
            restoreGeom: null,
          };
        }
        return {
          ...f,
          maximized: true,
          restoreGeom: f.geom,
        };
      }),
    );
    setFocusOrder((prev) => [...prev.filter((b) => b !== board), board]);
  }, []);

  const onGeomChange = useCallback((board: WindowId, geom: WindowGeom) => {
    setFrames((prev) =>
      prev.map((f) =>
        f.id === board ? { ...f, geom, maximized: false } : f,
      ),
    );
  }, []);

  const onTaskButtonClick = useCallback(
    (board: WindowId) => {
      const frame = frames.find((f) => f.id === board);
      if (!frame) return;
      if (frame.minimized) {
        void restoreBoard(board);
        return;
      }
      if (activeId === board) {
        void minimizeBoard(board);
        return;
      }
      focusBoard(board);
    },
    [activeId, focusBoard, frames, minimizeBoard, restoreBoard],
  );

  const closeAllBoards = useCallback(() => {
    animatingRef.current.clear();
    setRestoringIds(new Set());
    setFrames([]);
    setFocusOrder([]);
  }, []);

  const closeDialog = useCallback(() => setDialog(null), []);

  useEffect(() => {
    if (!workspaces) return;
    const ids = new Set(
      workspaces.map((workspace) => workspaceWindowId(workspace._id)),
    );
    for (const frame of frames) {
      const parsed = parseWindowId(frame.id);
      if (parsed?.kind === "workspace" && !ids.has(frame.id)) {
        closeBoard(frame.id);
      }
    }
  }, [closeBoard, frames, workspaces]);

  useEffect(() => {
    if (openedInvitesRef.current) return;
    if (!pending || pending.length === 0) return;
    if (dialog !== null) return;
    openedInvitesRef.current = true;
    setDialog({ type: "invitations" });
  }, [dialog, pending]);

  if (isLoading) {
    return <BootScreen />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="min-h-0 flex-1">
          <AuthWindow />
        </div>
        <div className="taskbar">
          <span className="taskbar-brand">Kanban Board</span>
          <div className="flex-1" />
          <div className="taskbar-tray">
            <span className="taskbar-clock">Sign in</span>
          </div>
        </div>
      </div>
    );
  }

  const menuItems = (() => {
    if (!menu) return [];
    if (menu.target.kind === "board") {
      const boardId = menu.target.id;
      return [
        {
          id: "open",
          label: "Open",
          onSelect: () => openBoard(boardId),
        },
      ];
    }
    const workspaceId = menu.target.id;
    const workspace = workspaceList.find((w) => w._id === workspaceId);
    const isOwner = workspace?.role === "owner";
    return [
      {
        id: "open",
        label: "Open",
        onSelect: () => openBoard(workspaceWindowId(workspaceId)),
      },
      {
        id: "invite",
        label: "Invite…",
        onSelect: () => setDialog({ type: "invite", workspaceId }),
      },
      ...(isOwner
        ? [
            {
              id: "rename",
              label: "Rename…",
              onSelect: () =>
                setDialog({
                  type: "rename-workspace",
                  workspaceId,
                  name: workspace?.name ?? "",
                }),
            },
            {
              id: "delete",
              label: "Delete",
              onSelect: () =>
                setDialog({
                  type: "delete-workspace",
                  workspaceId,
                  name: workspace?.name ?? "Workspace",
                }),
            },
          ]
        : [
            {
              id: "leave",
              label: "Leave",
              onSelect: () =>
                setDialog({
                  type: "leave-workspace",
                  workspaceId,
                  name: workspace?.name ?? "Workspace",
                }),
            },
          ]),
    ];
  })();

  return (
    <div className="flex h-full w-full flex-col">
      <div
        className="relative min-h-0 flex-1"
        onClick={() => setSelectedIcon(null)}
        onContextMenu={(e) => {
          e.preventDefault();
        }}
      >
        <div className="absolute top-2 left-2 z-[5] flex flex-col gap-2">
          {BOARDS.map((board) => (
            <DesktopIcon
              key={board.id}
              label={board.label}
              Icon={board.Icon}
              selected={selectedIcon === board.id}
              onSelect={() => setSelectedIcon(board.id)}
              onOpen={() => openBoard(board.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedIcon(board.id);
                setMenu({
                  x: e.clientX,
                  y: e.clientY,
                  target: { kind: "board", id: board.id },
                });
              }}
            />
          ))}
          {workspaceList.map((workspace) => {
            const id = workspaceWindowId(workspace._id);
            return (
              <DesktopIcon
                key={workspace._id}
                label={workspace.name}
                Icon={Windows95NetworkNeighborhood}
                selected={selectedIcon === id}
                onSelect={() => setSelectedIcon(id)}
                onOpen={() => openBoard(id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedIcon(id);
                  setMenu({
                    x: e.clientX,
                    y: e.clientY,
                    target: { kind: "workspace", id: workspace._id },
                  });
                }}
              />
            );
          })}
          {pending && pending.length > 0 ? (
            <DesktopIcon
              label="Inbox"
              Icon={Windows95Inbox}
              selected={selectedIcon === "inbox"}
              onSelect={() => setSelectedIcon("inbox")}
              onOpen={() => setDialog({ type: "invitations" })}
            />
          ) : null}
        </div>
        <WindowManager
          frames={frames}
          focusOrder={focusOrder}
          activeId={activeId}
          restoringIds={restoringIds}
          workspaces={workspaceList}
          onInvite={(workspaceId) =>
            setDialog({ type: "invite", workspaceId })
          }
          onClose={closeBoard}
          onFocus={focusBoard}
          onMinimize={(board) => {
            void minimizeBoard(board);
          }}
          onToggleMaximize={toggleMaximize}
          onGeomChange={onGeomChange}
        />
        {menu ? (
          <ContextMenu
            x={menu.x}
            y={menu.y}
            onClose={() => setMenu(null)}
            items={menuItems}
          />
        ) : null}
        {dialog?.type === "new-work" ? (
          <NewWorkDialog
            onClose={closeDialog}
            onCreated={(id) => {
              closeDialog();
              openBoard(id);
            }}
          />
        ) : null}
        {dialog?.type === "new-workspace" ? (
          <NameWorkspaceDialog
            title="New Workspace"
            message="Type a name for the workspace."
            onClose={closeDialog}
            onSubmit={async (name) => {
              const id = await createWorkspace({ name });
              closeDialog();
              openBoard(workspaceWindowId(id));
            }}
          />
        ) : null}
        {dialog?.type === "rename-workspace" ? (
          <NameWorkspaceDialog
            title="Rename Workspace"
            message="Type a new name for the workspace."
            initialName={dialog.name}
            onClose={closeDialog}
            onSubmit={async (name) => {
              await renameWorkspace({
                workspaceId: dialog.workspaceId,
                name,
              });
              closeDialog();
            }}
          />
        ) : null}
        {dialog?.type === "delete-workspace" ? (
          <ConfirmDialog
            title="Delete Workspace"
            message={`Delete ${dialog.name}? All works will be removed.`}
            confirmLabel="Yes"
            cancelLabel="No"
            Icon={Windows95NetworkNeighborhood}
            onClose={closeDialog}
            onConfirm={async () => {
              await removeWorkspace({ workspaceId: dialog.workspaceId });
              closeBoard(workspaceWindowId(dialog.workspaceId));
              closeDialog();
            }}
          />
        ) : null}
        {dialog?.type === "leave-workspace" ? (
          <ConfirmDialog
            title="Leave Workspace"
            message={`Leave ${dialog.name}?`}
            confirmLabel="Yes"
            cancelLabel="No"
            Icon={Windows95NetworkNeighborhood}
            onClose={closeDialog}
            onConfirm={async () => {
              await leaveWorkspace({ workspaceId: dialog.workspaceId });
              closeBoard(workspaceWindowId(dialog.workspaceId));
              closeDialog();
            }}
          />
        ) : null}
        {dialog?.type === "invite" ? (
          <InviteDialog
            workspaceId={dialog.workspaceId}
            isOwner={
              workspaceList.find((w) => w._id === dialog.workspaceId)
                ?.role === "owner"
            }
            onClose={closeDialog}
          />
        ) : null}
        {dialog?.type === "invitations" ? (
          <InvitationsDialog
            onClose={closeDialog}
            onAccepted={(workspaceId) => {
              closeDialog();
              openBoard(workspaceWindowId(workspaceId));
            }}
          />
        ) : null}
        {dialog?.type === "find" ? (
          <FindDialog onClose={closeDialog} onOpenBoard={openBoard} />
        ) : null}
        {dialog?.type === "help" ? <HelpDialog onClose={closeDialog} /> : null}
        {dialog?.type === "log-off" ? (
          <SessionDialog
            kind="log-off"
            onClose={closeDialog}
            onConfirm={() => {
              closeDialog();
              void signOut();
            }}
          />
        ) : null}
        {dialog?.type === "shut-down" ? (
          <SessionDialog
            kind="shut-down"
            onClose={closeDialog}
            onConfirm={() => {
              closeAllBoards();
              closeDialog();
              void signOut();
            }}
          />
        ) : null}
      </div>
      <Taskbar
        frames={frames}
        activeId={activeId}
        workspaces={workspaceList}
        onOpenBoard={openBoard}
        onTaskButtonClick={onTaskButtonClick}
        onNewWork={() => setDialog({ type: "new-work" })}
        onNewWorkspace={() => setDialog({ type: "new-workspace" })}
        onInvitations={() => setDialog({ type: "invitations" })}
        onFind={() => setDialog({ type: "find" })}
        onHelp={() => setDialog({ type: "help" })}
        onLogOff={() => setDialog({ type: "log-off" })}
        onShutDown={() => setDialog({ type: "shut-down" })}
      />
    </div>
  );
}
