import { TProject } from "@/types/project";
import { create } from "zustand";
import { storageService } from "@/lib/storage/storage-service";
import { toast } from "sonner";
import { useMediaStore } from "./media-store";
import { useTimelineStore } from "./timeline-store";
import { generateUUID } from "@/lib/utils";
import { debugLogger } from "@/lib/debug-logger";

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
    const { isLoading, activeProject } = get();
    if (isLoading) {
      debugLogger.log('ProjectStore', 'CREATE_PROJECT_BLOCKED', { 
        reason: 'already_creating',
        name,
        currentActiveProject: activeProject?.id 
      });
      throw new Error("Project creation already in progress");
    }
    
    debugLogger.log('ProjectStore', 'CREATE_PROJECT_START', { 
      name,
      currentActiveProject: activeProject?.id 
    });
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
      debugLogger.log('ProjectStore', 'STORAGE_SAVE_ATTEMPT', { projectId: newProject.id });
      await storageService.saveProject(newProject);
      debugLogger.log('ProjectStore', 'STORAGE_SAVE_SUCCESS', { projectId: newProject.id });
      
      // Reload all projects to update the list
      debugLogger.log('ProjectStore', 'LOAD_ALL_PROJECTS_START', {});
      await get().loadAllProjects();
      debugLogger.log('ProjectStore', 'LOAD_ALL_PROJECTS_SUCCESS', {});
      
      // Only set activeProject AFTER storage operations complete successfully
      debugLogger.log('ProjectStore', 'SET_ACTIVE_PROJECT', { 
        oldProject: get().activeProject?.id,
        newProject: newProject.id,
        source: 'create_new_project' 
      });
      set({ activeProject: newProject });
      
      // Validate state consistency before returning
      const currentState = get();
      if (!currentState.activeProject || currentState.activeProject.id !== newProject.id) {
        debugLogger.log('ProjectStore', 'STATE_VALIDATION_FAILED', { 
          expectedProject: newProject.id,
          actualProject: currentState.activeProject?.id 
        });
        throw new Error("Project state validation failed");
      }
      
      debugLogger.log('ProjectStore', 'CREATE_PROJECT_SUCCESS', { projectId: newProject.id });
      return newProject.id;
    } catch (error) {
      debugLogger.log('ProjectStore', 'CREATE_PROJECT_FAILED', { 
        projectId: newProject.id,
        error: error.message 
      });
      toast.error("Failed to save new project");
      // Ensure activeProject is not set if creation failed
      debugLogger.log('ProjectStore', 'SET_ACTIVE_PROJECT', { 
        oldProject: get().activeProject?.id,
        newProject: null,
        source: 'create_project_cleanup' 
      });
      set({ activeProject: null });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  loadProject: async (id: string) => {
    debugLogger.log('ProjectStore', 'LOAD_PROJECT_START', { 
      projectId: id,
      currentActiveProject: get().activeProject?.id 
    });
    
    if (!get().isInitialized) {
      set({ isLoading: true });
    }

    // Clear media and timeline immediately to prevent flickering when switching projects
    const mediaStore = useMediaStore.getState();
    const timelineStore = useTimelineStore.getState();
    mediaStore.clearAllMedia();
    timelineStore.clearTimeline();

    try {
      debugLogger.log('ProjectStore', 'STORAGE_LOAD_ATTEMPT', { projectId: id });
      const project = await storageService.loadProject(id);
      if (project) {
        debugLogger.log('ProjectStore', 'STORAGE_LOAD_SUCCESS', { projectId: id });
        debugLogger.log('ProjectStore', 'SET_ACTIVE_PROJECT', { 
          oldProject: get().activeProject?.id,
          newProject: project.id,
          source: 'load_project' 
        });
        set({ activeProject: project });

        // Load project-specific data in parallel
        debugLogger.log('ProjectStore', 'LOADING_PROJECT_MEDIA_TIMELINE', { projectId: id });
        await Promise.all([
          mediaStore.loadProjectMedia(id),
          timelineStore.loadProjectTimeline(id),
        ]);
        debugLogger.log('ProjectStore', 'PROJECT_MEDIA_TIMELINE_LOADED', { projectId: id });
      } else {
        throw new Error(`Project with id ${id} not found`);
      }
      debugLogger.log('ProjectStore', 'LOAD_PROJECT_SUCCESS', { projectId: id });
    } catch (error) {
      debugLogger.log('ProjectStore', 'LOAD_PROJECT_FAILED', { 
        projectId: id, 
        error: error.message 
      });
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
      debugLogger.log('ProjectStore', 'SAVE_CURRENT_PROJECT_FAILED', { 
        projectId: activeProject.id,
        error: error.message 
      });
    }
  },

  loadAllProjects: async () => {
    debugLogger.log('ProjectStore', 'LOAD_ALL_PROJECTS_START', {});
    if (!get().isInitialized) {
      set({ isLoading: true });
    }

    try {
      debugLogger.log('ProjectStore', 'CALLING_STORAGE_SERVICE', {});
      
      // Add Electron environment guard to prevent blocking operations
      const isElectronEnv = typeof window !== 'undefined' && window.electronAPI !== undefined;
      if (isElectronEnv) {
        debugLogger.log('ProjectStore', 'ELECTRON_ENV_DETECTED', {});
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
        debugLogger.log('ProjectStore', 'PROJECTS_LOADED', { count: projects.length });
        set({ savedProjects: projects });
      } else {
        const projects = await storageService.loadAllProjects();
        debugLogger.log('ProjectStore', 'PROJECTS_LOADED', { count: projects.length });
        set({ savedProjects: projects });
      }
      
      debugLogger.log('ProjectStore', 'PROJECTS_SET_IN_STORE', {});
    } catch (error) {
      debugLogger.log('ProjectStore', 'LOAD_ALL_PROJECTS_FAILED', { error: error.message });
    } finally {
      set({ isLoading: false, isInitialized: true });
      debugLogger.log('ProjectStore', 'STORE_INITIALIZED', {});
    }
  },

  deleteProject: async (id: string) => {
    debugLogger.log('ProjectStore', 'DELETE_PROJECT_START', { projectId: id });
    try {
      // Delete project data in parallel
      await Promise.all([
        storageService.deleteProjectMedia(id),
        storageService.deleteProjectTimeline(id),
        storageService.deleteProject(id),
      ]);
      debugLogger.log('ProjectStore', 'PROJECT_DATA_DELETED', { projectId: id });
      
      await get().loadAllProjects(); // Refresh the list
      debugLogger.log('ProjectStore', 'PROJECT_LIST_REFRESHED', {});

      // If we deleted the active project, close it and clear data
      const { activeProject } = get();
      if (activeProject?.id === id) {
        debugLogger.log('ProjectStore', 'SET_ACTIVE_PROJECT', { 
          oldProject: activeProject.id,
          newProject: null,
          source: 'delete_project' 
        });
        set({ activeProject: null });
        const mediaStore = useMediaStore.getState();
        const timelineStore = useTimelineStore.getState();
        mediaStore.clearAllMedia();
        timelineStore.clearTimeline();
      }
      
      toast.success("Project deleted successfully");
    } catch (error) {
      debugLogger.log('ProjectStore', 'DELETE_PROJECT_FAILED', { 
        projectId: id,
        error: error.message 
      });
      toast.error("Failed to delete project", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    }
  },

  closeProject: () => {
    debugLogger.log('ProjectStore', 'SET_ACTIVE_PROJECT', { 
      oldProject: get().activeProject?.id,
      newProject: null,
      source: 'close_project' 
    });
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
