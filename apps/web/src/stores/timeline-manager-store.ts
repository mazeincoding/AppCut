import { create } from "zustand";
import { TTimeline } from "@/types/project";
import { generateUUID } from "@/lib/utils";
import { useProjectStore } from "./project-store";
import { useTimelineStore } from "./timeline-store";
import { useEditorStore } from "./editor-store";
import { storageService } from "@/lib/storage/storage-service";
import { toast } from "sonner";

interface TimelineManagerStore {
  // State
  activeTimeline: TTimeline | null;
  timelines: TTimeline[];

  // Actions
  createTimeline: (
    name: string,
    options?: {
      width?: number;
      height?: number;
      fps?: number;
      copyFromActive?: boolean;
    }
  ) => Promise<string>;
  deleteTimeline: (timelineId: string) => Promise<void>;
  switchToTimeline: (timelineId: string) => Promise<void>;
  renameTimeline: (timelineId: string, name: string) => Promise<void>;
  updateTimelineSettings: (
    timelineId: string,
    settings: Partial<
      Pick<
        TTimeline,
        | "width"
        | "height"
        | "fps"
        | "backgroundColor"
        | "backgroundType"
        | "blurIntensity"
      >
    >
  ) => Promise<void>;
  duplicateTimeline: (timelineId: string, newName?: string) => Promise<string>;

  // Getters
  getTimelineById: (timelineId: string) => TTimeline | null;

  // Initialization
  initializeTimelines: (projectId: string) => Promise<void>;
  saveActiveTimelineData: () => Promise<void>;
}

export const useTimelineManagerStore = create<TimelineManagerStore>(
  (set, get) => ({
    // Initial state
    activeTimeline: null,
    timelines: [],

    createTimeline: async (name: string, options = {}) => {
      const projectStore = useProjectStore.getState();
      const editorStore = useEditorStore.getState();
      const { activeProject } = projectStore;

      if (!activeProject) {
        throw new Error("No active project");
      }

      const {
        width = editorStore.canvasSize.width,
        height = editorStore.canvasSize.height,
        fps = activeProject.fps || 30,
        copyFromActive = false,
      } = options;

      const newTimeline: TTimeline = {
        id: generateUUID(),
        name,
        width,
        height,
        fps,
        backgroundColor: activeProject.backgroundColor,
        backgroundType: activeProject.backgroundType,
        blurIntensity: activeProject.blurIntensity,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      try {
        // Save current timeline data before switching
        await get().saveActiveTimelineData();

        // Create new timeline tracks
        const timelineStore = useTimelineStore.getState();
        let newTracks = [];

        if (copyFromActive && get().activeTimeline) {
          // Copy tracks from active timeline
          newTracks = [...timelineStore.tracks];
        } else {
          // Create empty timeline with main track
          const { ensureMainTrack } = await import("@/types/timeline");
          newTracks = ensureMainTrack([]);
        }

        // Save the new timeline's track data
        await storageService.saveTimeline(newTimeline.id, newTracks);

        // Update project with new timeline
        const updatedTimelines = [...get().timelines, newTimeline];
        const updatedProject = {
          ...activeProject,
          timelines: updatedTimelines,
          activeTimelineId: newTimeline.id,
          updatedAt: new Date(),
        };

        await storageService.saveProject(updatedProject);
        await projectStore.updateProject(updatedProject);

        set({
          timelines: updatedTimelines,
          activeTimeline: newTimeline,
        });

        // Update editor canvas size
        editorStore.setCanvasSize({ width, height });

        // Load the new timeline
        timelineStore.loadProjectTimeline(newTimeline.id);

        toast.success(`Timeline "${name}" created successfully`);
        return newTimeline.id;
      } catch (error) {
        console.error("Failed to create timeline:", error);
        toast.error("Failed to create timeline");
        throw error;
      }
    },

    deleteTimeline: async (timelineId: string) => {
      const projectStore = useProjectStore.getState();
      const { activeProject } = projectStore;

      if (!activeProject) {
        throw new Error("No active project");
      }

      const timeline = get().getTimelineById(timelineId);
      if (!timeline) {
        throw new Error("Timeline not found");
      }

      const currentTimelines = get().timelines;
      if (currentTimelines.length <= 1) {
        toast.error("Cannot delete the last timeline");
        return;
      }

      try {
        // Remove timeline data from storage
        await storageService.deleteTimeline(timelineId);

        // Remove from timelines list
        const updatedTimelines = currentTimelines.filter(
          (t) => t.id !== timelineId
        );

        // If we're deleting the active timeline, switch to the first available
        let newActiveTimelineId = activeProject.activeTimelineId;
        if (timelineId === activeProject.activeTimelineId) {
          newActiveTimelineId = updatedTimelines[0]?.id;
        }

        // Update project
        const updatedProject = {
          ...activeProject,
          timelines: updatedTimelines,
          activeTimelineId: newActiveTimelineId,
          updatedAt: new Date(),
        };

        await storageService.saveProject(updatedProject);
        await projectStore.updateProject(updatedProject);

        set({
          timelines: updatedTimelines,
          activeTimeline:
            updatedTimelines.find((t) => t.id === newActiveTimelineId) || null,
        });

        // If we deleted the active timeline, switch to the new active one
        if (
          timelineId === activeProject.activeTimelineId &&
          newActiveTimelineId
        ) {
          await get().switchToTimeline(newActiveTimelineId);
        }

        toast.success(`Timeline "${timeline.name}" deleted successfully`);
      } catch (error) {
        console.error("Failed to delete timeline:", error);
        toast.error("Failed to delete timeline");
        throw error;
      }
    },

    switchToTimeline: async (timelineId: string) => {
      const projectStore = useProjectStore.getState();
      const timelineStore = useTimelineStore.getState();
      const editorStore = useEditorStore.getState();
      const { activeProject } = projectStore;

      if (!activeProject) {
        throw new Error("No active project");
      }

      const timeline = get().getTimelineById(timelineId);
      if (!timeline) {
        throw new Error("Timeline not found");
      }

      // Don't switch if already active
      if (get().activeTimeline?.id === timelineId) {
        return;
      }

      try {
        // Save current timeline data before switching
        await get().saveActiveTimelineData();

        // Update project's active timeline
        const updatedProject = {
          ...activeProject,
          activeTimelineId: timelineId,
          updatedAt: new Date(),
        };

        await storageService.saveProject(updatedProject);
        await projectStore.updateProject(updatedProject);

        set({ activeTimeline: timeline });

        // Update editor canvas size and project settings
        editorStore.setCanvasSize({
          width: timeline.width,
          height: timeline.height,
        });
        await projectStore.updateProjectFps(timeline.fps);

        if (timeline.backgroundColor) {
          await projectStore.updateBackgroundType(
            timeline.backgroundType || "color",
            {
              backgroundColor: timeline.backgroundColor,
              blurIntensity: timeline.blurIntensity,
            }
          );
        }

        // Load timeline tracks
        await timelineStore.loadProjectTimeline(timelineId);

        toast.success(`Switched to timeline "${timeline.name}"`);
      } catch (error) {
        console.error("Failed to switch timeline:", error);
        toast.error("Failed to switch timeline");
        throw error;
      }
    },

    renameTimeline: async (timelineId: string, name: string) => {
      const projectStore = useProjectStore.getState();
      const { activeProject } = projectStore;

      if (!activeProject) {
        throw new Error("No active project");
      }

      const timeline = get().getTimelineById(timelineId);
      if (!timeline) {
        throw new Error("Timeline not found");
      }

      try {
        const updatedTimeline = {
          ...timeline,
          name,
          updatedAt: new Date(),
        };

        const updatedTimelines = get().timelines.map((t) =>
          t.id === timelineId ? updatedTimeline : t
        );

        const updatedProject = {
          ...activeProject,
          timelines: updatedTimelines,
          updatedAt: new Date(),
        };

        await storageService.saveProject(updatedProject);
        await projectStore.updateProject(updatedProject);

        set({
          timelines: updatedTimelines,
          activeTimeline:
            timeline.id === get().activeTimeline?.id
              ? updatedTimeline
              : get().activeTimeline,
        });

        toast.success(`Timeline renamed to "${name}"`);
      } catch (error) {
        console.error("Failed to rename timeline:", error);
        toast.error("Failed to rename timeline");
        throw error;
      }
    },

    updateTimelineSettings: async (timelineId: string, settings) => {
      const projectStore = useProjectStore.getState();
      const editorStore = useEditorStore.getState();
      const { activeProject } = projectStore;

      if (!activeProject) {
        throw new Error("No active project");
      }

      const timeline = get().getTimelineById(timelineId);
      if (!timeline) {
        throw new Error("Timeline not found");
      }

      try {
        const updatedTimeline = {
          ...timeline,
          ...settings,
          updatedAt: new Date(),
        };

        const updatedTimelines = get().timelines.map((t) =>
          t.id === timelineId ? updatedTimeline : t
        );

        const updatedProject = {
          ...activeProject,
          timelines: updatedTimelines,
          updatedAt: new Date(),
        };

        await storageService.saveProject(updatedProject);
        await projectStore.updateProject(updatedProject);

        set({
          timelines: updatedTimelines,
          activeTimeline:
            timeline.id === get().activeTimeline?.id
              ? updatedTimeline
              : get().activeTimeline,
        });

        // If this is the active timeline, update editor settings
        if (timeline.id === get().activeTimeline?.id) {
          if (settings.width && settings.height) {
            editorStore.setCanvasSize({
              width: settings.width,
              height: settings.height,
            });
          }
          if (settings.fps) {
            await projectStore.updateProjectFps(settings.fps);
          }
          if (
            settings.backgroundColor ||
            settings.backgroundType ||
            settings.blurIntensity
          ) {
            await projectStore.updateBackgroundType(
              settings.backgroundType || timeline.backgroundType || "color",
              {
                backgroundColor:
                  settings.backgroundColor || timeline.backgroundColor,
                blurIntensity: settings.blurIntensity || timeline.blurIntensity,
              }
            );
          }
        }

        toast.success("Timeline settings updated");
      } catch (error) {
        console.error("Failed to update timeline settings:", error);
        toast.error("Failed to update timeline settings");
        throw error;
      }
    },

    duplicateTimeline: async (timelineId: string, newName?: string) => {
      const timeline = get().getTimelineById(timelineId);
      if (!timeline) {
        throw new Error("Timeline not found");
      }

      const name = newName || `${timeline.name} (Copy)`;

      try {
        // Get the tracks from the source timeline
        const sourceTracksData = await storageService.loadTimeline(timelineId);

        const newTimelineId = await get().createTimeline(name, {
          width: timeline.width,
          height: timeline.height,
          fps: timeline.fps,
          copyFromActive: false,
        });

        // Save the copied tracks to the new timeline
        if (sourceTracksData) {
          await storageService.saveTimeline(newTimelineId, sourceTracksData);
        }

        toast.success(`Timeline duplicated as "${name}"`);
        return newTimelineId;
      } catch (error) {
        console.error("Failed to duplicate timeline:", error);
        toast.error("Failed to duplicate timeline");
        throw error;
      }
    },

    getTimelineById: (timelineId: string) => {
      return get().timelines.find((t) => t.id === timelineId) || null;
    },

    initializeTimelines: async (projectId: string) => {
      const projectStore = useProjectStore.getState();
      const { activeProject } = projectStore;

      if (!activeProject) {
        return;
      }

      try {
        // If project has no timelines, create a default one
        if (!activeProject.timelines || activeProject.timelines.length === 0) {
          const defaultTimeline: TTimeline = {
            id: generateUUID(),
            name: "Main Timeline",
            width: 1920,
            height: 1080,
            fps: activeProject.fps || 30,
            backgroundColor: activeProject.backgroundColor,
            backgroundType: activeProject.backgroundType,
            blurIntensity: activeProject.blurIntensity,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const updatedProject = {
            ...activeProject,
            timelines: [defaultTimeline],
            activeTimelineId: defaultTimeline.id,
            updatedAt: new Date(),
          };

          await storageService.saveProject(updatedProject);
          await projectStore.updateProject(updatedProject);

          set({
            timelines: [defaultTimeline],
            activeTimeline: defaultTimeline,
          });
        } else {
          // Load existing timelines
          const activeTimelineId =
            activeProject.activeTimelineId || activeProject.timelines[0]?.id;
          const activeTimeline =
            activeProject.timelines.find((t) => t.id === activeTimelineId) ||
            activeProject.timelines[0];

          set({
            timelines: activeProject.timelines,
            activeTimeline: activeTimeline || null,
          });

          // Switch to active timeline if needed
          if (activeTimeline && activeTimelineId) {
            await get().switchToTimeline(activeTimelineId);
          }
        }
      } catch (error) {
        console.error("Failed to initialize timelines:", error);
      }
    },

    saveActiveTimelineData: async () => {
      const activeTimeline = get().activeTimeline;
      if (!activeTimeline) {
        return;
      }

      try {
        const timelineStore = useTimelineStore.getState();
        await timelineStore.saveProjectTimeline(activeTimeline.id);
      } catch (error) {
        console.error("Failed to save active timeline data:", error);
      }
    },
  })
);
