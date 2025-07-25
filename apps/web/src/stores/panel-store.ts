import { create } from "zustand";
import { persist } from "zustand/middleware";

const DEFAULT_PANEL_SIZES = {
  toolsPanel: 45,
  previewPanel: 75,
  propertiesPanel: 20,
  mainContent: 70,
  timeline: 30,
  mainContentHeight: 75,
  timelineHeight: 25,
  // AI Panel specific sizing (in percentage for ResizablePanel compatibility)
  aiPanelWidth: 22,           // Default AI panel width as percentage (~280px equivalent)
  aiPanelMinWidth: 4,         // Collapsed state (~52px equivalent) 
  aiPanelMaxWidth: 30,        // Expanded state (~400px equivalent)
} as const;

interface PanelState {
  // Panel sizes as percentages
  toolsPanel: number;
  previewPanel: number;
  propertiesPanel: number;
  mainContent: number;
  timeline: number;
  mainContentHeight: number;
  timelineHeight: number;
  
  // AI Panel specific sizing
  aiPanelWidth: number;
  aiPanelMinWidth: number;
  aiPanelMaxWidth: number;

  // Actions
  setToolsPanel: (size: number) => void;
  setPreviewPanel: (size: number) => void;
  setPropertiesPanel: (size: number) => void;
  setMainContent: (size: number) => void;
  setTimeline: (size: number) => void;
  setMainContentHeight: (size: number) => void;
  setTimelineHeight: (size: number) => void;
  
  // AI Panel actions
  setAiPanelWidth: (width: number) => void;
  getAiPanelConstraints: () => { min: number; max: number };
  getAiPanelSizeForTab: (activeTab: string) => { defaultSize: number; minSize: number; maxSize: number };
}

export const usePanelStore = create<PanelState>()(
  persist(
    (set, get) => ({
      // Default sizes - optimized for responsiveness
      ...DEFAULT_PANEL_SIZES,

      // Actions
      setToolsPanel: (size) => set({ toolsPanel: size }),
      setPreviewPanel: (size) => set({ previewPanel: size }),
      setPropertiesPanel: (size) => set({ propertiesPanel: size }),
      setMainContent: (size) => set({ mainContent: size }),
      setTimeline: (size) => set({ timeline: size }),
      setMainContentHeight: (size) => set({ mainContentHeight: size }),
      setTimelineHeight: (size) => set({ timelineHeight: size }),
      
      // AI Panel actions
      setAiPanelWidth: (width) => {
        // Validate width is a number and within reasonable bounds
        const validWidth = typeof width === 'number' && !isNaN(width) && width >= 0 && width <= 100 
          ? width 
          : DEFAULT_PANEL_SIZES.aiPanelWidth;
        set({ aiPanelWidth: validWidth });
      },
      
      getAiPanelConstraints: () => {
        const state = get();
        return {
          min: state.aiPanelMinWidth,
          max: state.aiPanelMaxWidth
        };
      },
      
      getAiPanelSizeForTab: (activeTab) => {
        const state = get();
        try {
          // When AI tab is active, use AI-specific sizing
          if (activeTab === 'ai') {
            return {
              defaultSize: typeof state.aiPanelWidth === 'number' ? state.aiPanelWidth : DEFAULT_PANEL_SIZES.aiPanelWidth,
              minSize: typeof state.aiPanelMinWidth === 'number' ? state.aiPanelMinWidth : DEFAULT_PANEL_SIZES.aiPanelMinWidth,
              maxSize: typeof state.aiPanelMaxWidth === 'number' ? state.aiPanelMaxWidth : DEFAULT_PANEL_SIZES.aiPanelMaxWidth
            };
          }
          // For other tabs, use standard panel sizing
          return {
            defaultSize: typeof state.toolsPanel === 'number' ? state.toolsPanel : DEFAULT_PANEL_SIZES.toolsPanel,
            minSize: 15,
            maxSize: 35
          };
        } catch (error) {
          // Fallback to safe defaults if anything goes wrong
          console.warn('Error in getAiPanelSizeForTab:', error);
          return {
            defaultSize: DEFAULT_PANEL_SIZES.aiPanelWidth,
            minSize: DEFAULT_PANEL_SIZES.aiPanelMinWidth,
            maxSize: DEFAULT_PANEL_SIZES.aiPanelMaxWidth
          };
        }
      },
    }),
    {
      name: "panel-sizes",
    }
  )
);
