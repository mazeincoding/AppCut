import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PanelName = "media" | "preview" | "properties" | "timeline";

const DEFAULT_PANEL_SIZES = {
  toolsPanel: 45,
  previewPanel: 75,
  propertiesPanel: 20,
  mainContent: 70,
  timeline: 30,
} as const;

interface PanelState {
  // Panel sizes as percentages
  toolsPanel: number;
  previewPanel: number;
  propertiesPanel: number;
  mainContent: number;
  timeline: number;

  mediaViewMode: "grid" | "list";

  // Panel states
  minimizedPanels: PanelName[];

  // Actions
  setToolsPanel: (size: number) => void;
  setPreviewPanel: (size: number) => void;
  setPropertiesPanel: (size: number) => void;
  setMainContent: (size: number) => void;
  setTimeline: (size: number) => void;
  setMediaViewMode: (mode: "grid" | "list") => void;

  // Panel state actions
  togglePanelMinimized: (panel: PanelName) => void;
}

export const usePanelStore = create<PanelState>()(
  persist(
    (set) => ({
      // Default sizes - optimized for responsiveness
      ...DEFAULT_PANEL_SIZES,

      mediaViewMode: "grid" as const,

      // Default panel states
      minimizedPanels: [],

      // Actions
      setToolsPanel: (size) => set({ toolsPanel: size }),
      setPreviewPanel: (size) => set({ previewPanel: size }),
      setPropertiesPanel: (size) => set({ propertiesPanel: size }),
      setMainContent: (size) => set({ mainContent: size }),
      setTimeline: (size) => set({ timeline: size }),
      setMediaViewMode: (mode) => set({ mediaViewMode: mode }),

      // Panel state actions
      togglePanelMinimized: (panel) =>
        set((state) => ({
          minimizedPanels: state.minimizedPanels.includes(panel)
            ? state.minimizedPanels.filter((p) => p !== panel)
            : [...state.minimizedPanels, panel],
        })),
    }),
    {
      name: "panel-sizes",
    }
  )
);

