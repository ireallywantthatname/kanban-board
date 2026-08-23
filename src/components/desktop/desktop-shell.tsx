"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useQueryStates } from "nuqs";
import { useCallback, useEffect, useRef, useState } from "react";
import { Windows95Inbox, Windows95NetworkNeighborhood } from "react-old-icons";
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
import { loadSession, saveSession, useCachedWorkspaces } from "@/lib/persist";
import { playSound } from "@/lib/sound";
import { desktopSearchParams } from "@/lib/url-state";
import type { WindowFrame, WindowGeom, WindowId } from "@/lib/window-shell";
import {
  boundWorkspaceId,
  deleteWorkspaceWindowId,
  inviteWindowId,
  isPersistableWindowId,
  leaveWorkspaceWindowId,
  type PersistableWindowId,
  parseWindowId,
  renameWorkspaceWindowId,
  windowTitle,
  workspaceWindowId,
} from "@/lib/windows";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type IconId = WindowId | "inbox";

type MenuState = {
  x: number;
  y: number;
  target:
    | { kind: "board"; id: BoardId }
    | { kind: "workspace"; id: Id<"workspaces"> };
} | null;

function moveToEnd<T>(ids: T[], id: T): T[] {
  return [...ids.filter((item) => item !== id), id];
}

function defaultFrame(id: WindowId): WindowFrame {
  return {
    id,
    minimized: false,
    maximized: false,
    geom: null,
    restoreGeom: null,
  };
}

function sameIdList(a: WindowId[], b: WindowId[]) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function withFind(
  ids: PersistableWindowId[],
  query: string,
): PersistableWindowId[] {
  if (query === "" || ids.includes("find")) return ids;
  return [...ids, "find"];
}

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
  const [{ open, focus, q }, setDesktop] = useQueryStates(desktopSearchParams, {
    history: "push",
    shallow: true,
  });
  const animatingRef = useRef<Set<WindowId>>(new Set());
  const openedInvitesRef = useRef(false);
  const hydratedUserRef = useRef<string | null>(null);
  const skipInviteAutoOpenRef = useRef(false);
  const chromeRef = useRef(new Map<WindowId, WindowFrame>());
  const urlStateRef = useRef({ open, focus, q });
  urlStateRef.current = { open, focus, q };
  const workspaceList = workspaces ?? [];
  const titleFor = useCallback(
    (id: WindowId) => windowTitle(id, workspaceList),
    [workspaceList],
  );

  const activeId =
    focusOrder
      .filter((id) => frames.some((f) => f.id === id && !f.minimized))
      .at(-1) ??
    frames.filter((f) => !f.minimized).at(-1)?.id ??
    null;

  const setMinimized = useCallback((board: WindowId, minimized: boolean) => {
    setFrames((prev) =>
      prev.map((f) => (f.id === board ? { ...f, minimized } : f)),
    );
  }, []);

  const focusBoard = useCallback(
    (board: WindowId) => {
      if (isPersistableWindowId(board)) {
        const currentOpen = open ?? [];
        const alreadyFocused = focus === board && currentOpen.at(-1) === board;
        if (!alreadyFocused) {
          const nextOpen = currentOpen.includes(board)
            ? currentOpen
            : [...currentOpen, board];
          void setDesktop({
            open: moveToEnd(nextOpen, board),
            focus: board,
          });
        }
      }
      setFocusOrder((prev) => [...prev.filter((b) => b !== board), board]);
    },
    [focus, open, setDesktop],
  );

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
      if (!frame?.minimized) {
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
      if (isPersistableWindowId(board)) {
        const nextOpen = [...(open ?? []).filter((id) => id !== board), board];
        void setDesktop({
          open: nextOpen,
          focus: board,
        });
      }
      setFrames((prev) => [...prev, defaultFrame(board)]);
      setFocusOrder((prev) => [...prev.filter((b) => b !== board), board]);
      setSelectedIcon(board);
    },
    [focusBoard, frames, open, restoreBoard, setDesktop],
  );

  const closeBoard = useCallback(
    (board: WindowId) => {
      animatingRef.current.delete(board);
      setRestoringIds((prev) => {
        if (!prev.has(board)) return prev;
        const next = new Set(prev);
        next.delete(board);
        return next;
      });
      setFrames((prev) => prev.filter((f) => f.id !== board));
      setFocusOrder((prev) => prev.filter((b) => b !== board));
      if (!isPersistableWindowId(board)) return;
      const nextOpen = (open ?? []).filter((id) => id !== board);
      const nextFocus =
        focus === board
          ? (nextOpen.at(-1) ?? null)
          : focus && nextOpen.includes(focus)
            ? focus
            : (nextOpen.at(-1) ?? null);
      void setDesktop(
        board === "find"
          ? { open: nextOpen, focus: nextFocus, q: null }
          : { open: nextOpen, focus: nextFocus },
      );
    },
    [focus, open, setDesktop],
  );

  const toggleMaximize = useCallback(
    (board: WindowId) => {
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
      focusBoard(board);
    },
    [focusBoard],
  );

  const onGeomChange = useCallback((board: WindowId, geom: WindowGeom) => {
    setFrames((prev) =>
      prev.map((f) => (f.id === board ? { ...f, geom, maximized: false } : f)),
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
    void setDesktop({ open: [], focus: null, q: null }, { history: "replace" });
  }, [setDesktop]);

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
      skipInviteAutoOpenRef.current = false;
      chromeRef.current.clear();
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
    const landing = urlStateRef.current;
    skipInviteAutoOpenRef.current = landing.open !== null;
    void loadSession(userId)
      .then((session) => {
        if (cancelled) return;
        const sessionFrames = session?.frames ?? [];
        const sessionFocus = session?.focusOrder ?? [];
        chromeRef.current.clear();
        for (const frame of sessionFrames) {
          chromeRef.current.set(frame.id, frame);
        }
        const query = landing.q.trim();
        if (landing.open !== null) {
          const ids = withFind(landing.open, query);
          const byId = new Map(
            sessionFrames.map((frame) => [frame.id, frame] as const),
          );
          const nextFrames = ids.map(
            (id) =>
              byId.get(id) ?? chromeRef.current.get(id) ?? defaultFrame(id),
          );
          const nextFocus =
            landing.focus && ids.includes(landing.focus)
              ? landing.focus
              : (sessionFocus
                  .filter(isPersistableWindowId)
                  .filter((id) => ids.includes(id))
                  .at(-1) ??
                ids.at(-1) ??
                null);
          setFrames(nextFrames);
          setFocusOrder(nextFocus ? moveToEnd(ids, nextFocus) : ids);
          if (ids !== landing.open) {
            void setDesktop(
              { open: ids, focus: nextFocus },
              { history: "replace" },
            );
          }
        } else {
          let nextFrames = sessionFrames;
          let nextFocusOrder = sessionFocus;
          const persistableOpen = sessionFrames
            .map((frame) => frame.id)
            .filter(isPersistableWindowId);
          let nextOpen = persistableOpen;
          let nextFocus =
            sessionFocus.filter(isPersistableWindowId).at(-1) ??
            persistableOpen.at(-1) ??
            null;
          if (query !== "" && !nextOpen.includes("find")) {
            nextOpen = [...nextOpen, "find"];
            nextFrames = [...sessionFrames, defaultFrame("find")];
            nextFocusOrder = [
              ...sessionFocus.filter((id) => id !== "find"),
              "find",
            ];
            nextFocus = "find";
          }
          setFrames(nextFrames);
          setFocusOrder(nextFocusOrder);
          void setDesktop(
            { open: nextOpen, focus: nextFocus },
            { history: "replace" },
          );
        }
        hydratedUserRef.current = userId;
        setSessionReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        chromeRef.current.clear();
        const query = landing.q.trim();
        if (landing.open !== null) {
          const ids = withFind(landing.open, query);
          const nextFocus =
            landing.focus && ids.includes(landing.focus)
              ? landing.focus
              : (ids.at(-1) ?? null);
          setFrames(ids.map(defaultFrame));
          setFocusOrder(nextFocus ? moveToEnd(ids, nextFocus) : ids);
          if (ids !== landing.open) {
            void setDesktop(
              { open: ids, focus: nextFocus },
              { history: "replace" },
            );
          }
        } else {
          const nextOpen: PersistableWindowId[] = query !== "" ? ["find"] : [];
          setFrames(nextOpen.map(defaultFrame));
          setFocusOrder(nextOpen);
          void setDesktop(
            {
              open: nextOpen,
              focus: query !== "" ? "find" : null,
            },
            { history: "replace" },
          );
        }
        hydratedUserRef.current = userId;
        setSessionReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, me, setDesktop]);

  useEffect(() => {
    for (const frame of frames) {
      if (isPersistableWindowId(frame.id)) {
        chromeRef.current.set(frame.id, frame);
      }
    }
  }, [frames]);

  useEffect(() => {
    if (!sessionReady) return;
    if (open === null) return;
    setFrames((prev) => {
      const transients = prev.filter(
        (frame) => !isPersistableWindowId(frame.id),
      );
      const persistable = open.map((id) => {
        const existing = prev.find((frame) => frame.id === id);
        if (existing) return existing;
        return chromeRef.current.get(id) ?? defaultFrame(id);
      });
      const next = [...persistable, ...transients];
      if (
        sameIdList(
          prev.map((frame) => frame.id),
          next.map((frame) => frame.id),
        )
      ) {
        return prev;
      }
      return next;
    });
    setFocusOrder((prev) => {
      const persistableStack =
        focus && open.includes(focus) ? moveToEnd(open, focus) : open;
      const transients = prev.filter((id) => !isPersistableWindowId(id));
      const lastPrev = prev.at(-1);
      const next =
        lastPrev && transients.includes(lastPrev)
          ? [
              ...persistableStack.filter((id) => id !== lastPrev),
              ...transients.filter((id) => id !== lastPrev),
              lastPrev,
            ]
          : [...persistableStack, ...transients];
      return sameIdList(prev, next) ? prev : next;
    });
  }, [focus, open, sessionReady]);

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
    if (skipInviteAutoOpenRef.current) return;
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
              onSelect: () => openBoard(renameWorkspaceWindowId(workspaceId)),
            },
            {
              id: "delete",
              label: "Delete",
              onSelect: () => openBoard(deleteWorkspaceWindowId(workspaceId)),
            },
          ]
        : [
            {
              id: "leave",
              label: "Leave",
              onSelect: () => openBoard(leaveWorkspaceWindowId(workspaceId)),
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
