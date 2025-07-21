import { TProject } from "@/types/project";
import { create } from "zustand";
import { storageService } from "@/lib/storage/storage-service";
import { toast } from "sonner";
import { useMediaStore } from "./media-store";
import { useTimelineStore } from "./timeline-store";
import { generateUUID } from "@/lib/utils";

interface ProjectStore {
  activeProject: TProject | null;
  savedProjects: TProject[];
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  createNewProject: (name: string) => Promise<string>;
  loadProject: (id: string) => Promise<void>;
  saveCurrentProject: () => Promise<void>;
  loadAllProjects: () => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  closeProject: () => void;
  renameProject: (projectId: string, name: string) => Promise<void>;
  duplicateProject: (projectId: string) => Promise<string>;
  updateProjectBackground: (backgroundColor: string) => Promise<void>;
  updateBackgroundType: (
    type: "color" | "blur",
    options?: { backgroundColor?: string; blurIntensity?: number }
  ) => Promise<void>;
  updateProjectFps: (fps: number) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  activeProject: null,
  savedProjects: [],
  isLoading: true,
  isInitialized: false,

  createNewProject: async (name: string) => {
    const { isLoading } = get();
    if (isLoading) {
      console.log("🚫 CREATE PROJECT BLOCKED: Already creating a project");
      throw new Error("Project creation already in progress");
    }
    
    console.log("🚀 CREATE PROJECT START:", { name, timestamp: Date.now() });
    set({ isLoading: true });
    
    const newProject: TProject = {
      id: generateUUID(),
      name,
      thumbnail: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      backgroundColor: "#000000",
      backgroundType: "color",
      blurIntensity: 8,
    };

    try {
      console.log("💾 STORAGE SAVE ATTEMPT:", {
        projectId: newProject.id,
        timestamp: Date.now()
      });
      await storageService.saveProject(newProject);
      console.log("✅ STORAGE SAVE SUCCESS:", newProject.id);
      
      // Reload all projects to update the list
      console.log("📥 LOAD ALL PROJECTS START");
      await get().loadAllProjects();
      console.log("✅ LOAD ALL PROJECTS SUCCESS");
      
      // Only set activeProject AFTER storage operations complete successfully
      set({ activeProject: newProject });
      
      // Validate state consistency before returning
      const currentState = get();
      if (!currentState.activeProject || currentState.activeProject.id !== newProject.id) {
        console.error("❌ STATE VALIDATION FAILED after project creation");
        throw new Error("Project state validation failed");
      }
      
      console.log("✅ CREATE PROJECT SUCCESS:", newProject.id);
      return newProject.id;
    } catch (error) {
      console.error("❌ CREATE PROJECT FAILED:", error);
      toast.error("Failed to save new project");
      // Ensure activeProject is not set if creation failed
      set({ activeProject: null });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  loadProject: async (id: string) => {
    console.log('📥 LOAD PROJECT START:', id);
    
    if (!get().isInitialized) {
      set({ isLoading: true });
    }

    // Clear media and timeline immediately to prevent flickering when switching projects
    const mediaStore = useMediaStore.getState();
    const timelineStore = useTimelineStore.getState();
    mediaStore.clearAllMedia();
    timelineStore.clearTimeline();

    try {
      console.log('💾 STORAGE LOAD ATTEMPT:', id);
      const project = await storageService.loadProject(id);
      if (project) {
        console.log('✅ STORAGE LOAD SUCCESS:', id);
        set({ activeProject: project });

        // Load project-specific data in parallel
        console.log('📥 LOADING PROJECT MEDIA AND TIMELINE:', id);
        await Promise.all([
          mediaStore.loadProjectMedia(id),
          timelineStore.loadProjectTimeline(id),
        ]);
        console.log('✅ PROJECT MEDIA AND TIMELINE LOADED:', id);
      } else {
        throw new Error(`Project with id ${id} not found`);
      }
      console.log('✅ LOAD PROJECT SUCCESS:', id);
    } catch (error) {
      console.error('❌ LOAD PROJECT FAILED:', { id, error });
      throw error; // Re-throw so the editor page can handle it
    } finally {
      set({ isLoading: false });
    }
  },

  saveCurrentProject: async () => {
    const { activeProject } = get();
    if (!activeProject) return;

    try {
      // Save project metadata and timeline data in parallel
      const timelineStore = useTimelineStore.getState();
      await Promise.all([
        storageService.saveProject(activeProject),
        timelineStore.saveProjectTimeline(activeProject.id),
      ]);
      await get().loadAllProjects(); // Refresh the list
    } catch (error) {
      console.error("Failed to save project:", error);
    }
  },

  loadAllProjects: async () => {
    console.log("🚀 [PROJECT DEBUG] Loading all projects...");
    if (!get().isInitialized) {
      set({ isLoading: true });
    }

    try {
      console.log("🚀 [PROJECT DEBUG] Calling storageService.loadAllProjects...");
      
      // Add Electron environment guard to prevent blocking operations
      const isElectronEnv = typeof window !== 'undefined' && window.electronAPI !== undefined;
      if (isElectronEnv) {
        console.log("🚀 [PROJECT DEBUG] Electron environment detected, using non-blocking approach");
        // Use setTimeout to prevent blocking the main thread in Electron
        const projects = await new Promise<any[]>((resolve, reject) => {
          setTimeout(async () => {
            try {
              const result = await storageService.loadAllProjects();
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }, 0);
        });
        console.log("🚀 [PROJECT DEBUG] Loaded projects:", projects);
        set({ savedProjects: projects });
      } else {
        const projects = await storageService.loadAllProjects();
        console.log("🚀 [PROJECT DEBUG] Loaded projects:", projects);
        set({ savedProjects: projects });
      }
      
      console.log("🚀 [PROJECT DEBUG] Projects set in store");
    } catch (error) {
      console.error("🚀 [PROJECT DEBUG] Failed to load projects:", error);
    } finally {
      set({ isLoading: false, isInitialized: true });
      console.log("🚀 [PROJECT DEBUG] Store initialized");
    }
  },

  deleteProject: async (id: string) => {
    console.log("🗑️ [DELETE] Starting project deletion:", id);
    try {
      // Delete project data in parallel
      await Promise.all([
        storageService.deleteProjectMedia(id),
        storageService.deleteProjectTimeline(id),
        storageService.deleteProject(id),
      ]);
      console.log("✅ [DELETE] Project data deleted successfully");
      
      await get().loadAllProjects(); // Refresh the list
      console.log("✅ [DELETE] Project list refreshed");

      // If we deleted the active project, close it and clear data
      const { activeProject } = get();
      if (activeProject?.id === id) {
        set({ activeProject: null });
        const mediaStore = useMediaStore.getState();
        const timelineStore = useTimelineStore.getState();
        mediaStore.clearAllMedia();
        timelineStore.clearTimeline();
      }
      
      toast.success("Project deleted successfully");
    } catch (error) {
      console.error("❌ [DELETE] Failed to delete project:", error);
      toast.error("Failed to delete project", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  },

  closeProject: () => {
    set({ activeProject: null });

    // Clear data from stores when closing project
    const mediaStore = useMediaStore.getState();
    const timelineStore = useTimelineStore.getState();
    mediaStore.clearAllMedia();
    timelineStore.clearTimeline();
  },

  renameProject: async (id: string, name: string) => {
    const { savedProjects } = get();

    // Find the project to rename
    const projectToRename = savedProjects.find((p) => p.id === id);
    if (!projectToRename) {
      toast.error("Project not found", {
        description: "Please try again",
      });
      return;
    }

    const updatedProject = {
      ...projectToRename,
      name,
      updatedAt: new Date(),
    };

    try {
      // Save to storage
      await storageService.saveProject(updatedProject);

      await get().loadAllProjects();

      // Update activeProject if it's the same project
      const { activeProject } = get();
      if (activeProject?.id === id) {
        set({ activeProject: updatedProject });
      }
    } catch (error) {
      console.error("Failed to rename project:", error);
      toast.error("Failed to rename project", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    }
  },

  duplicateProject: async (projectId: string) => {
    try {
      const project = await storageService.loadProject(projectId);
      if (!project) {
        toast.error("Project not found", {
          description: "Please try again",
        });
        throw new Error("Project not found");
      }

      const { savedProjects } = get();

      // Extract the base name (remove any existing numbering)
      const numberMatch = project.name.match(/^\((\d+)\)\s+(.+)$/);
      const baseName = numberMatch ? numberMatch[2] : project.name;
      const existingNumbers: number[] = [];

      // Check for pattern "(number) baseName" in existing projects
      savedProjects.forEach((p) => {
        const match = p.name.match(/^\((\d+)\)\s+(.+)$/);
        if (match && match[2] === baseName) {
          existingNumbers.push(parseInt(match[1], 10));
        }
      });

      const nextNumber =
        existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

      const newProject: TProject = {
        id: generateUUID(),
        name: `(${nextNumber}) ${baseName}`,
        thumbnail: project.thumbnail,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await storageService.saveProject(newProject);
      await get().loadAllProjects();
      return newProject.id;
    } catch (error) {
      console.error("Failed to duplicate project:", error);
      toast.error("Failed to duplicate project", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
      throw error;
    }
  },

  updateProjectBackground: async (backgroundColor: string) => {
    const { activeProject } = get();
    if (!activeProject) return;

    const updatedProject = {
      ...activeProject,
      backgroundColor,
      updatedAt: new Date(),
    };

    try {
      await storageService.saveProject(updatedProject);
      set({ activeProject: updatedProject });
      await get().loadAllProjects(); // Refresh the list
    } catch (error) {
      console.error("Failed to update project background:", error);
      toast.error("Failed to update background", {
        description: "Please try again",
      });
    }
  },

  updateBackgroundType: async (
    type: "color" | "blur",
    options?: { backgroundColor?: string; blurIntensity?: number }
  ) => {
    const { activeProject } = get();
    if (!activeProject) return;

    const updatedProject = {
      ...activeProject,
      backgroundType: type,
      ...(options?.backgroundColor && {
        backgroundColor: options.backgroundColor,
      }),
      ...(options?.blurIntensity && { blurIntensity: options.blurIntensity }),
      updatedAt: new Date(),
    };

    try {
      await storageService.saveProject(updatedProject);
      set({ activeProject: updatedProject });
      await get().loadAllProjects(); // Refresh the list
    } catch (error) {
      console.error("Failed to update background type:", error);
      toast.error("Failed to update background", {
        description: "Please try again",
      });
    }
  },

  updateProjectFps: async (fps: number) => {
    const { activeProject } = get();
    if (!activeProject) return;

    const updatedProject = {
      ...activeProject,
      fps,
      updatedAt: new Date(),
    };

    try {
      await storageService.saveProject(updatedProject);
      set({ activeProject: updatedProject });
      await get().loadAllProjects(); // Refresh the list
    } catch (error) {
      console.error("Failed to update project FPS:", error);
      toast.error("Failed to update project FPS", {
        description: "Please try again",
      });
    }
  },
}));
