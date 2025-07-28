"use client";

import { useProjectStore } from "@/stores/project-store";
import { useAspectRatio } from "@/hooks/use-aspect-ratio";
import { Label } from "../../ui/label";
import { ScrollArea } from "../../ui/scroll-area";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { AudioProperties } from "./audio-properties";
import { MediaProperties } from "./media-properties";
import { TextProperties } from "./text-properties";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { FPS_PRESETS } from "@/constants/timeline-constants";

export function PropertiesPanel() {
  const { activeProject, updateProjectFps } = useProjectStore();
  const { getDisplayName, canvasSize } = useAspectRatio();
  const { selectedElements, tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();

  const handleFpsChange = (value: string) => {
    const fps = parseFloat(value);
    if (!isNaN(fps) && fps > 0) {
      updateProjectFps(fps);
    }
  };

  const emptyView = (
    <div className="space-y-6 p-6 pt-8 bg-gray-800/50 rounded-lg">
      {/* Media Properties */}
      <div className="flex flex-col">
        <div className="h-5"></div>
        <div className="flex justify-between">
          <Label className="text-xs text-muted-foreground ml-[5px]">Name:</Label>
          <span className="text-xs text-right mr-[5px]">{activeProject?.name || ""}</span>
        </div>
        <PropertyItem label="Aspect ratio:" value={getDisplayName()} />
        <PropertyItem
          label="Resolution:"
          value={`${canvasSize.width} × ${canvasSize.height}`}
        />
        <div className="flex justify-between items-center">
          <Label className="text-xs text-muted-foreground ml-[5px]">Frame rate:</Label>
          <Select
            value={(activeProject?.fps || 30).toString()}
            onValueChange={handleFpsChange}
          >
            <SelectTrigger className="w-32 h-6 text-xs !border-transparent mr-[5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FPS_PRESETS.map(({ value, label }) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <ScrollArea 
      className="h-full bg-panel rounded-xl"
      style={{
        borderTop: '2px solid #ff6b6b',
        borderRight: '2px solid #4ecdc4', 
        borderBottom: '2px solid #45b7d1',
        borderLeft: '2px solid #96ceb4'
      }}
    >
      {selectedElements.length > 0
        ? selectedElements.map(({ trackId, elementId }) => {
            const track = tracks.find((t) => t.id === trackId);
            const element = track?.elements.find((e) => e.id === elementId);

            if (element?.type === "text") {
              return (
                <div key={elementId} className="p-6 pt-8 bg-gray-800/50 rounded-lg">
                  <TextProperties element={element} trackId={trackId} />
                </div>
              );
            }
            if (element?.type === "media") {
              const mediaItem = mediaItems.find(
                (item) => item.id === element.mediaId
              );

              if (mediaItem?.type === "audio") {
                return (
                  <div key={elementId} className="p-6 pt-8 bg-gray-800/50 rounded-lg">
                    <AudioProperties element={element} />
                  </div>
                );
              }

              return (
                <div key={elementId} className="p-6 pt-8 bg-gray-800/50 rounded-lg">
                  <MediaProperties element={element} />
                </div>
              );
            }
            return null;
          })
        : emptyView}
    </ScrollArea>
  );
}

function PropertyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between mt-2">
      <Label className="text-xs text-muted-foreground ml-[5px]">{label}</Label>
      <span className="text-xs text-right mr-[5px]">{value}</span>
    </div>
  );
}
