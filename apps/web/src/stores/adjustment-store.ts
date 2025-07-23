import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface EditHistoryItem {
  id: string;
  timestamp: Date;
  originalUrl: string;
  editedUrl: string;
  prompt: string;
  model: string;
  parameters: Record<string, any>;
  processingTime?: number;
}

export interface AdjustmentState {
  // Current image
  originalImage: File | null;
  originalImageUrl: string | null;
  currentEditedUrl: string | null;
  
  // Model selection
  selectedModel: 'seededit' | 'flux-kontext' | 'flux-kontext-max';
  
  // Parameters
  prompt: string;
  parameters: {
    guidanceScale: number;
    steps: number;
    seed?: number;
    safetyTolerance: number;
    numImages: number;
  };
  
  // Edit history
  editHistory: EditHistoryItem[];
  currentHistoryIndex: number;
  
  // Processing state
  isProcessing: boolean;
  progress: number;
  statusMessage: string;
  elapsedTime: number;
  estimatedTime?: number;
  
  // UI state
  showParameters: boolean;
  showHistory: boolean;
  previewMode: 'side-by-side' | 'overlay' | 'single';
}

export interface AdjustmentActions {
  // Image management
  setOriginalImage: (file: File, url: string) => void;
  clearImage: () => void;
  
  // Model and parameters
  setSelectedModel: (model: AdjustmentState['selectedModel']) => void;
  setPrompt: (prompt: string) => void;
  updateParameter: (key: string, value: any) => void;
  resetParameters: () => void;
  
  // Edit history
  addToHistory: (item: Omit<EditHistoryItem, 'id' | 'timestamp'>) => void;
  goToHistoryItem: (index: number) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  
  // Processing state
  setProcessingState: (state: {
    isProcessing: boolean;
    progress?: number;
    statusMessage?: string;
    elapsedTime?: number;
    estimatedTime?: number;
  }) => void;
  
  // UI state
  toggleParameters: () => void;
  toggleHistory: () => void;
  setPreviewMode: (mode: AdjustmentState['previewMode']) => void;
}

type AdjustmentStore = AdjustmentState & AdjustmentActions;

const getDefaultParameters = (model: AdjustmentState['selectedModel']) => {
  switch (model) {
    case 'seededit':
      return {
        guidanceScale: 1.0,
        steps: 20,
        seed: undefined,
        safetyTolerance: 2,
        numImages: 1
      };
    case 'flux-kontext':
    case 'flux-kontext-max':
      return {
        guidanceScale: 3.5,
        steps: 28,
        seed: undefined,
        safetyTolerance: 2,
        numImages: 1
      };
  }
};

export const useAdjustmentStore = create<AdjustmentStore>()
  (subscribeWithSelector((set, get) => ({
    // Initial state
    originalImage: null,
    originalImageUrl: null,
    currentEditedUrl: null,
    selectedModel: 'seededit',
    prompt: '',
    parameters: getDefaultParameters('seededit'),
    editHistory: [],
    currentHistoryIndex: -1,
    isProcessing: false,
    progress: 0,
    statusMessage: '',
    elapsedTime: 0,
    estimatedTime: undefined,
    showParameters: true,
    showHistory: false,
    previewMode: 'side-by-side',

    // Actions
    setOriginalImage: (file, url) => {
      set({
        originalImage: file,
        originalImageUrl: url,
        currentEditedUrl: null,
        editHistory: [],
        currentHistoryIndex: -1
      });
    },

    clearImage: () => {
      set({
        originalImage: null,
        originalImageUrl: null,
        currentEditedUrl: null,
        editHistory: [],
        currentHistoryIndex: -1,
        prompt: ''
      });
    },

    setSelectedModel: (model) => {
      set({
        selectedModel: model,
        parameters: getDefaultParameters(model)
      });
    },

    setPrompt: (prompt) => {
      set({ prompt });
    },

    updateParameter: (key, value) => {
      set((state) => ({
        parameters: {
          ...state.parameters,
          [key]: value
        }
      }));
    },

    resetParameters: () => {
      const { selectedModel } = get();
      set({ parameters: getDefaultParameters(selectedModel) });
    },

    addToHistory: (item) => {
      const id = Math.random().toString(36).substr(2, 9);
      const historyItem: EditHistoryItem = {
        ...item,
        id,
        timestamp: new Date()
      };

      set((state) => {
        // Remove any history items after current index (for branching)
        const newHistory = state.editHistory.slice(0, state.currentHistoryIndex + 1);
        newHistory.push(historyItem);

        return {
          editHistory: newHistory,
          currentHistoryIndex: newHistory.length - 1,
          currentEditedUrl: item.editedUrl
        };
      });
    },

    goToHistoryItem: (index) => {
      const { editHistory } = get();
      if (index >= 0 && index < editHistory.length) {
        const item = editHistory[index];
        const currentParams = getDefaultParameters(item.model as AdjustmentState['selectedModel']);
        set({
          currentHistoryIndex: index,
          currentEditedUrl: item.editedUrl,
          prompt: item.prompt,
          selectedModel: item.model as AdjustmentState['selectedModel'],
          parameters: { ...currentParams, ...item.parameters }
        });
      }
    },

    canUndo: () => {
      const { currentHistoryIndex } = get();
      return currentHistoryIndex > 0;
    },

    canRedo: () => {
      const { editHistory, currentHistoryIndex } = get();
      return currentHistoryIndex < editHistory.length - 1;
    },

    undo: () => {
      const { currentHistoryIndex, goToHistoryItem } = get();
      if (currentHistoryIndex > 0) {
        goToHistoryItem(currentHistoryIndex - 1);
      }
    },

    redo: () => {
      const { editHistory, currentHistoryIndex, goToHistoryItem } = get();
      if (currentHistoryIndex < editHistory.length - 1) {
        goToHistoryItem(currentHistoryIndex + 1);
      }
    },

    clearHistory: () => {
      set({
        editHistory: [],
        currentHistoryIndex: -1,
        currentEditedUrl: null
      });
    },

    setProcessingState: (state) => {
      set((currentState) => ({
        isProcessing: state.isProcessing,
        progress: state.progress ?? currentState.progress,
        statusMessage: state.statusMessage ?? currentState.statusMessage,
        elapsedTime: state.elapsedTime ?? currentState.elapsedTime,
        estimatedTime: state.estimatedTime ?? currentState.estimatedTime
      }));
    },

    toggleParameters: () => {
      set((state) => ({ showParameters: !state.showParameters }));
    },

    toggleHistory: () => {
      set((state) => ({ showHistory: !state.showHistory }));
    },

    setPreviewMode: (mode) => {
      set({ previewMode: mode });
    }
  })));

// Persist settings to localStorage
if (typeof window !== 'undefined') {
  const savedSettings = localStorage.getItem('adjustment-settings');
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      useAdjustmentStore.setState({
        selectedModel: settings.selectedModel || 'seededit',
        showParameters: settings.showParameters ?? true,
        previewMode: settings.previewMode || 'side-by-side'
      });
    } catch (error) {
      console.warn('Failed to load adjustment settings:', error);
    }
  }

  // Save settings on changes
  useAdjustmentStore.subscribe(
    (state) => ({
      selectedModel: state.selectedModel,
      showParameters: state.showParameters,
      previewMode: state.previewMode
    }),
    (settings) => {
      localStorage.setItem('adjustment-settings', JSON.stringify(settings));
    }
  );
}