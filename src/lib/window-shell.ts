import type { WindowChrome, WindowId } from "@/lib/windows";

export type { WindowChrome, WindowId };

export type WindowGeom = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type WindowFrame = {
  id: WindowId;
  minimized: boolean;
  maximized: boolean;
  geom: WindowGeom | null;
  restoreGeom: WindowGeom | null;
};

export type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
