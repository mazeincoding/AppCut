import { create } from "zustand";
import { SceneNode } from "@/lib/renderer/nodes/scene-node";

interface RendererState {
  scene: SceneNode | null;
  setScene: (scene: SceneNode | null) => void;
}

export const useRendererStore = create<RendererState>((set) => ({
  scene: null,
  setScene: (scene: SceneNode | null) => set({ scene }),
}));
