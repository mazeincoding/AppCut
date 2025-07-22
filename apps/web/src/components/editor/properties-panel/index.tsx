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
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";
import { FPS_PRESETS } from "@/constants/timeline-constants";
import { formatTimeCode } from "@/lib/time";
import {
  Save,
  Clock,
  Image,
  Music,
  Video,
  HardDrive,
  Calendar,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

export function PropertiesPanel() {
  const { activeProject, updateProjectFps, saveCurrentProject } =
    useProjectStore();
  const { getDisplayName, canvasSize } = useAspectRatio();
  const { selectedElements, tracks, getTotalDuration } = useTimelineStore();
  const { mediaItems } = useMediaStore();

  const handleFpsChange = (value: string) => {
    const fps = parseFloat(value);
    if (!isNaN(fps) && fps > 0) {
      updateProjectFps(fps);
    }
  };

  const handleSaveProject = async () => {
    try {
      await saveCurrentProject();
      toast.success("Project saved successfully");
    } catch (error) {
      toast.error("Failed to save project");
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDuration = (duration: number) => {
    return formatTimeCode(duration, "HH:MM:SS", activeProject?.fps || 30);
  };

  const getMediaStats = () => {
    const stats = {
      total: mediaItems.length,
      video: 0,
      audio: 0,
      image: 0,
      totalSize: 0,
      totalDuration: 0,
    };

    mediaItems.forEach((item) => {
      stats[item.type]++;
      stats.totalSize += item.file.size;
      if (item.duration) {
        stats.totalDuration += item.duration;
      }
    });

    return stats;
  };

  const getTimelineStats = () => {
    const stats = {
      tracks: tracks.length,
      elements: tracks.reduce(
        (total, track) => total + track.elements.length,
        0
      ),
      duration: getTotalDuration(),
    };
    return stats;
  };

  const mediaStats = getMediaStats();
  const timelineStats = getTimelineStats();

  const emptyView = (
    <div className="space-y-6 p-5">
      {/* Project Settings Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <h3 className="font-medium">Project Settings</h3>
        </div>
        <Button size="sm" onClick={handleSaveProject}>
          <Save className="h-3 w-3 mr-2" />
          Save
        </Button>
      </div>

      <Separator />

      {/* Basic Project Info */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          Project Info
        </h4>
        <div className="space-y-2">
          <PropertyItem label="Name" value={activeProject?.name || ""} />
          <PropertyItem
            label="Created"
            value={
              activeProject?.createdAt
                ? new Date(activeProject.createdAt).toLocaleDateString()
                : ""
            }
          />
          <PropertyItem
            label="Modified"
            value={
              activeProject?.updatedAt
                ? new Date(activeProject.updatedAt).toLocaleDateString()
                : ""
            }
          />
        </div>
      </div>

      <Separator />

      {/* Canvas Settings */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Canvas Settings</h4>
        <div className="space-y-2">
          <PropertyItem label="Aspect Ratio" value={getDisplayName()} />
          <PropertyItem
            label="Resolution"
            value={`${canvasSize.width} × ${canvasSize.height}`}
          />
          <div className="flex justify-between items-center">
            <Label className="text-xs text-muted-foreground">Frame Rate</Label>
            <Select
              value={(activeProject?.fps || 30).toString()}
              onValueChange={handleFpsChange}
            >
              <SelectTrigger className="w-32 h-7 text-xs">
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

      <Separator />

      {/* Timeline Statistics */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-3 w-3" />
          Timeline
        </h4>
        <div className="space-y-2">
          <PropertyItem
            label="Duration"
            value={formatDuration(timelineStats.duration)}
          />
          <PropertyItem
            label="Tracks"
            value={timelineStats.tracks.toString()}
          />
          <PropertyItem
            label="Elements"
            value={timelineStats.elements.toString()}
          />
        </div>
      </div>

      <Separator />

      {/* Media Library Statistics */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <HardDrive className="h-3 w-3" />
          Media Library
        </h4>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <PropertyItem
              label="Total Items"
              value={mediaStats.total.toString()}
            />
            <PropertyItem
              label="Total Size"
              value={formatFileSize(mediaStats.totalSize)}
            />
          </div>

          {/* Media type breakdown with badges */}
          {(mediaStats.video > 0 ||
            mediaStats.audio > 0 ||
            mediaStats.image > 0) && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Media Types
              </Label>
              <div className="flex flex-wrap gap-2">
                {mediaStats.video > 0 && (
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    <Video className="h-3 w-3 mr-1" />
                    {mediaStats.video} Video{mediaStats.video > 1 ? "s" : ""}
                  </Badge>
                )}
                {mediaStats.audio > 0 && (
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    <Music className="h-3 w-3 mr-1" />
                    {mediaStats.audio} Audio
                  </Badge>
                )}
                {mediaStats.image > 0 && (
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    <Image className="h-3 w-3 mr-1" />
                    {mediaStats.image} Image{mediaStats.image > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {mediaStats.totalDuration > 0 && (
            <PropertyItem
              label="Media Duration"
              value={formatDuration(mediaStats.totalDuration)}
            />
          )}
        </div>
      </div>

      {/* Empty state message */}
      {mediaStats.total === 0 && timelineStats.elements === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <div className="space-y-2">
            <p className="text-sm">No media or timeline elements yet</p>
            <p className="text-xs">Add media files to get started</p>
          </div>
        </div>
      )}
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
                return <AudioProperties element={element} />;
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

function PropertyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <Label className="text-xs text-muted-foreground">{label}:</Label>
      <span className="text-xs font-mono text-right">{value}</span>
    </div>
  );
}
