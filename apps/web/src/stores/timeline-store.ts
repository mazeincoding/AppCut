import { create } from "zustand";
import {
  TrackType,
  TimelineElement,
  CreateTimelineElement,
  TimelineTrack,
  TextElement,
  DragData,
  sortTracksByOrder,
  ensureMainTrack,
  validateElementTrackCompatibility,
} from "@/types/timeline";
import {
  useMediaStore,
  getMediaAspectRatio,
  type MediaItem,
} from "./media-store";
import { findBestCanvasPreset } from "@/lib/editor-utils";
import { storageService } from "@/lib/storage/storage-service";
import { useProjectStore } from "./project-store";
import { generateUUID } from "@/lib/utils";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { checkElementOverlaps, resolveElementOverlaps } from "@/lib/timeline";

// Helper function to manage element naming with suffixes
const getElementNameWithSuffix = (
  originalName: string,
  suffix: string
): string => {
  // Remove existing suffixes to prevent accumulation
  const baseName = originalName
    .replace(/ \(left\)$/i, "")
    .replace(/ \(right\)$/i, "")
    .replace(/ \(audio\)$/i, "")
    .replace(/ \(split \d+\)$/i, "");

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

  // Snapping settings
  snappingEnabled: boolean;

  // Snapping actions
  toggleSnapping: () => void;

  // Ripple editing mode
  rippleEditingEnabled: boolean;
  toggleRippleEditing: () => void;

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
  removeTrackWithRipple: (trackId: string) => void;
  addElementToTrack: (trackId: string, element: CreateTimelineElement) => void;
  removeElementFromTrack: (
    trackId: string,
    elementId: string,
    pushHistory?: boolean
  ) => void;
  moveElementToTrack: (
    fromTrackId: string,
    toTrackId: string,
    elementId: string
  ) => void;
  updateElementTrim: (
    trackId: string,
    elementId: string,
    trimStart: number,
    trimEnd: number,
    pushHistory?: boolean
  ) => void;
  updateElementDuration: (
    trackId: string,
    elementId: string,
    duration: number,
    pushHistory?: boolean
  ) => void;
  updateElementStartTime: (
    trackId: string,
    elementId: string,
    startTime: number,
    pushHistory?: boolean
  ) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleElementHidden: (trackId: string, elementId: string) => void;
  toggleElementMuted: (trackId: string, elementId: string) => void;

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
  ) => Promise<{ success: boolean; error?: string }>;

  // Ripple editing functions
  updateElementStartTimeWithRipple: (
    trackId: string,
    elementId: string,
    newStartTime: number
  ) => void;
  removeElementFromTrackWithRipple: (
    trackId: string,
    elementId: string,
    pushHistory?: boolean
  ) => void;

  // Computed values
  getTotalDuration: () => number;
  getProjectThumbnail: (projectId: string) => Promise<string | null>;

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
  checkElementOverlap: (
    trackId: string,
    startTime: number,
    duration: number,
    excludeElementId?: string
  ) => boolean;
  findOrCreateTrack: (trackType: TrackType) => string;
  addMediaAtTime: (item: MediaItem, currentTime?: number) => boolean;
  addTextAtTime: (item: TextElement, currentTime?: number) => boolean;
  addMediaToNewTrack: (item: MediaItem) => boolean;
  addTextToNewTrack: (item: TextElement | DragData) => boolean;
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
    rippleEditingEnabled: false,

    // Snapping settings defaults
    snappingEnabled: true,

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
        }
        return { selectedElements: [{ trackId, elementId }] };
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
      const { rippleEditingEnabled } = get();

      if (rippleEditingEnabled) {
        get().removeTrackWithRipple(trackId);
      } else {
        get().pushHistory();
        updateTracksAndSave(
          get()._tracks.filter((track) => track.id !== trackId)
        );
      }
    },

    removeTrackWithRipple: (trackId) => {
      const { _tracks } = get();
      const trackToRemove = _tracks.find((t) => t.id === trackId);

      if (!trackToRemove) return;

      get().pushHistory();

      const occupiedRanges = trackToRemove.elements.map((element) => ({
        startTime: element.startTime,
        endTime:
          element.startTime +
          (element.duration - element.trimStart - element.trimEnd),
      }));

      occupiedRanges.sort((a, b) => a.startTime - b.startTime);

      const mergedRanges: Array<{
        startTime: number;
        endTime: number;
        duration: number;
      }> = [];

      for (const range of occupiedRanges) {
        if (mergedRanges.length === 0) {
          mergedRanges.push({
            startTime: range.startTime,
            endTime: range.endTime,
            duration: range.endTime - range.startTime,
          });
        } else {
          const lastRange = mergedRanges[mergedRanges.length - 1];
          if (range.startTime <= lastRange.endTime) {
            lastRange.endTime = Math.max(lastRange.endTime, range.endTime);
            lastRange.duration = lastRange.endTime - lastRange.startTime;
          } else {
            mergedRanges.push({
              startTime: range.startTime,
              endTime: range.endTime,
              duration: range.endTime - range.startTime,
            });
          }
        }
      }

      const updatedTracks = _tracks
        .filter((track) => track.id !== trackId)
        .map((track) => {
          const updatedElements = track.elements.map((element) => {
            let newStartTime = element.startTime;

            for (let i = mergedRanges.length - 1; i >= 0; i--) {
              const gap = mergedRanges[i];
              if (newStartTime >= gap.endTime) {
                newStartTime -= gap.duration;
              }
            }

            return {
              ...element,
              startTime: Math.max(0, newStartTime),
            };
          });

          const hasOverlaps = checkElementOverlaps(updatedElements);
          if (hasOverlaps) {
            const resolvedElements = resolveElementOverlaps(updatedElements);
            return { ...track, elements: resolvedElements };
          }

          return { ...track, elements: updatedElements };
        });

      updateTracksAndSave(updatedTracks);
    },

    addElementToTrack: (trackId, elementData) => {
      get().pushHistory();

      const track = get()._tracks.find((t) => t.id === trackId);
      if (!track) {
        console.error("Track not found:", trackId);
        return;
      }

      const validation = validateElementTrackCompatibility(elementData, track);
      if (!validation.isValid) {
        console.error(validation.errorMessage);
        return;
      }

      if (elementData.type === "media" && !elementData.mediaId) {
        console.error("Media element must have mediaId");
        return;
      }

      if (elementData.type === "text" && !elementData.content) {
        console.error("Text element must have content");
        return;
      }

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
        ...(elementData.type === "media" ? { muted: false } : {}),
      } as TimelineElement;

      if (isFirstElement && newElement.type === "media") {
        const mediaStore = useMediaStore.getState();
        const mediaItem = mediaStore.mediaItems.find(
          (item) => item.id === newElement.mediaId
        );

        if (
          mediaItem &&
          (mediaItem.type === "image" || mediaItem.type === "video")
        ) {
          const projectStore = useProjectStore.getState();
          projectStore.updateCanvasSize(
            findBestCanvasPreset(getMediaAspectRatio(mediaItem)),
            "original"
          );
        }

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

      get().selectElement(trackId, newElement.id);
    },

    removeElementFromTrack: (trackId, elementId, pushHistory = true) => {
      const { rippleEditingEnabled } = get();

      if (rippleEditingEnabled) {
        get().removeElementFromTrackWithRipple(trackId, elementId, pushHistory);
      } else {
        if (pushHistory) get().pushHistory();
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
      }
    },

    removeElementFromTrackWithRipple: (
      trackId,
      elementId,
      pushHistory = true
    ) => {
      const { _tracks, rippleEditingEnabled } = get();

      if (!rippleEditingEnabled) {
        get().removeElementFromTrack(trackId, elementId, pushHistory);
        return;
      }

      const track = _tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((e) => e.id === elementId);

      if (!element || !track) return;

      if (pushHistory) get().pushHistory();

      const elementStartTime = element.startTime;
      const elementDuration =
        element.duration - element.trimStart - element.trimEnd;
      const elementEndTime = elementStartTime + elementDuration;

      const updatedTracks = _tracks
        .map((currentTrack) => {
          const shouldApplyRipple = currentTrack.id === trackId;

          const updatedElements = currentTrack.elements
            .filter((currentElement) => {
              if (
                currentElement.id === elementId &&
                currentTrack.id === trackId
              ) {
                return false;
              }
              return true;
            })
            .map((currentElement) => {
              if (!shouldApplyRipple) {
                return currentElement;
              }

              if (currentElement.startTime >= elementEndTime) {
                return {
                  ...currentElement,
                  startTime: Math.max(
                    0,
                    currentElement.startTime - elementDuration
                  ),
                };
              }
              return currentElement;
            });

          const hasOverlaps = checkElementOverlaps(updatedElements);
          if (hasOverlaps) {
            const resolvedElements = resolveElementOverlaps(updatedElements);
            return { ...currentTrack, elements: resolvedElements };
          }

          return { ...currentTrack, elements: updatedElements };
        })
        .filter((track) => track.elements.length > 0 || track.isMain);

      updateTracksAndSave(updatedTracks);
    },

    moveElementToTrack: (fromTrackId, toTrackId, elementId) => {
      get().pushHistory();

      const fromTrack = get()._tracks.find((track) => track.id === fromTrackId);
      const toTrack = get()._tracks.find((track) => track.id === toTrackId);
      const elementToMove = fromTrack?.elements.find(
        (element) => element.id === elementId
      );

      if (!elementToMove || !toTrack) return;

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
          }
          if (track.id === toTrackId) {
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

    updateElementTrim: (
      trackId,
      elementId,
      trimStart,
      trimEnd,
      pushHistory = true
    ) => {
      if (pushHistory) get().pushHistory();
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

    updateElementDuration: (
      trackId,
      elementId,
      duration,
      pushHistory = true
    ) => {
      if (pushHistory) get().pushHistory();
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

    updateElementStartTime: (
      trackId,
      elementId,
      startTime,
      pushHistory = true
    ) => {
      if (pushHistory) get().pushHistory();
      const clampedStartTime = Math.max(0, startTime);
      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                elements: track.elements.map((element) =>
                  element.id === elementId
                    ? { ...element, startTime: clampedStartTime }
                    : element
                ),
              }
            : track
        )
      );
    },

    updateElementStartTimeWithRipple: (trackId, elementId, newStartTime) => {
      const { _tracks, rippleEditingEnabled } = get();

      if (!rippleEditingEnabled) {
        get().updateElementStartTime(trackId, elementId, newStartTime);
        return;
      }

      const track = _tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((e) => e.id === elementId);

      if (!element || !track) return;

      get().pushHistory();

      const oldStartTime = element.startTime;
      const oldEndTime =
        element.startTime +
        (element.duration - element.trimStart - element.trimEnd);
      const newEndTime =
        newStartTime + (element.duration - element.trimStart - element.trimEnd);
      const timeDelta = newStartTime - oldStartTime;

      const updatedTracks = _tracks.map((currentTrack) => {
        const shouldApplyRipple = currentTrack.id === trackId;

        const updatedElements = currentTrack.elements.map((currentElement) => {
          if (currentElement.id === elementId && currentTrack.id === trackId) {
            return { ...currentElement, startTime: Math.max(0, newStartTime) };
          }

          if (!shouldApplyRipple) {
            return currentElement;
          }

          const currentElementStart = currentElement.startTime;
          const currentElementEnd =
            currentElement.startTime +
            (currentElement.duration -
              currentElement.trimStart -
              currentElement.trimEnd);

          if (timeDelta > 0) {
            if (currentElementStart >= oldEndTime) {
              return {
                ...currentElement,
                startTime: currentElementStart + timeDelta,
              };
            }
          } else if (timeDelta < 0) {
            if (
              currentElementStart >= newEndTime &&
              currentElementStart >= oldStartTime
            ) {
              return {
                ...currentElement,
                startTime: Math.max(0, currentElementStart + timeDelta),
              };
            }
          }

          return currentElement;
        });

        const hasOverlaps = checkElementOverlaps(updatedElements);
        if (hasOverlaps) {
          const resolvedElements = resolveElementOverlaps(updatedElements);
          return { ...currentTrack, elements: resolvedElements };
        }

        return { ...currentTrack, elements: updatedElements };
      });

      updateTracksAndSave(updatedTracks);
    },

    toggleTrackMute: (trackId) => {
      get().pushHistory();
      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId ? { ...track, muted: !track.muted } : track
        )
      );
    },

    toggleElementHidden: (trackId, elementId) => {
      get().pushHistory();
      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                elements: track.elements.map((element) =>
                  element.id === elementId
                    ? { ...element, hidden: !element.hidden }
                    : element
                ),
              }
            : track
        )
      );
    },

    toggleElementMuted: (trackId, elementId) => {
      get().pushHistory();
      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                elements: track.elements.map((element) =>
                  element.id === elementId && element.type === "media"
                    ? { ...element, muted: !element.muted }
                    : element
                ),
              }
            : track
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

      const existingAudioTrack = _tracks.find((t) => t.type === "audio");
      const audioElementId = generateUUID();

      if (existingAudioTrack) {
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
    replaceElementMedia: async (
      trackId: string,
      elementId: string,
      newFile: File
    ): Promise<{ success: boolean; error?: string }> => {
      const { _tracks } = get();
      const track = _tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((c) => c.id === elementId);

      if (!element) {
        return { success: false, error: "Timeline element not found" };
      }

      if (element.type !== "media") {
        return {
          success: false,
          error: "Replace is only available for media clips",
        };
      }

      try {
        const mediaStore = useMediaStore.getState();
        const projectStore = useProjectStore.getState();

        if (!projectStore.activeProject) {
          return { success: false, error: "No active project found" };
        }

        const {
          getFileType,
          getImageDimensions,
          generateVideoThumbnail,
          getMediaDuration,
        } = await import("./media-store");

        const fileType = getFileType(newFile);
        if (!fileType) {
          return {
            success: false,
            error:
              "Unsupported file type. Please select a video, audio, or image file.",
          };
        }

        const mediaData: any = {
          name: newFile.name,
          type: fileType,
          file: newFile,
          url: URL.createObjectURL(newFile),
        };

        try {
          if (fileType === "image") {
            const { width, height } = await getImageDimensions(newFile);
            mediaData.width = width;
            mediaData.height = height;
          } else if (fileType === "video") {
            const [duration, { thumbnailUrl, width, height }] =
              await Promise.all([
                getMediaDuration(newFile),
                generateVideoThumbnail(newFile),
              ]);
            mediaData.duration = duration;
            mediaData.thumbnailUrl = thumbnailUrl;
            mediaData.width = width;
            mediaData.height = height;
          } else if (fileType === "audio") {
            mediaData.duration = await getMediaDuration(newFile);
          }
        } catch (error) {
          return {
            success: false,
            error: `Failed to process ${fileType} file: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }

        try {
          await mediaStore.addMediaItem(
            projectStore.activeProject.id,
            mediaData
          );
        } catch (error) {
          return {
            success: false,
            error: `Failed to add media to project: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }

        const newMediaItem = mediaStore.mediaItems.find(
          (item) => item.file === newFile
        );

        if (!newMediaItem) {
          return {
            success: false,
            error: "Failed to create media item in project. Please try again.",
          };
        }

        get().pushHistory();

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
                          duration: newMediaItem.duration || c.duration,
                        }
                      : c
                  ),
                }
              : track
          )
        );

        return { success: true };
      } catch (error) {
        console.error("Failed to replace element media:", error);
        return {
          success: false,
          error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
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

    getProjectThumbnail: async (projectId) => {
      try {
        const tracks = await storageService.loadTimeline(projectId);
        const mediaItems = await storageService.loadAllMediaItems(projectId);

        if (!tracks || !mediaItems.length) return null;

        const firstMediaElement = tracks
          .flatMap((track) => track.elements)
          .filter((element) => element.type === "media")
          .sort((a, b) => a.startTime - b.startTime)[0];

        if (!firstMediaElement) return null;

        const mediaItem = mediaItems.find(
          (item) => item.id === firstMediaElement.mediaId
        );
        if (!mediaItem) return null;

        if (mediaItem.type === "video" && mediaItem.file) {
          const { generateVideoThumbnail } = await import(
            "@/stores/media-store"
          );
          const { thumbnailUrl } = await generateVideoThumbnail(mediaItem.file);
          return thumbnailUrl;
        }
        if (mediaItem.type === "image" && mediaItem.url) {
          return mediaItem.url;
        }

        return null;
      } catch (error) {
        console.error("Failed to get project thumbnail:", error);
        return null;
      }
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

    loadProjectTimeline: async (projectId) => {
      try {
        const tracks = await storageService.loadTimeline(projectId);
        if (tracks) {
          updateTracks(tracks);
        } else {
          const defaultTracks = ensureMainTrack([]);
          updateTracks(defaultTracks);
        }
        set({ history: [], redoStack: [] });
      } catch (error) {
        console.error("Failed to load timeline:", error);
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

    // Snapping actions
    toggleSnapping: () => {
      set((state) => ({ snappingEnabled: !state.snappingEnabled }));
    },

    // Ripple editing functions
    toggleRippleEditing: () => {
      set((state) => ({
        rippleEditingEnabled: !state.rippleEditingEnabled,
      }));
    },

    checkElementOverlap: (trackId, startTime, duration, excludeElementId) => {
      const track = get()._tracks.find((t) => t.id === trackId);
      if (!track) return false;

      const overlap = track.elements.some((element) => {
        const elementEnd =
          element.startTime +
          element.duration -
          element.trimStart -
          element.trimEnd;

        if (element.id === excludeElementId) {
          return false;
        }

        return (
          (startTime >= element.startTime && startTime < elementEnd) ||
          (startTime + duration > element.startTime &&
            startTime + duration <= elementEnd) ||
          (startTime < element.startTime && startTime + duration > elementEnd)
        );
      });
      return overlap;
    },

    findOrCreateTrack: (trackType) => {
      if (trackType === "text") {
        return get().insertTrackAt(trackType, 0);
      }

      const existingTrack = get()._tracks.find((t) => t.type === trackType);
      if (existingTrack) {
        return existingTrack.id;
      }

      return get().addTrack(trackType);
    },

    addMediaAtTime: (item, currentTime = 0) => {
      const trackType = item.type === "audio" ? "audio" : "media";
      const duration =
        item.duration || TIMELINE_CONSTANTS.DEFAULT_IMAGE_DURATION;

      const tracks = get()._tracks.filter((t) => t.type === trackType);

      let targetTrackId = null;
      for (const track of tracks) {
        if (!get().checkElementOverlap(track.id, currentTime, duration)) {
          targetTrackId = track.id;
          break;
        }
      }

      if (!targetTrackId) {
        targetTrackId = get().addTrack(trackType);
      }

      get().addElementToTrack(targetTrackId, {
        type: "media",
        mediaId: item.id,
        name: item.name,
        duration,
        startTime: currentTime,
        trimStart: 0,
        trimEnd: 0,
        muted: false,
      });
      return true;
    },

    addTextAtTime: (item, currentTime = 0) => {
      const targetTrackId = get().insertTrackAt("text", 0);

      get().addElementToTrack(targetTrackId, {
        type: "text",
        name: item.name || "Text",
        content: item.content || "Default Text",
        duration: item.duration || TIMELINE_CONSTANTS.DEFAULT_TEXT_DURATION,
        startTime: currentTime,
        trimStart: 0,
        trimEnd: 0,
        fontSize: item.fontSize || 48,
        fontFamily: item.fontFamily || "Arial",
        color: item.color || "#ffffff",
        backgroundColor: item.backgroundColor || "transparent",
        textAlign: item.textAlign || "center",
        fontWeight: item.fontWeight || "normal",
        fontStyle: item.fontStyle || "normal",
        textDecoration: item.textDecoration || "none",
        x: item.x || 0,
        y: item.y || 0,
        rotation: item.rotation || 0,
        opacity: item.opacity !== undefined ? item.opacity : 1,
      });
      return true;
    },

    addMediaToNewTrack: (item) => {
      const trackType = item.type === "audio" ? "audio" : "media";
      const targetTrackId = get().findOrCreateTrack(trackType);

      get().addElementToTrack(targetTrackId, {
        type: "media",
        mediaId: item.id,
        name: item.name,
        duration: item.duration || TIMELINE_CONSTANTS.DEFAULT_IMAGE_DURATION,
        startTime: 0,
        trimStart: 0,
        trimEnd: 0,
        muted: false,
      });
      return true;
    },

    addTextToNewTrack: (item) => {
      const targetTrackId = get().insertTrackAt("text", 0);

      get().addElementToTrack(targetTrackId, {
        type: "text",
        name: item.name || "Text",
        content:
          ("content" in item ? item.content : "Default Text") || "Default Text",
        duration: TIMELINE_CONSTANTS.DEFAULT_TEXT_DURATION,
        startTime: 0,
        trimStart: 0,
        trimEnd: 0,
        fontSize: ("fontSize" in item ? item.fontSize : 48) || 48,
        fontFamily:
          ("fontFamily" in item ? item.fontFamily : "Arial") || "Arial",
        color: ("color" in item ? item.color : "#ffffff") || "#ffffff",
        backgroundColor:
          ("backgroundColor" in item ? item.backgroundColor : "transparent") ||
          "transparent",
        textAlign:
          ("textAlign" in item ? item.textAlign : "center") || "center",
        fontWeight:
          ("fontWeight" in item ? item.fontWeight : "normal") || "normal",
        fontStyle:
          ("fontStyle" in item ? item.fontStyle : "normal") || "normal",
        textDecoration:
          ("textDecoration" in item ? item.textDecoration : "none") || "none",
        x: ("x" in item ? item.x : 0) || 0,
        y: ("y" in item ? item.y : 0) || 0,
        rotation: ("rotation" in item ? item.rotation : 0) || 0,
        opacity:
          "opacity" in item && item.opacity !== undefined ? item.opacity : 1,
      });
      return true;
    },
  };
});
