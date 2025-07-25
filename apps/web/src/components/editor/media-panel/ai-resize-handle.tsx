import { ResizableHandle } from "@/components/ui/resizable";
import { usePanelStore } from "@/stores/panel-store";
import { useMediaPanelStore } from "@/components/editor/media-panel/store";

interface AiResizeHandleProps {
  className?: string;
}

export function AiResizeHandle({ className = "" }: AiResizeHandleProps) {
  const { activeTab } = useMediaPanelStore();
  const { 
    setToolsPanel, 
    setAiPanelWidth, 
    aiPanelWidth, 
    aiPanelMinWidth, 
    aiPanelMaxWidth 
  } = usePanelStore();

  const handleDoubleClick = () => {
    if (activeTab !== 'ai') return;

    // Toggle between collapsed and default/expanded state
    const currentWidth = aiPanelWidth;
    const isCollapsed = currentWidth <= aiPanelMinWidth + 2;
    
    const newWidth = isCollapsed ? 22 : aiPanelMinWidth; // 22% is default, aiPanelMinWidth is collapsed
    
    setToolsPanel(newWidth);
    setAiPanelWidth(newWidth);
  };

  return (
    <ResizableHandle 
      withHandle 
      className={`${activeTab === 'ai' ? 'ai-resize-handle' : ''} ${className}`}
      onDoubleClick={handleDoubleClick}
    />
  );
}