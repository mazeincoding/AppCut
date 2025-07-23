"use client";

import { TabBar } from "./tabbar";
import { MediaView } from "./views/media";
import { useMediaPanelStore, Tab } from "./store";
import { TextView } from "./views/text";
import { Text2ImageView } from "./views/text2image";
import { AiView } from "./views/ai";
import { AdjustmentView } from "./views/adjustment";
import { debugLogger } from "@/lib/debug-logger";

export function MediaPanel() {
  const { activeTab } = useMediaPanelStore();

  // DEBUG: Media panel tab tracking
  debugLogger.log('MediaPanel', 'RENDER', { 
    activeTab, 
    timestamp: Date.now(),
    aiViewWillRender: activeTab === 'ai'
  });

  const viewMap: Record<Tab, React.ReactNode> = {
    media: <MediaView />,
    audio: (
      <div className="p-4 text-muted-foreground">Audio view coming soon...</div>
    ),
    text: <TextView />,
    text2image: <Text2ImageView />,
    stickers: (
      <div className="p-4 text-muted-foreground">
        Stickers view coming soon...
      </div>
    ),
    effects: (
      <div className="p-4 text-muted-foreground">
        Effects view coming soon...
      </div>
    ),
    transitions: (
      <div className="p-4 text-muted-foreground">
        Transitions view coming soon...
      </div>
    ),
    captions: (
      <div className="p-4 text-muted-foreground">
        Captions view coming soon...
      </div>
    ),
    filters: (
      <div className="p-4 text-muted-foreground">
        Filters view coming soon...
      </div>
    ),
    adjustment: <AdjustmentView />,
    ai: <AiView />,
  };

  return (
    <div className="h-full flex flex-col bg-panel rounded-xl overflow-hidden pt-4" data-testid="media-panel">
      <TabBar />
      <div className="flex-1 pt-6 px-4">{viewMap[activeTab]}</div>
    </div>
  );
}
