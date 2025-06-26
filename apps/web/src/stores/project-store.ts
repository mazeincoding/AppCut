import { TProject } from "@/types/project";
import { create } from "zustand";

interface ProjectStore {
  activeProject: TProject | null;

  // Actions
  createNewProject: (name: string) => void;
  closeProject: () => void;
  updateProjectName: (name: string) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  activeProject: null,

  createNewProject: (name: string) => {
    const newProject: TProject = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set({ activeProject: newProject });
  },

  closeProject: () => {
    set({ activeProject: null });
  },

  updateProjectName: (name: string) => {
    set((state) => ({
      activeProject: state.activeProject
        ? {
            ...state.activeProject,
            name,
            updatedAt: new Date(),
          }
        : null,
    }));
  },
}));
