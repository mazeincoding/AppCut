import { CanvasSize } from "./editor";

export interface TProject {
  id: string;
  name: string;
  thumbnail: string;
  createdAt: Date;
  updatedAt: Date;
  mediaItems?: string[];
  backgroundColor?: string;
  backgroundType?: "color" | "blur";
  blurIntensity?: number; // in pixels (4, 8, 18)
  fps?: number;
  bookmarks?: number[];
  canvasSize: CanvasSize;
  /**
   * Tracks how the canvas size was set:
   * - "preset": User selected a standard preset (e.g. 16:9, 9:16)
   * - "original": Using the first media item's dimensions
   * - "custom": User set a custom aspect ratio or dimensions
   */
  canvasMode: "preset" | "original" | "custom";
}
