import { TProject } from "@/types/project";
import { create } from "zustand";
import { toast } from "sonner";

interface ProjectStore {
  activeProject: TProject | null;

  // Actions
  createNewProject: (name: string) => void;
  closeProject: () => void;
  setProjectResolution: (width: number, height: number, label: string, autoDetected?: boolean) => void;
  updateProjectSettings: (updates: Partial<TProject>) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  activeProject: null,

  createNewProject: (name: string) => {
    const newProject: TProject = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
      exportSettings: {
        format: 'mp4',
        quality: 'high',
      },
    };
    set({ activeProject: newProject });
  },

  closeProject: () => {
    set({ activeProject: null });
  },

  setProjectResolution: (width: number, height: number, label: string, autoDetected = false) => {
    const { activeProject } = get();
    if (!activeProject) return;

    const aspectRatio = width / height;
    const resolution = {
      width,
      height,
      aspectRatio,
      label,
      autoDetected,
    };

    set({
      activeProject: {
        ...activeProject,
        resolution,
        updatedAt: new Date(),
      },
    });

    if (autoDetected) {
      toast.success(`Project resolution set to ${label} (auto-detected)`);
    } else {
      toast.success(`Project resolution set to ${label}`);
    }
  },

  updateProjectSettings: (updates: Partial<TProject>) => {
    const { activeProject } = get();
    if (!activeProject) return;

    set({
      activeProject: {
        ...activeProject,
        ...updates,
        updatedAt: new Date(),
      },
    });
  },
}));
