import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PanelState {
  // Panel sizes as percentages
  toolsPanel: number;
  previewPanel: number;
  propertiesPanel: number;
  mainContent: number;
  timeline: number;
  showCaptionPanel: boolean;

  // Actions
  setToolsPanel: (size: number) => void;
  setPreviewPanel: (size: number) => void;
  setPropertiesPanel: (size: number) => void;
  setMainContent: (size: number) => void;
  setTimeline: (size: number) => void;
  setShowCaptionPanel: (show: boolean) => void;
  reset: () => void;
}

export const usePanelStore = create<PanelState>()(
  persist(
    (set) => ({
      // Default sizes - optimized for responsiveness
      toolsPanel: 25,
      previewPanel: 75,
      propertiesPanel: 20,
      mainContent: 70,
      timeline: 30,
      showCaptionPanel: false,

      // Actions
      setToolsPanel: (size) => set({ toolsPanel: size }),
      setPreviewPanel: (size) => set({ previewPanel: size }),
      setPropertiesPanel: (size) => set({ propertiesPanel: size }),
      setMainContent: (size) => set({ mainContent: size }),
      setTimeline: (size) => set({ timeline: size }),
      setShowCaptionPanel: (show) => set({ showCaptionPanel: show }),
      reset: () =>
        set({
          toolsPanel: 25,
          previewPanel: 75,
          propertiesPanel: 20,
          mainContent: 70,
          timeline: 30,
          showCaptionPanel: false,
        }),
    }),
    {
      name: "panel-sizes",
      onRehydrateStorage: (state) => {
        // This function is called right after state is rehydrated from storage
        // We ensure showCaptionPanel is always false on rehydration
        if (state) {
          state.showCaptionPanel = false;
        }
      },
    }
  )
);
