"use client";

import { useEffect, useCallback } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useProjectStore } from "@/stores/project-store";
import { toast } from "sonner";

export interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  category: string;
  action: () => void;
  enabled?: boolean;
  requiresSelection?: boolean;
  icon?: React.ReactNode;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  context?: "global" | "timeline" | "editor";
}

export const useKeyboardShortcuts = (
  options: UseKeyboardShortcutsOptions = {}
) => {
  const { enabled = true, context = "editor" } = options;

  const {
    tracks,
    selectedElements,
    clearSelectedElements,
    setSelectedElements,
    removeElementFromTrack,
    splitElement,
    addElementToTrack,
    snappingEnabled,
    toggleSnapping,
    undo,
    redo,
  } = useTimelineStore();

  const { currentTime, duration, isPlaying, toggle, seek } = usePlaybackStore();

  const { activeProject } = useProjectStore();

  // Check if user is typing in an input field
  const isInputFocused = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement;
    return (
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.contentEditable === "true")
    );
  }, []);

  // Define all shortcuts in one place
  const shortcuts: KeyboardShortcut[] = [
    // Playback Controls
    {
      id: "play-pause",
      keys: ["Space"],
      description: "Play/Pause",
      category: "Playback",
      action: () => {
        toggle();
      },
    },
    {
      id: "rewind",
      keys: ["J"],
      description: "Rewind 1 second",
      category: "Playback",
      action: () => {
        seek(Math.max(0, currentTime - 1));
      },
    },
    {
      id: "play-pause-alt",
      keys: ["K"],
      description: "Play/Pause (alternative)",
      category: "Playback",
      action: () => {
        toggle();
      },
    },
    {
      id: "fast-forward",
      keys: ["L"],
      description: "Fast forward 1 second",
      category: "Playback",
      action: () => {
        seek(Math.min(duration, currentTime + 1));
      },
    },

    // Navigation
    {
      id: "frame-backward",
      keys: ["ArrowLeft"],
      description: "Frame step backward",
      category: "Navigation",
      action: () => {
        const projectFps = activeProject?.fps || 30;
        seek(Math.max(0, currentTime - 1 / projectFps));
      },
    },
    {
      id: "frame-forward",
      keys: ["ArrowRight"],
      description: "Frame step forward",
      category: "Navigation",
      action: () => {
        const projectFps = activeProject?.fps || 30;
        seek(Math.min(duration, currentTime + 1 / projectFps));
      },
    },
    {
      id: "jump-backward",
      keys: ["Shift+ArrowLeft"],
      description: "Jump back 5 seconds",
      category: "Navigation",
      action: () => {
        seek(Math.max(0, currentTime - 5));
      },
    },
    {
      id: "jump-forward",
      keys: ["Shift+ArrowRight"],
      description: "Jump forward 5 seconds",
      category: "Navigation",
      action: () => {
        seek(Math.min(duration, currentTime + 5));
      },
    },
    {
      id: "goto-start",
      keys: ["Home"],
      description: "Go to timeline start",
      category: "Navigation",
      action: () => {
        seek(0);
      },
    },
    {
      id: "goto-end",
      keys: ["End"],
      description: "Go to timeline end",
      category: "Navigation",
      action: () => {
        seek(duration);
      },
    },

    // Editing
    {
      id: "split-element",
      keys: ["S"],
      description: "Split element at playhead",
      category: "Editing",
      requiresSelection: true,
      action: () => {
        if (selectedElements.length !== 1) {
          toast.error("Select exactly one element to split");
          return;
        }

        const { trackId, elementId } = selectedElements[0];
        const track = tracks.find((t: any) => t.id === trackId);
        const element = track?.elements.find((el: any) => el.id === elementId);

        if (element) {
          const effectiveStart = element.startTime;
          const effectiveEnd =
            element.startTime +
            (element.duration - element.trimStart - element.trimEnd);

          if (currentTime > effectiveStart && currentTime < effectiveEnd) {
            splitElement(trackId, elementId, currentTime);
          } else {
            toast.error("Playhead must be within selected element");
          }
        }
      },
    },
    {
      id: "delete-elements",
      keys: ["Delete", "Backspace"],
      description: "Delete selected elements",
      category: "Editing",
      requiresSelection: true,
      action: () => {
        if (selectedElements.length === 0) {
          toast.error("No elements selected");
          return;
        }
        selectedElements.forEach(
          ({ trackId, elementId }: { trackId: string; elementId: string }) => {
            removeElementFromTrack(trackId, elementId);
          }
        );
        clearSelectedElements();
      },
    },
    {
      id: "toggle-snapping",
      keys: ["N"],
      description: "Toggle snapping",
      category: "Editing",
      action: () => {
        toggleSnapping();
      },
    },

    // Selection & Organization
    {
      id: "select-all",
      keys: ["Cmd+A", "Ctrl+A"],
      description: "Select all elements",
      category: "Selection",
      action: () => {
        const allElements = tracks.flatMap((track: any) =>
          track.elements.map((element: any) => ({
            trackId: track.id,
            elementId: element.id,
          }))
        );
        setSelectedElements(allElements);
      },
    },
    {
      id: "duplicate-element",
      keys: ["Cmd+D", "Ctrl+D"],
      description: "Duplicate selected element",
      category: "Selection",
      requiresSelection: true,
      action: () => {
        if (selectedElements.length !== 1) {
          toast.error("Select exactly one element to duplicate");
          return;
        }

        const { trackId, elementId } = selectedElements[0];
        const track = tracks.find((t: any) => t.id === trackId);
        const element = track?.elements.find((el: any) => el.id === elementId);

        if (element) {
          const newStartTime =
            element.startTime +
            (element.duration - element.trimStart - element.trimEnd) +
            0.1;
          const { id, ...elementWithoutId } = element;

          addElementToTrack(trackId, {
            ...elementWithoutId,
            startTime: newStartTime,
          });
        }
      },
    },

    // History
    {
      id: "undo",
      keys: ["Cmd+Z", "Ctrl+Z"],
      description: "Undo",
      category: "History",
      action: () => {
        undo();
      },
    },
    {
      id: "redo",
      keys: ["Cmd+Shift+Z", "Ctrl+Shift+Z", "Cmd+Y", "Ctrl+Y"],
      description: "Redo",
      category: "History",
      action: () => {
        redo();
      },
    },
  ];

  // Parse keyboard event to match against shortcuts
  const parseKeyboardEvent = useCallback((e: KeyboardEvent): string => {
    const parts: string[] = [];

    if (e.metaKey || e.ctrlKey) parts.push(e.metaKey ? "Cmd" : "Ctrl");
    if (e.shiftKey) parts.push("Shift");
    if (e.altKey) parts.push("Alt");

    parts.push(e.key);

    return parts.join("+").toLowerCase();
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || isInputFocused()) return;

      const keyCombo = parseKeyboardEvent(e);
      const shortcut = shortcuts.find((s) =>
        s.keys.some(
          (key) =>
            key.toLowerCase() === keyCombo ||
            key.toLowerCase() === e.key.toLowerCase()
        )
      );

      if (shortcut) {
        // Check if shortcut requires selection
        if (shortcut.requiresSelection && selectedElements.length === 0) {
          return;
        }

        e.preventDefault();
        shortcut.action();
      }
    },
    [enabled, shortcuts, selectedElements, parseKeyboardEvent, isInputFocused]
  );

  // Set up event listener
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);

  // Return shortcuts for help component
  return {
    shortcuts: shortcuts.filter((s) => s.enabled !== false),
    enabled,
  };
};
