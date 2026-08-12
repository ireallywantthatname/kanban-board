"use client";

import ReactGridLayout, {
  useContainerWidth,
  type Layout,
  type LayoutItem,
} from "react-grid-layout";
import { noOverlapCompactor } from "react-grid-layout/core";
import { useCallback, useMemo, useState } from "react";
import { BoardWindow } from "@/components/board/board-window";
import type { BoardId } from "@/lib/boards";

const COLS = 24;
const ROW_HEIGHT = 20;

function defaultItem(board: BoardId, index: number): LayoutItem {
  const offset = (index % 4) * 2;
  return {
    i: board,
    x: 4 + offset,
    y: offset,
    w: 10,
    h: 14,
    minW: 6,
    minH: 8,
  };
}

type WindowManagerProps = {
  openBoards: BoardId[];
  onClose: (board: BoardId) => void;
};

export function WindowManager({ openBoards, onClose }: WindowManagerProps) {
  const { width, containerRef, mounted } = useContainerWidth({
    initialWidth: 1280,
  });
  const [layout, setLayout] = useState<Layout>([]);
  const [focusOrder, setFocusOrder] = useState<BoardId[]>([]);

  const syncedLayout = useMemo((): Layout => {
    return openBoards.map((board, index) => {
      const existing = layout.find((l) => l.i === board);
      return existing ?? defaultItem(board, index);
    });
  }, [openBoards, layout]);

  const activeBoard = focusOrder.filter((b) => openBoards.includes(b)).at(-1);

  const focus = useCallback((board: BoardId) => {
    setFocusOrder((prev) => [...prev.filter((b) => b !== board), board]);
  }, []);

  const zIndexFor = useCallback(
    (board: BoardId) => {
      const idx = focusOrder.lastIndexOf(board);
      return 20 + (idx < 0 ? 0 : idx);
    },
    [focusOrder],
  );

  if (openBoards.length === 0) {
    return (
      <div
        ref={containerRef}
        className="pointer-events-none absolute inset-0"
      />
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0">
      {mounted && width > 0 ? (
        <ReactGridLayout
          width={width}
          layout={syncedLayout}
          gridConfig={{
            cols: COLS,
            rowHeight: ROW_HEIGHT,
            margin: [8, 8],
            containerPadding: [8, 8],
          }}
          dragConfig={{
            enabled: true,
            handle: ".win-titlebar",
            cancel: ".win-title-btn,input,button,textarea,a",
          }}
          resizeConfig={{
            enabled: true,
            handles: ["se"],
          }}
          compactor={noOverlapCompactor}
          onLayoutChange={(next) => setLayout(next)}
          onDragStart={(_layout, item) => {
            if (item) focus(item.i as BoardId);
          }}
          autoSize={false}
          style={{ minHeight: "100%" }}
        >
          {openBoards.map((board) => (
            <div
              key={board}
              style={{ zIndex: zIndexFor(board) }}
              onMouseDown={() => focus(board)}
            >
              <BoardWindow
                board={board}
                onClose={() => onClose(board)}
                active={activeBoard === board}
                className="h-full w-full"
              />
            </div>
          ))}
        </ReactGridLayout>
      ) : null}
    </div>
  );
}
