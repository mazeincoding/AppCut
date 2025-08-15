import { DraggableMediaItem } from "@/components/ui/draggable-item";
import { BaseView } from "./base-view";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { useTimelineStore } from "@/stores/timeline-store";
import { type TextElement } from "@/types/timeline";

const textData: TextElement = {
  id: "default-text",
  type: "text",
  name: "Default text",
  content: "Default text",
  fontSize: 48,
  fontFamily: "Arial",
  color: "#ffffff",
  backgroundColor: "transparent",
  textAlign: "center" as const,
  fontWeight: "normal" as const,
  fontStyle: "normal" as const,
  textDecoration: "none" as const,
  x: 0,
  y: 0,
  rotation: 0,
  opacity: 1,
  duration: TIMELINE_CONSTANTS.DEFAULT_TEXT_DURATION,
  startTime: 0,
  trimStart: 0,
  trimEnd: 0,
};

export function TextView() {
  return (
    <BaseView>
      <DraggableMediaItem
        name="Default text"
        preview={
          <div className="flex items-center justify-center w-full h-full bg-panel-accent rounded">
            <span className="text-xs select-none">Default text</span>
          </div>
        }
        dragData={{
          id: textData.id,
          type: textData.type,
          name: textData.name,
          content: textData.content,
        }}
        aspectRatio={1}
        onAddToTimeline={(currentTime) =>
          useTimelineStore.getState().addTextAtTime(textData, currentTime)
        }
        showLabel={false}
      />
    </BaseView>
  );
}
