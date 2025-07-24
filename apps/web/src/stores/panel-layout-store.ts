import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PanelLayout = "default" | "media" | "properties" | "vertical-preview";

type PanelLayoutState = {
  activeLayout: PanelLayout;
  setActiveLayout: (layout: PanelLayout) => void;
};

export const usePanelLayoutStore = create<PanelLayoutState>()(
  persist(
    (set) => ({
      activeLayout: "default",
      setActiveLayout: (layout) => set({ activeLayout: layout }),
    }),
    {
      name: "panel-layout-storage",
    }
  )
); 