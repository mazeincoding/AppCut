import { create } from "zustand";
import { persist } from "zustand/middleware";
import { usePanelLayoutStore, PanelLayout } from "./panel-layout-store";

type PanelSizes = {
  toolsPanel: number;
  previewPanel: number;
  mainContent: number;
  timeline: number;
  propertiesPanel: number;
};

interface PanelState {
  layouts: Record<PanelLayout, PanelSizes>;
  resetCounter: number;
  setPanelSize: (
    panel: keyof PanelSizes,
    size: number,
    layout: PanelLayout
  ) => void;
  resetLayout: (layout: PanelLayout) => void;
}

const defaultLayoutSizes: Record<PanelLayout, PanelSizes> = {
  default: {
    toolsPanel: 20,
    previewPanel: 60,
    mainContent: 75,
    timeline: 25,
    propertiesPanel: 20,
  },
  media: {
    toolsPanel: 33,
    previewPanel: 70,
    mainContent: 75,
    timeline: 25,
    propertiesPanel: 30,
  },
  properties: {
    toolsPanel: 30,
    previewPanel: 70,
    mainContent: 75,
    timeline: 25,
    propertiesPanel: 33,
  },
  "vertical-preview": {
    toolsPanel: 50,
    previewPanel: 33,
    mainContent: 75,
    timeline: 25,
    propertiesPanel: 50,
  },
};

export const usePanelStore = create<PanelState>()(
  persist(
    (set, get) => ({
      layouts: defaultLayoutSizes,
      resetCounter: 0,
      setPanelSize: (panel, size, layout) => {
        set((state) => ({
          layouts: {
            ...state.layouts,
            [layout]: {
              ...state.layouts[layout],
              [panel]: size,
            },
          },
        }));
      },
      resetLayout: (layout) => {
        set((state) => ({
          layouts: {
            ...state.layouts,
            [layout]: defaultLayoutSizes[layout],
          },
          resetCounter: state.resetCounter + 1,
        }));
      },
    }),
    {
      name: "panel-sizes",
    }
  )
);
