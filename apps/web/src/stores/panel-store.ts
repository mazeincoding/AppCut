"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PanelState {
  toolsPanel: number;
  previewPanel: number;
  mainContent: number;
  timeline: number;
  propertiesPanel: number;
  setToolsPanel: (size: number) => void;
  setPreviewPanel: (size: number) => void;
  setMainContent: (size: number) => void;
  setTimeline: (size: number) => void;
  setPropertiesPanel: (size: number) => void;
  resetLayout: () => void;
}

export const usePanelStore = create<PanelState>()(
  persist(
    (set) => ({
      toolsPanel: 20,
      previewPanel: 60,
      mainContent: 75,
      timeline: 25,
      propertiesPanel: 20,
      setToolsPanel: (size) => set({ toolsPanel: size }),
      setPreviewPanel: (size) => set({ previewPanel: size }),
      setMainContent: (size) => set({ mainContent: size }),
      setTimeline: (size) => set({ timeline: size }),
      setPropertiesPanel: (size) => set({ propertiesPanel: size }),
      resetLayout: () =>
        set({
          toolsPanel: 20,
          previewPanel: 60,
          mainContent: 75,
          timeline: 25,
          propertiesPanel: 20,
        }),
    }),
    {
      name: "panel-sizes",
    }
  )
);
