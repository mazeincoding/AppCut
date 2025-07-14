import { create } from "zustand";
import {
  TrackType,
  TimelineElement,
  CreateTimelineElement,
  TimelineTrack,
  TextElement,
  sortTracksByOrder,
  ensureMainTrack,
  validateElementTrackCompatibility,
} from "@/types/timeline";
import { useEditorStore } from "./editor-store";
import { useMediaStore, getMediaAspectRatio } from "./media-store";
import { storageService } from "@/lib/storage/storage-service";
import { useProjectStore } from "./project-store";
import { generateUUID } from "@/lib/utils";

// Helper function to manage element naming with suffixes
const getElementNameWithSuffix = (
  originalName: string,
  suffix: string
): string => {
  // Remove existing suffixes to prevent accumulation
  const baseName = originalName
    .replace(/ \(left\)$/, "")
    .replace(/ \(right\)$/, "")
    .replace(/ \(audio\)$/, "")
    .replace(/ \(split \d+\)$/, "");

  return `${baseName} (${suffix})`;
};

interface TimelineStore {
  // Private track storage
  _tracks: TimelineTrack[];
  history: TimelineTrack[][];
  redoStack: TimelineTrack[][];

  // Always returns properly ordered tracks with main track ensured
  tracks: TimelineTrack[];

  // Manual method if you need to force recomputation
  getSortedTracks: () => TimelineTrack[];

  // Multi-selection
  selectedElements: { trackId: string; elementId: string }[];
  selectElement: (trackId: string, elementId: string, multi?: boolean) => void;
  deselectElement: (trackId: string, elementId: string) => void;
  clearSelectedElements: () => void;
  setSelectedElements: (
    elements: { trackId: string; elementId: string }[]
  ) => void;

  // Drag state
  dragState: {
    isDragging: boolean;
    elementId: string | null;
    trackId: string | null;
    startMouseX: number;
    startElementTime: number;
    clickOffsetTime: number;
    currentTime: number;
  };
  setDragState: (dragState: Partial<TimelineStore["dragState"]>) => void;
  startDrag: (
    elementId: string,
    trackId: string,
    startMouseX: number,
    startElementTime: number,
    clickOffsetTime: number
  ) => void;
  updateDragTime: (currentTime: number) => void;
  endDrag: () => void;

  // Actions
  addTrack: (type: TrackType) => string;
  insertTrackAt: (type: TrackType, index: number) => string;
  removeTrack: (trackId: string) => void;
  addElementToTrack: (trackId: string, element: CreateTimelineElement) => void;
  removeElementFromTrack: (trackId: string, elementId: string) => void;
  moveElementToTrack: (
    fromTrackId: string,
    toTrackId: string,
    elementId: string
  ) => void;
  updateElementTrim: (
    trackId: string,
    elementId: string,
    trimStart: number,
    trimEnd: number
  ) => void;
  updateElementDuration: (
    trackId: string,
    elementId: string,
    duration: number
  ) => void;
  updateElementStartTime: (
    trackId: string,
    elementId: string,
    startTime: number
  ) => void;
  toggleTrackMute: (trackId: string) => void;

  // Split operations for elements
  splitElement: (
    trackId: string,
    elementId: string,
    splitTime: number
  ) => string | null;
  splitAndKeepLeft: (
    trackId: string,
    elementId: string,
    splitTime: number
  ) => void;
  splitAndKeepRight: (
    trackId: string,
    elementId: string,
    splitTime: number
  ) => void;
  separateAudio: (trackId: string, elementId: string) => string | null;

  // Replace media for an element
  replaceElementMedia: (
    trackId: string,
    elementId: string,
    newFile: File
  ) => Promise<boolean>;

  // Computed values
  getTotalDuration: () => number;

  // History actions
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Persistence actions
  loadProjectTimeline: (projectId: string) => Promise<void>;
  saveProjectTimeline: (projectId: string) => Promise<void>;
  clearTimeline: () => void;
  updateTextElement: (
    trackId: string,
    elementId: string,
    updates: Partial<
      Pick<
        TextElement,
        | "content"
        | "fontSize"
        | "fontFamily"
        | "color"
        | "backgroundColor"
        | "textAlign"
        | "fontWeight"
        | "fontStyle"
        | "textDecoration"
        | "x"
        | "y"
        | "rotation"
        | "opacity"
      >
    >
  ) => void;
}

export const useTimelineStore = create<TimelineStore>((set, get) => {
  // Helper to update tracks and maintain ordering
  const updateTracks = (newTracks: TimelineTrack[]) => {
    const tracksWithMain = ensureMainTrack(newTracks);
    const sortedTracks = sortTracksByOrder(tracksWithMain);
    set({
      _tracks: tracksWithMain,
      tracks: sortedTracks,
    });
  };

  // Helper to auto-save timeline changes
  const autoSaveTimeline = async () => {
    const activeProject = useProjectStore.getState().activeProject;
    if (activeProject) {
      try {
        await storageService.saveTimeline(activeProject.id, get()._tracks);
      } catch (error) {
        console.error("Failed to auto-save timeline:", error);
      }
    }
  };

  // Helper to update tracks and auto-save
  const updateTracksAndSave = (newTracks: TimelineTrack[]) => {
    updateTracks(newTracks);
    // Auto-save in background
    setTimeout(autoSaveTimeline, 100);
  };

  // Initialize with proper track ordering
  const initialTracks = ensureMainTrack([]);
  const sortedInitialTracks = sortTracksByOrder(initialTracks);

  return {
    _tracks: initialTracks,
    tracks: sortedInitialTracks,
    history: [],
    redoStack: [],
    selectedElements: [],

    getSortedTracks: () => {
      const { _tracks } = get();
      const tracksWithMain = ensureMainTrack(_tracks);
      return sortTracksByOrder(tracksWithMain);
    },

    pushHistory: () => {
      const { _tracks, history } = get();
      set({
        history: [...history, JSON.parse(JSON.stringify(_tracks))],
        redoStack: [],
      });
    },

    undo: () => {
      const { history, redoStack, _tracks } = get();
      if (history.length === 0) return;
      const prev = history[history.length - 1];
      updateTracksAndSave(prev);
      set({
        history: history.slice(0, -1),
        redoStack: [...redoStack, JSON.parse(JSON.stringify(_tracks))],
      });
    },

    selectElement: (trackId, elementId, multi = false) => {
      set((state) => {
        const exists = state.selectedElements.some(
          (c) => c.trackId === trackId && c.elementId === elementId
        );
        if (multi) {
          return exists
            ? {
                selectedElements: state.selectedElements.filter(
                  (c) => !(c.trackId === trackId && c.elementId === elementId)
                ),
              }
            : {
                selectedElements: [
                  ...state.selectedElements,
                  { trackId, elementId },
                ],
              };
        } else {
          return { selectedElements: [{ trackId, elementId }] };
        }
      });
    },

    deselectElement: (trackId, elementId) => {
      set((state) => ({
        selectedElements: state.selectedElements.filter(
          (c) => !(c.trackId === trackId && c.elementId === elementId)
        ),
      }));
    },

    clearSelectedElements: () => {
      set({ selectedElements: [] });
    },

    setSelectedElements: (elements) => set({ selectedElements: elements }),

    addTrack: (type) => {
      get().pushHistory();

      // Generate proper track name based on type
      const trackName =
        type === "media"
          ? "Media Track"
          : type === "text"
            ? "Text Track"
            : type === "audio"
              ? "Audio Track"
              : "Track";

      const newTrack: TimelineTrack = {
        id: generateUUID(),
        name: trackName,
        type,
        elements: [],
        muted: false,
      };

      updateTracksAndSave([...get()._tracks, newTrack]);
      return newTrack.id;
    },

    insertTrackAt: (type, index) => {
      get().pushHistory();

      // Generate proper track name based on type
      const trackName =
        type === "media"
          ? "Media Track"
          : type === "text"
            ? "Text Track"
            : type === "audio"
              ? "Audio Track"
              : "Track";

      const newTrack: TimelineTrack = {
        id: generateUUID(),
        name: trackName,
        type,
        elements: [],
        muted: false,
      };

      const newTracks = [...get()._tracks];
      newTracks.splice(index, 0, newTrack);
      updateTracksAndSave(newTracks);
      return newTrack.id;
    },

    removeTrack: (trackId) => {
      get().pushHistory();
      updateTracksAndSave(
        get()._tracks.filter((track) => track.id !== trackId)
      );
    },

    addElementToTrack: (trackId, elementData) => {
      get().pushHistory();

      // Validate element type matches track type
      const track = get()._tracks.find((t) => t.id === trackId);
      if (!track) {
        console.error("Track not found:", trackId);
        return;
      }

      // Use utility function for validation
      const validation = validateElementTrackCompatibility(elementData, track);
      if (!validation.isValid) {
        console.error(validation.errorMessage);
        return;
      }

      // For media elements, validate mediaId exists
      if (elementData.type === "media" && !elementData.mediaId) {
        console.error("Media element must have mediaId");
        return;
      }

      // For text elements, validate required text properties
      if (elementData.type === "text" && !elementData.content) {
        console.error("Text element must have content");
        return;
      }

      // Check if this is the first element being added to the timeline
      const currentState = get();
      const totalElementsInTimeline = currentState._tracks.reduce(
        (total, track) => total + track.elements.length,
        0
      );
      const isFirstElement = totalElementsInTimeline === 0;

      const newElement: TimelineElement = {
        ...elementData,
        id: generateUUID(),
        startTime: elementData.startTime || 0,
        trimStart: 0,
        trimEnd: 0,
      } as TimelineElement; // Type assertion since we trust the caller passes valid data

      // If this is the first element and it's a media element, automatically set the project canvas size
      // to match the media's aspect ratio and FPS (for videos)
      if (isFirstElement && newElement.type === "media") {
        const mediaStore = useMediaStore.getState();
        const mediaItem = mediaStore.mediaItems.find(
          (item) => item.id === newElement.mediaId
        );

        if (
          mediaItem &&
          (mediaItem.type === "image" || mediaItem.type === "video")
        ) {
          const editorStore = useEditorStore.getState();
          editorStore.setCanvasSizeFromAspectRatio(
            getMediaAspectRatio(mediaItem)
          );
        }

        // Set project FPS from the first video element
        if (mediaItem && mediaItem.type === "video" && mediaItem.fps) {
          const projectStore = useProjectStore.getState();
          if (projectStore.activeProject) {
            projectStore.updateProjectFps(mediaItem.fps);
          }
        }
      }

      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId
            ? { ...track, elements: [...track.elements, newElement] }
            : track
        )
      );
    },

    removeElementFromTrack: (trackId, elementId) => {
      get().pushHistory();
      updateTracksAndSave(
        get()
          ._tracks.map((track) =>
            track.id === trackId
              ? {
                  ...track,
                  elements: track.elements.filter(
                    (element) => element.id !== elementId
                  ),
                }
              : track
          )
          .filter((track) => track.elements.length > 0)
      );
    },

    moveElementToTrack: (fromTrackId, toTrackId, elementId) => {
      get().pushHistory();

      const fromTrack = get()._tracks.find((track) => track.id === fromTrackId);
      const toTrack = get()._tracks.find((track) => track.id === toTrackId);
      const elementToMove = fromTrack?.elements.find(
        (element) => element.id === elementId
      );

      if (!elementToMove || !toTrack) return;

      // Validate element type compatibility with target track
      const validation = validateElementTrackCompatibility(
        elementToMove,
        toTrack
      );
      if (!validation.isValid) {
        console.error(validation.errorMessage);
        return;
      }

      const newTracks = get()
        ._tracks.map((track) => {
          if (track.id === fromTrackId) {
            return {
              ...track,
              elements: track.elements.filter(
                (element) => element.id !== elementId
              ),
            };
          } else if (track.id === toTrackId) {
            return {
              ...track,
              elements: [...track.elements, elementToMove],
            };
          }
          return track;
        })
        .filter((track) => track.elements.length > 0);

      updateTracksAndSave(newTracks);
    },

    updateElementTrim: (trackId, elementId, trimStart, trimEnd) => {
      get().pushHistory();
      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                elements: track.elements.map((element) =>
                  element.id === elementId
                    ? { ...element, trimStart, trimEnd }
                    : element
                ),
              }
            : track
        )
      );
    },

    updateElementDuration: (trackId, elementId, duration) => {
      get().pushHistory();
      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                elements: track.elements.map((element) =>
                  element.id === elementId ? { ...element, duration } : element
                ),
              }
            : track
        )
      );
    },

    updateElementStartTime: (trackId, elementId, startTime) => {
      get().pushHistory();
      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                elements: track.elements.map((element) =>
                  element.id === elementId ? { ...element, startTime } : element
                ),
              }
            : track
        )
      );
    },

    toggleTrackMute: (trackId) => {
      get().pushHistory();
      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId ? { ...track, muted: !track.muted } : track
        )
      );
    },

    updateTextElement: (trackId, elementId, updates) => {
      get().pushHistory();
      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                elements: track.elements.map((element) =>
                  element.id === elementId && element.type === "text"
                    ? { ...element, ...updates }
                    : element
                ),
              }
            : track
        )
      );
    },

    splitElement: (trackId, elementId, splitTime) => {
      const { _tracks } = get();
      const track = _tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((c) => c.id === elementId);

      if (!element) return null;

      const effectiveStart = element.startTime;
      const effectiveEnd =
        element.startTime +
        (element.duration - element.trimStart - element.trimEnd);

      if (splitTime <= effectiveStart || splitTime >= effectiveEnd) return null;

      get().pushHistory();

      const relativeTime = splitTime - element.startTime;
      const firstDuration = relativeTime;
      const secondDuration =
        element.duration - element.trimStart - element.trimEnd - relativeTime;

      const secondElementId = generateUUID();

      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                elements: track.elements.flatMap((c) =>
                  c.id === elementId
                    ? [
                        {
                          ...c,
                          trimEnd: c.trimEnd + secondDuration,
                          name: getElementNameWithSuffix(c.name, "left"),
                        },
                        {
                          ...c,
                          id: secondElementId,
                          startTime: splitTime,
                          trimStart: c.trimStart + firstDuration,
                          name: getElementNameWithSuffix(c.name, "right"),
                        },
                      ]
                    : [c]
                ),
              }
            : track
        )
      );

      return secondElementId;
    },

    // Split element and keep only the left portion
    splitAndKeepLeft: (trackId, elementId, splitTime) => {
      const { _tracks } = get();
      const track = _tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((c) => c.id === elementId);

      if (!element) return;

      const effectiveStart = element.startTime;
      const effectiveEnd =
        element.startTime +
        (element.duration - element.trimStart - element.trimEnd);

      if (splitTime <= effectiveStart || splitTime >= effectiveEnd) return;

      get().pushHistory();

      const relativeTime = splitTime - element.startTime;
      const durationToRemove =
        element.duration - element.trimStart - element.trimEnd - relativeTime;

      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                elements: track.elements.map((c) =>
                  c.id === elementId
                    ? {
                        ...c,
                        trimEnd: c.trimEnd + durationToRemove,
                        name: getElementNameWithSuffix(c.name, "left"),
                      }
                    : c
                ),
              }
            : track
        )
      );
    },

    // Split element and keep only the right portion
    splitAndKeepRight: (trackId, elementId, splitTime) => {
      const { _tracks } = get();
      const track = _tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((c) => c.id === elementId);

      if (!element) return;

      const effectiveStart = element.startTime;
      const effectiveEnd =
        element.startTime +
        (element.duration - element.trimStart - element.trimEnd);

      if (splitTime <= effectiveStart || splitTime >= effectiveEnd) return;

      get().pushHistory();

      const relativeTime = splitTime - element.startTime;

      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                elements: track.elements.map((c) =>
                  c.id === elementId
                    ? {
                        ...c,
                        startTime: splitTime,
                        trimStart: c.trimStart + relativeTime,
                        name: getElementNameWithSuffix(c.name, "right"),
                      }
                    : c
                ),
              }
            : track
        )
      );
    },

    // Extract audio from video element to an audio track
    separateAudio: (trackId, elementId) => {
      const { _tracks } = get();
      const track = _tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((c) => c.id === elementId);

      if (!element || track?.type !== "media") return null;

      get().pushHistory();

      // Find existing audio track or prepare to create one
      const existingAudioTrack = _tracks.find((t) => t.type === "audio");
      const audioElementId = generateUUID();

      if (existingAudioTrack) {
        // Add audio element to existing audio track
        updateTracksAndSave(
          get()._tracks.map((track) =>
            track.id === existingAudioTrack.id
              ? {
                  ...track,
                  elements: [
                    ...track.elements,
                    {
                      ...element,
                      id: audioElementId,
                      name: getElementNameWithSuffix(element.name, "audio"),
                    },
                  ],
                }
              : track
          )
        );
      } else {
        // Create new audio track with the audio element in a single atomic update
        const newAudioTrack: TimelineTrack = {
          id: generateUUID(),
          name: "Audio Track",
          type: "audio",
          elements: [
            {
              ...element,
              id: audioElementId,
              name: getElementNameWithSuffix(element.name, "audio"),
            },
          ],
          muted: false,
        };

        updateTracksAndSave([...get()._tracks, newAudioTrack]);
      }

      return audioElementId;
    },

    // Replace media for an element
    replaceElementMedia: async (trackId, elementId, newFile) => {
      const { _tracks } = get();
      const track = _tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((c) => c.id === elementId);

      if (!element || element.type !== "media") return false;

      try {
        const mediaStore = useMediaStore.getState();
        const projectStore = useProjectStore.getState();

        if (!projectStore.activeProject) return false;

        // Import required media processing functions
        const {
          getFileType,
          getImageDimensions,
          generateVideoThumbnail,
          getMediaDuration,
        } = await import("./media-store");

        const fileType = getFileType(newFile);
        if (!fileType) return false;

        // Process the new media file
        let mediaData: any = {
          name: newFile.name,
          type: fileType,
          file: newFile,
          url: URL.createObjectURL(newFile),
        };

        // Get media-specific metadata
        if (fileType === "image") {
          const { width, height } = await getImageDimensions(newFile);
          mediaData.width = width;
          mediaData.height = height;
        } else if (fileType === "video") {
          const [duration, { thumbnailUrl, width, height }] = await Promise.all(
            [getMediaDuration(newFile), generateVideoThumbnail(newFile)]
          );
          mediaData.duration = duration;
          mediaData.thumbnailUrl = thumbnailUrl;
          mediaData.width = width;
          mediaData.height = height;
        } else if (fileType === "audio") {
          mediaData.duration = await getMediaDuration(newFile);
        }

        // Add new media item to store
        await mediaStore.addMediaItem(projectStore.activeProject.id, mediaData);

        // Find the newly created media item
        const newMediaItem = mediaStore.mediaItems.find(
          (item) => item.file === newFile
        );

        if (!newMediaItem) return false;

        get().pushHistory();

        // Update the timeline element to reference the new media
        updateTracksAndSave(
          _tracks.map((track) =>
            track.id === trackId
              ? {
                  ...track,
                  elements: track.elements.map((c) =>
                    c.id === elementId
                      ? {
                          ...c,
                          mediaId: newMediaItem.id,
                          name: newMediaItem.name,
                          // Update duration if the new media has a different duration
                          duration: newMediaItem.duration || c.duration,
                        }
                      : c
                  ),
                }
              : track
          )
        );

        return true;
      } catch (error) {
        console.log(
          JSON.stringify({
            error: "Failed to replace element media",
            details: error,
          })
        );
        return false;
      }
    },

    getTotalDuration: () => {
      const { _tracks } = get();
      if (_tracks.length === 0) return 0;

      const trackEndTimes = _tracks.map((track) =>
        track.elements.reduce((maxEnd, element) => {
          const elementEnd =
            element.startTime +
            element.duration -
            element.trimStart -
            element.trimEnd;
          return Math.max(maxEnd, elementEnd);
        }, 0)
      );

      return Math.max(...trackEndTimes, 0);
    },

    redo: () => {
      const { redoStack } = get();
      if (redoStack.length === 0) return;
      const next = redoStack[redoStack.length - 1];
      updateTracksAndSave(next);
      set({ redoStack: redoStack.slice(0, -1) });
    },

    dragState: {
      isDragging: false,
      elementId: null,
      trackId: null,
      startMouseX: 0,
      startElementTime: 0,
      clickOffsetTime: 0,
      currentTime: 0,
    },

    setDragState: (dragState) =>
      set((state) => ({
        dragState: { ...state.dragState, ...dragState },
      })),

    startDrag: (
      elementId,
      trackId,
      startMouseX,
      startElementTime,
      clickOffsetTime
    ) => {
      set({
        dragState: {
          isDragging: true,
          elementId,
          trackId,
          startMouseX,
          startElementTime,
          clickOffsetTime,
          currentTime: startElementTime,
        },
      });
    },

    updateDragTime: (currentTime) => {
      set((state) => ({
        dragState: {
          ...state.dragState,
          currentTime,
        },
      }));
    },

    endDrag: () => {
      set({
        dragState: {
          isDragging: false,
          elementId: null,
          trackId: null,
          startMouseX: 0,
          startElementTime: 0,
          clickOffsetTime: 0,
          currentTime: 0,
        },
      });
    },

    // Persistence methods
    loadProjectTimeline: async (projectId) => {
      try {
        const tracks = await storageService.loadTimeline(projectId);
        if (tracks) {
          updateTracks(tracks);
        } else {
          // No timeline saved yet, initialize with default
          const defaultTracks = ensureMainTrack([]);
          updateTracks(defaultTracks);
        }
        // Clear history when loading a project
        set({ history: [], redoStack: [] });
      } catch (error) {
        console.error("Failed to load timeline:", error);
        // Initialize with default on error
        const defaultTracks = ensureMainTrack([]);
        updateTracks(defaultTracks);
        set({ history: [], redoStack: [] });
      }
    },

    saveProjectTimeline: async (projectId) => {
      try {
        await storageService.saveTimeline(projectId, get()._tracks);
      } catch (error) {
        console.error("Failed to save timeline:", error);
      }
    },

    clearTimeline: () => {
      const defaultTracks = ensureMainTrack([]);
      updateTracks(defaultTracks);
      set({ history: [], redoStack: [], selectedElements: [] });
    },
  };
});
