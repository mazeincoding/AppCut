"use client";

import { useProjectStore } from "@/stores/project-store";
import { useAspectRatio } from "@/hooks/use-aspect-ratio";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";
import { useTimelineStore } from "@/stores/timeline-store";
import { Input } from "../ui/input";
import { MediaElement, TextElement } from "@/types/timeline";
import { useMediaStore } from "@/stores/media-store";
import { Bold, Italic, Underline } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export function PropertiesPanel() {
  const { activeProject } = useProjectStore();
  const { getDisplayName, canvasSize } = useAspectRatio();
  const { selectedElements, tracks, updateTextElement } = useTimelineStore();
  const { mediaItems } = useMediaStore();

  const emptyView = (
    <div className="space-y-4 p-5">
      {/* Media Properties */}
      <div className="flex flex-col gap-3">
        <PropertyItem label="Name:" value={activeProject?.name || ""} />
        <PropertyItem label="Aspect ratio:" value={getDisplayName()} />
        <PropertyItem
          label="Resolution:"
          value={`${canvasSize.width} × ${canvasSize.height}`}
        />
        <PropertyItem label="Frame rate:" value="30.00fps" />
      </div>
    </div>
  );

  const TextProperties = (element: TextElement, trackId: string) => {
    return (
      <div className="space-y-4 p-5">
        <div>
          <PropertyItem label="Content" value="" />
          <Input
            placeholder="Name"
            defaultValue={element.content}
            onChange={(e) =>
              updateTextElement(trackId, element.id, { content: e.target.value })
            }
          />
        </div>
        <div>
          <PropertyItem label="Font" value={element.fontFamily} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full">
                {element.fontFamily}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() =>
                  updateTextElement(trackId, element.id, { fontFamily: "Arial" })
                }
              >
                Arial
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  updateTextElement(trackId, element.id, {
                    fontFamily: "Helvetica",
                  })
                }
              >
                Helvetica
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  updateTextElement(trackId, element.id, {
                    fontFamily: "Times New Roman",
                  })
                }
              >
                Times New Roman
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <PropertyItem label="Size" value={element.fontSize.toString()} />
            <Input
              type="number"
              value={element.fontSize}
              onChange={(e) =>
                updateTextElement(trackId, element.id, {
                  fontSize: parseInt(e.target.value),
                })
              }
              className="w-full"
            />
          </div>
          <div className="flex-1">
            <PropertyItem label="Color" value={element.color} />
            <input
              type="color"
              value={element.color}
              onChange={(e) =>
                updateTextElement(trackId, element.id, {
                  color: e.target.value,
                })
              }
              className="w-full h-9"
            />
          </div>
        </div>
        <div>
          <PropertyItem label="Style" value="" />
          <div className="flex items-center gap-2">
            <Button
              variant={element.fontWeight === "bold" ? "secondary" : "outline"}
              size="icon"
              onClick={() =>
                updateTextElement(trackId, element.id, {
                  fontWeight: element.fontWeight === "bold" ? "normal" : "bold",
                })
              }
            >
              <Bold />
            </Button>
            <Button
              variant={element.fontStyle === "italic" ? "secondary" : "outline"}
              size="icon"
              onClick={() =>
                updateTextElement(trackId, element.id, {
                  fontStyle:
                    element.fontStyle === "italic" ? "normal" : "italic",
                })
              }
            >
              <Italic />
            </Button>
            <Button
              variant={
                element.textDecoration === "underline" ? "secondary" : "outline"
              }
              size="icon"
              onClick={() =>
                updateTextElement(trackId, element.id, {
                  textDecoration:
                    element.textDecoration === "underline"
                      ? "none"
                      : "underline",
                })
              }
            >
              <Underline />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const MediaProperties = (element: MediaElement) => {
    const mediaItem = mediaItems.find((item) => item.id === element.mediaId);

    if (mediaItem?.type === "audio") {
      return <div className="space-y-4 p-5">Audio properties</div>;
    }

    // video or image
    return <div className="space-y-4 p-5">Video/Image properties</div>;
  };

  const ElementProperties = (
    <>
      {selectedElements.map(({ trackId, elementId }) => {
        const track = tracks.find((t) => t.id === trackId);
        const element = track?.elements.find((e) => e.id === elementId);

        if (element?.type === "text") {
          return <div key={elementId}>{TextProperties(element, trackId)}</div>;
        }
        if (element?.type === "media") {
          return <div key={elementId}>{MediaProperties(element)}</div>;
        }
      })}
    </>
  );

  return (
    <ScrollArea className="h-full bg-panel rounded-sm">
      {selectedElements.length > 0 ? ElementProperties : emptyView}
    </ScrollArea>
  );
}

function PropertyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-xs text-right">{value}</span>
    </div>
  );
}
