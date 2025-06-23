"use client";

import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { ImageTimelineTreatment } from "@/components/ui/image-timeline-treatment";
import { Monitor, Settings, Video } from "lucide-react";
import { useState } from "react";

// Common video resolutions for manual selection
const COMMON_RESOLUTIONS = [
  { width: 1920, height: 1080, label: "Full HD (1920x1080)" },
  { width: 1280, height: 720, label: "HD (1280x720)" },
  { width: 3840, height: 2160, label: "4K UHD (3840x2160)" },
  { width: 2560, height: 1440, label: "QHD (2560x1440)" },
  { width: 1366, height: 768, label: "WXGA (1366x768)" },
  { width: 854, height: 480, label: "SD (854x480)" },
];

export function PropertiesPanel() {
  const { tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { activeProject, setProjectResolution } = useProjectStore();
  const [backgroundType, setBackgroundType] = useState<
    "blur" | "mirror" | "color"
  >("blur");
  const [backgroundColor, setBackgroundColor] = useState("#000000");

  // Get the first image clip for preview (simplified)
  const firstImageClip = tracks
    .flatMap((track) => track.clips)
    .find((clip) => {
      const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);
      return mediaItem?.type === "image";
    });

  const firstImageItem = firstImageClip
    ? mediaItems.find((item) => item.id === firstImageClip.mediaId)
    : null;

  const handleResolutionChange = (value: string) => {
    const resolution = COMMON_RESOLUTIONS.find(r => r.label === value);
    if (resolution) {
      setProjectResolution(resolution.width, resolution.height, resolution.label, false);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-5">
        {/* Project Settings */}
        {activeProject && (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                <h3 className="text-sm font-medium">Project Settings</h3>
              </div>
              
              <div className="space-y-3">
                {/* Current Resolution Display */}
                {activeProject.resolution && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Current Resolution</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant={activeProject.resolution.autoDetected ? "default" : "secondary"}>
                        {activeProject.resolution.label}
                      </Badge>
                      {activeProject.resolution.autoDetected && (
                        <span className="text-xs text-muted-foreground">Auto-detected</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {activeProject.resolution.width} × {activeProject.resolution.height} 
                      {" • "} 
                      {activeProject.resolution.aspectRatio.toFixed(2)}:1
                    </div>
                  </div>
                )}

                {/* Resolution Selector */}
                <div className="space-y-2">
                  <Label htmlFor="resolution">Change Resolution</Label>
                  <Select
                    value={activeProject.resolution?.label || ""}
                    onValueChange={handleResolutionChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select resolution" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_RESOLUTIONS.map((res) => (
                        <SelectItem key={res.label} value={res.label}>
                          {res.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    Resolution will be automatically detected from the first video you upload
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Media Files</div>
                    <div className="text-sm font-medium">{mediaItems.length}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Video Tracks</div>
                    <div className="text-sm font-medium">
                      {tracks.filter(t => t.type === 'video').length}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* Image Treatment - only show if an image is selected */}
        {firstImageItem && (
          <>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Image Treatment</h3>
              <div className="space-y-4">
                {/* Preview */}
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="w-full aspect-video max-w-48">
                    <ImageTimelineTreatment
                      src={firstImageItem.url}
                      alt={firstImageItem.name}
                      targetAspectRatio={16 / 9}
                      className="rounded-sm border"
                      backgroundType={backgroundType}
                      backgroundColor={backgroundColor}
                    />
                  </div>
                </div>

                {/* Background Type */}
                <div className="space-y-2">
                  <Label htmlFor="bg-type">Background Type</Label>
                  <Select
                    value={backgroundType}
                    onValueChange={(value: any) => setBackgroundType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select background type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blur">Blur</SelectItem>
                      <SelectItem value="mirror">Mirror</SelectItem>
                      <SelectItem value="color">Solid Color</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Background Color - only show for color type */}
                {backgroundType === "color" && (
                  <div className="space-y-2">
                    <Label htmlFor="bg-color">Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="bg-color"
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* Transform */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Transform</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="x">X Position</Label>
                <Input id="x" type="number" defaultValue="0" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="y">Y Position</Label>
                <Input id="y" type="number" defaultValue="0" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rotation">Rotation</Label>
              <Slider
                id="rotation"
                max={360}
                step={1}
                defaultValue={[0]}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Effects */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Effects</h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="opacity">Opacity</Label>
              <Slider
                id="opacity"
                max={100}
                step={1}
                defaultValue={[100]}
                className="mt-2"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="blur">Blur</Label>
              <Slider
                id="blur"
                max={20}
                step={0.5}
                defaultValue={[0]}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Timing */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Timing</h3>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                min="0"
                step="0.1"
                defaultValue="5"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="delay">Delay (seconds)</Label>
              <Input
                id="delay"
                type="number"
                min="0"
                step="0.1"
                defaultValue="0"
              />
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
