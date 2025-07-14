import { create } from "zustand";
import { ExportSettings, ExportProgress, ExportFormat, ExportQuality } from "@/types/export";

interface ExportStore {
  // Export settings
  settings: ExportSettings;
  
  // Export progress
  progress: ExportProgress;
  
  // Error state
  error: string | null;
  
  // Actions
  updateSettings: (settings: Partial<ExportSettings>) => void;
  updateProgress: (progress: Partial<ExportProgress>) => void;
  setError: (error: string | null) => void;
  resetExport: () => void;
}

const getDefaultSettings = (): ExportSettings => {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
  
  return {
    format: ExportFormat.MP4,
    quality: ExportQuality.HIGH,
    filename: `export_${timestamp}`,
    width: 1920,
    height: 1080,
  };
};

const getDefaultProgress = (): ExportProgress => ({
  isExporting: false,
  progress: 0,
  currentFrame: 0,
  totalFrames: 0,
  estimatedTimeRemaining: 0,
  status: "",
});

export const useExportStore = create<ExportStore>((set) => ({
  settings: getDefaultSettings(),
  progress: getDefaultProgress(),
  error: null,
  
  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),
  
  updateProgress: (newProgress) =>
    set((state) => ({
      progress: { ...state.progress, ...newProgress },
    })),
  
  setError: (error) => set({ error }),
  
  resetExport: () =>
    set({
      settings: getDefaultSettings(),
      progress: getDefaultProgress(),
      error: null,
    }),
}));