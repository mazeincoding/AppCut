import { create } from "zustand";
import { Caption } from "@/types/editor";

interface CaptionStore {
  captions: Caption[];
  selectedCaptionId: string | null;
  addCaption: (caption: Omit<Caption, "id">) => void;
  updateCaption: (id: string, updates: Partial<Caption>) => void;
  deleteCaption: (id: string) => void;
  reorderCaptions: (sourceIndex: number, destinationIndex: number) => void;
  setSelectedCaptionId: (id: string | null) => void;
  addCaptions: (newCaptions: Omit<Caption, "id">[]) => void;
  clearAllCaptions: () => void;
  undoClearAllCaptions: () => void;
  previousCaptions: Caption[] | null;
  canUndoClearAll: () => boolean;
}

export const useCaptionStore = create<CaptionStore>((set, get) => ({
  captions: [],
  selectedCaptionId: null,
  previousCaptions: null,

  addCaption: (caption) => {
    const newCaption: Caption = {
      id: crypto.randomUUID(),
      ...caption,
    };
    set((state) => {
      const updatedCaptions = [...state.captions, newCaption];
      return { captions: updatedCaptions };
    });
  },

  addCaptions: (newCaptions) => {
    set((state) => {
      const captionsToAdd: Caption[] = newCaptions.map((caption) => ({
        id: crypto.randomUUID(),
        ...caption,
      }));
      const updatedCaptions = [...state.captions, ...captionsToAdd];
      return { captions: updatedCaptions };
    });
  },

  updateCaption: (id, updates) => {
    set((state) => ({
      captions: state.captions.map((caption) =>
        caption.id === id ? { ...caption, ...updates } : caption
      ),
    }));
  },

  deleteCaption: (id) => {
    set((state) => ({
      captions: state.captions.filter((caption) => caption.id !== id),
    }));
  },

  reorderCaptions: (sourceIndex, destinationIndex) => {
    set((state) => {
      const newCaptions = Array.from(state.captions);
      const [removed] = newCaptions.splice(sourceIndex, 1);
      newCaptions.splice(destinationIndex, 0, removed);

      // Re-calculate start and end times based on the new order, preserving individual durations
      let previousEndTime = 0; // Start from 0 seconds for the first caption in the new sequence

      const updatedCaptions = newCaptions.map((caption) => {
        const originalDuration = caption.endTime - caption.startTime;

        const newStartTime = previousEndTime;
        const newEndTime = newStartTime + originalDuration;

        previousEndTime = newEndTime; // Update for the next caption

        return {
          ...caption,
          startTime: newStartTime,
          endTime: newEndTime,
        };
      });

      return { captions: updatedCaptions };
    });
  },

  setSelectedCaptionId: (id) => set({ selectedCaptionId: id }),

  clearAllCaptions: () => {
    set((state) => ({
      previousCaptions: state.captions,
      captions: [],
      selectedCaptionId: null,
    }));
  },

  undoClearAllCaptions: () => {
    set((state) => {
      if (state.previousCaptions) {
        return {
          captions: state.previousCaptions,
          previousCaptions: null,
        };
      }
      return {};
    });
  },

  canUndoClearAll: () => {
    const state = get();
    return state.previousCaptions !== null;
  },
})); 