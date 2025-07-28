import { create } from "zustand";
import { devtools } from "zustand/middleware";

// Debug flag - set to false to disable console logs
const DEBUG_TEXT2IMAGE_STORE = process.env.NODE_ENV === 'development' && false;

export interface GenerationResult {
  status: "loading" | "success" | "error";
  imageUrl?: string;
  error?: string;
  generatedAt?: Date;
}

export interface GenerationSettings {
  imageSize: string;
  seed?: number;
}

export interface SelectedResult {
  modelKey: string;
  imageUrl: string;
  prompt: string;
  settings: GenerationSettings;
}

interface Text2ImageStore {
  // Core state
  prompt: string;
  setPrompt: (prompt: string) => void;
  
  // Model selection
  selectedModels: string[];
  toggleModel: (modelKey: string) => void;
  clearModelSelection: () => void;
  
  // Generation mode
  generationMode: "single" | "multi";
  setGenerationMode: (mode: "single" | "multi") => void;
  
  // Generation state
  isGenerating: boolean;
  generationResults: Record<string, GenerationResult>;
  
  // Result selection (for multi-model mode)
  selectedResults: SelectedResult[];
  toggleResultSelection: (result: SelectedResult) => void;
  clearSelectedResults: () => void;
  
  // Actions
  generateImages: (prompt: string, settings: GenerationSettings) => Promise<void>;
  addSelectedToMedia: (results?: SelectedResult[]) => void;
  clearResults: () => void;
  
  // History
  generationHistory: Array<{
    id: string;
    prompt: string;
    models: string[];
    results: Record<string, GenerationResult>;
    createdAt: Date;
  }>;
  addToHistory: (prompt: string, models: string[], results: Record<string, GenerationResult>) => void;
}

export const useText2ImageStore = create<Text2ImageStore>()(
  devtools(
    (set, get) => ({
      // Core state
      prompt: "",
      setPrompt: (prompt) => set({ prompt }),
      
      // Model selection
      selectedModels: ["imagen4-ultra", "seeddream-v3", "flux-pro-v11-ultra"], // Default to all models
      toggleModel: (modelKey) =>
        set((state) => ({
          selectedModels: state.selectedModels.includes(modelKey)
            ? state.selectedModels.filter((m) => m !== modelKey)
            : [...state.selectedModels, modelKey],
        })),
      clearModelSelection: () => set({ selectedModels: [] }),
      
      // Generation mode
      generationMode: "multi", // Default to multi-model mode
      setGenerationMode: (mode) => {
        set({ generationMode: mode });
        
        // Auto-adjust model selection based on mode
        const { selectedModels } = get();
        if (mode === "single" && selectedModels.length > 1) {
          // Keep only the first selected model for single mode
          set({ selectedModels: selectedModels.slice(0, 1) });
        } else if (mode === "multi" && selectedModels.length === 0) {
          // Select first two models by default for multi mode
          set({ selectedModels: ["imagen4-ultra", "seeddream-v3"] });
        } else if (mode === "single" && selectedModels.length === 0) {
          // Select first model by default for single mode
          set({ selectedModels: ["imagen4-ultra"] });
        }
      },
      
      // Generation state
      isGenerating: false,
      generationResults: {},
      
      // Result selection
      selectedResults: [],
      toggleResultSelection: (result) =>
        set((state) => {
          const isSelected = state.selectedResults.some(
            (r) => r.modelKey === result.modelKey
          );
          
          return {
            selectedResults: isSelected
              ? state.selectedResults.filter((r) => r.modelKey !== result.modelKey)
              : [...state.selectedResults, result],
          };
        }),
      clearSelectedResults: () => set({ selectedResults: [] }),
      
      // Actions
      generateImages: async (prompt, settings) => {
        if (DEBUG_TEXT2IMAGE_STORE) console.log("generateImages called with:", { prompt, settings });
        const { selectedModels, generationMode } = get();
        
        if (DEBUG_TEXT2IMAGE_STORE) console.log("Current store state:", { selectedModels, generationMode });
        
        if (selectedModels.length === 0) {
          if (DEBUG_TEXT2IMAGE_STORE) console.error("No models selected");
          return;
        }
        
        set({ 
          isGenerating: true, 
          generationResults: {},
          selectedResults: [] 
        });
        
        // Initialize loading state for all selected models
        const initialResults: Record<string, GenerationResult> = {};
        selectedModels.forEach((modelKey) => {
          initialResults[modelKey] = { status: "loading" };
        });
        set({ generationResults: initialResults });
        
        try {
          // Import the generation service dynamically to avoid circular deps
          const { generateWithMultipleModels } = await import("@/lib/fal-ai-client");
          
          // Generate with all selected models in parallel
          const results = await generateWithMultipleModels(
            selectedModels,
            prompt,
            settings
          );
          
          // Update results as they complete
          const finalResults: Record<string, GenerationResult> = {};
          for (const [modelKey, result] of Object.entries(results)) {
            finalResults[modelKey] = {
              status: result.success ? "success" : "error",
              imageUrl: result.success ? result.imageUrl : undefined,
              error: result.success ? undefined : result.error,
              generatedAt: new Date(),
            };
          }
          
          set({ 
            generationResults: finalResults,
            isGenerating: false 
          });
          
          // Auto-select all successful results for media panel
          const successfulResults: SelectedResult[] = [];
          for (const [modelKey, result] of Object.entries(finalResults)) {
            if (result.status === "success" && result.imageUrl) {
              successfulResults.push({
                modelKey,
                imageUrl: result.imageUrl,
                prompt,
                settings,
              });
            }
          }
          
          if (DEBUG_TEXT2IMAGE_STORE) console.log(`🎯 TEXT2IMAGE-STORE: Auto-selecting ${successfulResults.length} successful results for media panel`);
          if (DEBUG_TEXT2IMAGE_STORE) console.log('🎯 TEXT2IMAGE-STORE: Successful results:', successfulResults.map(r => ({
            model: r.modelKey,
            url: r.imageUrl.substring(0, 50) + '...'
          })));
          set({ selectedResults: successfulResults });
          
          // Automatically add all successful results to media panel
          if (successfulResults.length > 0) {
            if (DEBUG_TEXT2IMAGE_STORE) console.log("🚀 TEXT2IMAGE-STORE: Automatically calling addSelectedToMedia() with", successfulResults.length, "images");
            get().addSelectedToMedia(successfulResults);
            if (DEBUG_TEXT2IMAGE_STORE) console.log("✅ TEXT2IMAGE-STORE: addSelectedToMedia() call completed");
          } else {
            if (DEBUG_TEXT2IMAGE_STORE) console.warn("⚠️ TEXT2IMAGE-STORE: No successful results to add to media panel");
          }
          
          // Add to history
          get().addToHistory(prompt, selectedModels, finalResults);
          
        } catch (error) {
          if (DEBUG_TEXT2IMAGE_STORE) console.error("Generation failed:", error);
          
          // Mark all as failed
          const errorResults: Record<string, GenerationResult> = {};
          selectedModels.forEach((modelKey) => {
            errorResults[modelKey] = {
              status: "error",
              error: error instanceof Error ? error.message : "Unknown error",
            };
          });
          
          set({ 
            generationResults: errorResults,
            isGenerating: false 
          });
        }
      },
      
      addSelectedToMedia: (results) => {
        const { selectedResults, generationResults, prompt } = get();
        const resultsToAdd = results || selectedResults;
        
        if (DEBUG_TEXT2IMAGE_STORE) {
          console.log("📤 TEXT2IMAGE-STORE: addSelectedToMedia() called with:", { 
            resultsCount: results?.length || 0,
            selectedResultsCount: selectedResults.length,
            totalResultsToAdd: resultsToAdd.length 
          });
        }
        
        if (resultsToAdd.length === 0) {
          if (DEBUG_TEXT2IMAGE_STORE) console.warn("⚠️ TEXT2IMAGE-STORE: No results selected to add to media");
          return;
        }
        
        if (DEBUG_TEXT2IMAGE_STORE) console.log(`📋 TEXT2IMAGE-STORE: Preparing ${resultsToAdd.length} images for media panel`);
        if (DEBUG_TEXT2IMAGE_STORE) console.log('📋 TEXT2IMAGE-STORE: Results to add:', resultsToAdd.map(r => ({
          model: r.modelKey,
          prompt: r.prompt.substring(0, 30) + '...',
          hasUrl: !!r.imageUrl
        })));
        
        // Import media store dynamically to avoid circular deps
        if (DEBUG_TEXT2IMAGE_STORE) console.log("🔄 TEXT2IMAGE-STORE: Importing media-store dynamically...");
        import("@/stores/media-store").then(({ useMediaStore }) => {
          if (DEBUG_TEXT2IMAGE_STORE) console.log("✅ TEXT2IMAGE-STORE: Media store imported successfully");
          const { addGeneratedImages } = useMediaStore.getState();
          
          const mediaItems = resultsToAdd.map((result) => ({
            url: result.imageUrl,
            type: "image" as const,
            name: `Generated: ${result.prompt.slice(0, 30)}${result.prompt.length > 30 ? "..." : ""}`,
            size: 0, // Will be determined when loaded
            duration: 0,
            metadata: {
              source: "text2image" as const,
              model: result.modelKey,
              prompt: result.prompt,
              settings: result.settings,
              generatedAt: new Date(),
            },
          }));
          
          if (DEBUG_TEXT2IMAGE_STORE) console.log("📦 TEXT2IMAGE-STORE: Media items prepared:", mediaItems.length, "items");
          if (DEBUG_TEXT2IMAGE_STORE) console.log("📦 TEXT2IMAGE-STORE: Calling media-store.addGeneratedImages()...");
          addGeneratedImages(mediaItems);
          if (DEBUG_TEXT2IMAGE_STORE) console.log("✅ TEXT2IMAGE-STORE: media-store.addGeneratedImages() called successfully");
        }).catch((error) => {
          if (DEBUG_TEXT2IMAGE_STORE) console.error("❌ TEXT2IMAGE-STORE: Failed to import media store:", error);
        });
        
        // Clear selections after adding
        if (DEBUG_TEXT2IMAGE_STORE) console.log("🧹 TEXT2IMAGE-STORE: Clearing selected results");
        set({ selectedResults: [] });
      },
      
      clearResults: () =>
        set({ 
          generationResults: {}, 
          selectedResults: [],
          isGenerating: false 
        }),
      
      // History
      generationHistory: [],
      addToHistory: (prompt, models, results) =>
        set((state) => ({
          generationHistory: [
            {
              id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              prompt,
              models,
              results,
              createdAt: new Date(),
            },
            ...state.generationHistory.slice(0, 49), // Keep last 50 entries
          ],
        })),
    }),
    {
      name: "text2image-store",
    }
  )
);