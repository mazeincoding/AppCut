import { create } from "zustand";
import { CanvasSize, CanvasPreset } from "@/types/editor";

type CanvasMode = "preset" | "original" | "custom";

interface EditorState {
  // Loading states
  isInitializing: boolean;
  isPanelsReady: boolean;

  // Canvas/Project settings
  canvasSize: CanvasSize;
  canvasMode: CanvasMode;
  canvasPresets: CanvasPreset[];

  // Actions
  setInitializing: (loading: boolean) => void;
  setPanelsReady: (ready: boolean) => void;
  initializeApp: () => Promise<void>;
  setCanvasSize: (size: CanvasSize) => void;
  setCanvasSizeToOriginal: (aspectRatio: number) => void;
  setCanvasSizeFromAspectRatio: (aspectRatio: number) => void;
}

const DEFAULT_CANVAS_PRESETS: CanvasPreset[] = [
  { name: "16:9", width: 1920, height: 1080 },
  { name: "9:16", width: 1080, height: 1920 },
  { name: "1:1", width: 1080, height: 1080 },
  { name: "4:3", width: 1440, height: 1080 },
];

// Helper function to find the best matching canvas preset for an aspect ratio
const findBestCanvasPreset = (aspectRatio: number): CanvasSize => {
  // Calculate aspect ratio for each preset and find the closest match
  let bestMatch = DEFAULT_CANVAS_PRESETS[0]; // Default to 16:9 HD
  let smallestDifference = Math.abs(
    aspectRatio - bestMatch.width / bestMatch.height
  );

  for (const preset of DEFAULT_CANVAS_PRESETS) {
    const presetAspectRatio = preset.width / preset.height;
    const difference = Math.abs(aspectRatio - presetAspectRatio);

    if (difference < smallestDifference) {
      smallestDifference = difference;
      bestMatch = preset;
    }
  }

  // If the difference is still significant (> 0.1), create a custom size
  // based on the media aspect ratio with a reasonable resolution
  const bestAspectRatio = bestMatch.width / bestMatch.height;
  if (Math.abs(aspectRatio - bestAspectRatio) > 0.1) {
    // Create custom dimensions based on the aspect ratio
    if (aspectRatio > 1) {
      // Landscape - use 1920 width
      return { width: 1920, height: Math.round(1920 / aspectRatio) };
    }
    // Portrait or square - use 1080 height
    return { width: Math.round(1080 * aspectRatio), height: 1080 };
  }

  return { width: bestMatch.width, height: bestMatch.height };
};

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial states
  isInitializing: true,
  isPanelsReady: false,
  canvasSize: { width: 1920, height: 1080 }, // Default 16:9 HD
  canvasMode: "preset" as CanvasMode,
  canvasPresets: DEFAULT_CANVAS_PRESETS,

  // Actions
  setInitializing: (loading) => {
    set({ isInitializing: loading });
  },

  setPanelsReady: (ready) => {
    set({ isPanelsReady: ready });
  },

  initializeApp: async () => {
    console.log("Initializing video editor...");
    set({ isInitializing: true, isPanelsReady: false });

    set({ isPanelsReady: true, isInitializing: false });
    console.log("Video editor ready");
  },

  setCanvasSize: (size) => {
    set({ canvasSize: size, canvasMode: "preset" });
  },

  setCanvasSizeToOriginal: (aspectRatio) => {
    const newCanvasSize = findBestCanvasPreset(aspectRatio);
    set({ canvasSize: newCanvasSize, canvasMode: "original" });
  },

  setCanvasSizeFromAspectRatio: (aspectRatio) => {
    const newCanvasSize = findBestCanvasPreset(aspectRatio);
    set({ canvasSize: newCanvasSize, canvasMode: "custom" });
  },
}));
