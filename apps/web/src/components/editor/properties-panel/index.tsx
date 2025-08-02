"use client";

import { FPS_PRESETS } from "@/constants/timeline-constants";
import { useAspectRatio } from "@/hooks/use-aspect-ratio";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { Label } from "../../ui/label";
import { ScrollArea } from "../../ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { AudioProperties } from "./audio-properties";
import { MediaProperties } from "./media-properties";
import {
  PropertyItem,
  PropertyItemLabel,
  PropertyItemValue,
} from "./property-item";
import { TextProperties } from "./text-properties";

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
    <div className="space-y-4 p-5">
      {/* Media Properties */}
      <div className="flex flex-col gap-3">
        <PropertyItem direction="column">
          <PropertyItemLabel className="text-xs text-muted-foreground">
            Name:
          </PropertyItemLabel>
          <PropertyItemValue className="text-xs truncate">
            {activeProject?.name || ""}
          </PropertyItemValue>
        </PropertyItem>
        <PropertyItem direction="column">
          <PropertyItemLabel className="text-xs text-muted-foreground">
            Aspect ratio:
          </PropertyItemLabel>
          <PropertyItemValue className="text-xs truncate">
            {getDisplayName()}
          </PropertyItemValue>
        </PropertyItem>
        <PropertyItem direction="column">
          <PropertyItemLabel className="text-xs text-muted-foreground">
            Resolution:
          </PropertyItemLabel>
          <PropertyItemValue className="text-xs truncate">
            {`${canvasSize.width} × ${canvasSize.height}`}
          </PropertyItemValue>
        </PropertyItem>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Frame rate:</Label>
          <Select
            value={(activeProject?.fps || "N/A").toString()}
            onValueChange={handleFpsChange}
          >
            <SelectTrigger className="w-32 h-6 text-xs">
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
    <ScrollArea className="h-full bg-panel rounded-sm">
      {selectedElements.length > 0
        ? selectedElements.map(({ trackId, elementId }) => {
            const track = tracks.find((t) => t.id === trackId);
            const element = track?.elements.find((e) => e.id === elementId);

            if (element?.type === "text") {
              return (
                <div key={elementId}>
                  <TextProperties element={element} trackId={trackId} />
                </div>
              );
            }
            if (element?.type === "media") {
              const mediaItem = mediaItems.find(
                (item) => item.id === element.mediaId
              );

              if (mediaItem?.type === "audio") {
                return <AudioProperties key={elementId} element={element} />;
              }

              return (
                <div key={elementId}>
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
