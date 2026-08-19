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
import { ContextMenu } from "@/components/desktop/context-menu";
import { DesktopIcon } from "@/components/desktop/desktop-icon";
import { ShutdownScreen } from "@/components/desktop/shutdown-screen";
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
import {
  loadSession,
  saveSession,
  useCachedWorkspaces,
} from "@/lib/persist";
import type { WindowFrame, WindowGeom, WindowId } from "@/lib/window-shell";
import { playSound } from "@/lib/sound";
import {
  boundWorkspaceId,
  deleteWorkspaceWindowId,
  inviteWindowId,
  leaveWorkspaceWindowId,
  parseWindowId,
  renameWorkspaceWindowId,
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

export function DesktopShell() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.current, isAuthenticated ? {} : "skip");
  const workspaces = useCachedWorkspaces(isAuthenticated);
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
  const [poweredOff, setPoweredOff] = useState(false);
  const [restoringIds, setRestoringIds] = useState<Set<WindowId>>(
    () => new Set(),
  );
  const [sessionReady, setSessionReady] = useState(false);
  const animatingRef = useRef<Set<WindowId>>(new Set());
  const openedInvitesRef = useRef(false);
  const hydratedUserRef = useRef<string | null>(null);
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
      playSound("Minimize");
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
      const parsed = parseWindowId(board);
      if (
        parsed?.kind === "log-off" ||
        parsed?.kind === "shut-down" ||
        parsed?.kind === "delete-workspace" ||
        parsed?.kind === "leave-workspace"
      ) {
        playSound("Default");
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
    playSound("Maximize");
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

  const handleCreateWorkspace = useCallback(
    async (name: string) => {
      const id = await createWorkspace({ name });
      closeBoard("new-workspace");
      openBoard(workspaceWindowId(id));
    },
    [closeBoard, createWorkspace, openBoard],
  );

  const handleRenameWorkspace = useCallback(
    async (workspaceId: Id<"workspaces">, name: string) => {
      await renameWorkspace({ workspaceId, name });
      closeBoard(renameWorkspaceWindowId(workspaceId));
    },
    [closeBoard, renameWorkspace],
  );

  const handleDeleteWorkspace = useCallback(
    async (workspaceId: Id<"workspaces">) => {
      await removeWorkspace({ workspaceId });
      closeBoard(workspaceWindowId(workspaceId));
      closeBoard(deleteWorkspaceWindowId(workspaceId));
    },
    [closeBoard, removeWorkspace],
  );

  const handleLeaveWorkspace = useCallback(
    async (workspaceId: Id<"workspaces">) => {
      await leaveWorkspace({ workspaceId });
      closeBoard(workspaceWindowId(workspaceId));
      closeBoard(leaveWorkspaceWindowId(workspaceId));
    },
    [closeBoard, leaveWorkspace],
  );

  const handleWorkCreated = useCallback(
    (id: WindowId) => {
      closeBoard("new-work");
      openBoard(id);
    },
    [closeBoard, openBoard],
  );

  const handleInviteAccepted = useCallback(
    (workspaceId: Id<"workspaces">) => {
      closeBoard("invitations");
      openBoard(workspaceWindowId(workspaceId));
    },
    [closeBoard, openBoard],
  );

  const handleLogOff = useCallback(() => {
    playSound("WindowsLogoff");
    closeBoard("log-off");
    void signOut();
  }, [closeBoard, signOut]);

  const handleShutDown = useCallback(() => {
    playSound("SystemExit");
    closeAllBoards();
    setPoweredOff(true);
  }, [closeAllBoards]);

  useEffect(() => {
    if (!isAuthenticated) {
      hydratedUserRef.current = null;
      openedInvitesRef.current = false;
      setSessionReady(false);
      setFrames([]);
      setFocusOrder([]);
      return;
    }
    if (me === undefined) return;
    const userId = me?._id;
    if (!userId) {
      hydratedUserRef.current = null;
      setSessionReady(true);
      return;
    }
    if (hydratedUserRef.current === userId) return;
    let cancelled = false;
    void loadSession(userId)
      .then((session) => {
        if (cancelled) return;
        setFrames(session?.frames ?? []);
        setFocusOrder(session?.focusOrder ?? []);
        hydratedUserRef.current = userId;
        setSessionReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setFrames([]);
        setFocusOrder([]);
        hydratedUserRef.current = userId;
        setSessionReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, me]);

  useEffect(() => {
    if (!sessionReady || !me?._id) return;
    const handle = window.setTimeout(() => {
      void saveSession(me._id, frames, focusOrder);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [sessionReady, me?._id, frames, focusOrder]);

  useEffect(() => {
    if (!workspaces) return;
    const ids = new Set(workspaces.map((workspace) => workspace._id));
    for (const frame of frames) {
      const workspaceId = boundWorkspaceId(frame.id);
      if (workspaceId && !ids.has(workspaceId)) {
        closeBoard(frame.id);
      }
    }
  }, [closeBoard, frames, workspaces]);

  useEffect(() => {
    if (!sessionReady) return;
    if (openedInvitesRef.current) return;
    if (!pending || pending.length === 0) return;
    openedInvitesRef.current = true;
    openBoard("invitations");
  }, [sessionReady, openBoard, pending]);

  useEffect(() => {
    if (!isAuthenticated) return;
    playSound("WindowsLogon");
  }, [isAuthenticated]);

  if (poweredOff) {
    return <ShutdownScreen onPowerOn={() => window.location.reload()} />;
  }

  if (isLoading || (isAuthenticated && (me === undefined || !sessionReady))) {
    return <BootScreen />;
  }

  if (!isAuthenticated) {
    return <AuthWindow />;
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
        onSelect: () => openBoard(inviteWindowId(workspaceId)),
      },
      ...(isOwner
        ? [
            {
              id: "rename",
              label: "Rename…",
              onSelect: () =>
                openBoard(renameWorkspaceWindowId(workspaceId)),
            },
            {
              id: "delete",
              label: "Delete",
              onSelect: () =>
                openBoard(deleteWorkspaceWindowId(workspaceId)),
            },
          ]
        : [
            {
              id: "leave",
              label: "Leave",
              onSelect: () =>
                openBoard(leaveWorkspaceWindowId(workspaceId)),
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
              onOpen={() => openBoard("invitations")}
            />
          ) : null}
        </div>
        <WindowManager
          frames={frames}
          focusOrder={focusOrder}
          activeId={activeId}
          restoringIds={restoringIds}
          workspaces={workspaceList}
          onInvite={(workspaceId) => openBoard(inviteWindowId(workspaceId))}
          onOpenBoard={openBoard}
          onWorkCreated={handleWorkCreated}
          onInviteAccepted={handleInviteAccepted}
          onCreateWorkspace={handleCreateWorkspace}
          onRenameWorkspace={handleRenameWorkspace}
          onDeleteWorkspace={handleDeleteWorkspace}
          onLeaveWorkspace={handleLeaveWorkspace}
          onLogOff={handleLogOff}
          onShutDown={handleShutDown}
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
      </div>
      <Taskbar
        frames={frames}
        activeId={activeId}
        workspaces={workspaceList}
        onOpenBoard={openBoard}
        onTaskButtonClick={onTaskButtonClick}
      />
    </div>
  );
}
