"use client";

import { formatTimeCode } from "@/lib/time";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import {
  Clock,
  FileText,
  HardDrive,
  Image,
  Music,
  Save,
  Settings,
  Video,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { ScrollArea } from "../../ui/scroll-area";

export function ProjectPanel() {
  const { activeProject, saveCurrentProject, updateProjectFps } =
    useProjectStore();
  const { mediaItems } = useMediaStore();
  const { tracks, getTotalDuration } = useTimelineStore();
  const [projectName, setProjectName] = useState(activeProject?.name || "");
  const [isEditing, setIsEditing] = useState(false);

  if (!activeProject) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FileText className="h-8 w-8 mx-auto mb-2" />
          <p>No project loaded</p>
        </div>
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDuration = (duration: number) => {
    return formatTimeCode(duration, "HH:MM:SS", activeProject.fps || 30);
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

  const handleSave = async () => {
    try {
      await saveCurrentProject();
      setIsEditing(false);
      toast.success("Project saved successfully");
    } catch (error) {
      toast.error("Failed to save project");
    }
  };

  const mediaStats = getMediaStats();
  const timelineStats = getTimelineStats();

  return (
    <ScrollArea className="h-full bg-panel rounded-sm">
      <div className="p-4 space-y-4">
        {/* Project Header */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Project</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Project Name</Label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setProjectName(activeProject.name);
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <PropertyItem label="Name" value={activeProject.name} />
                <PropertyItem
                  label="Created"
                  value={new Date(activeProject.createdAt).toLocaleDateString()}
                />
                <PropertyItem
                  label="Modified"
                  value={new Date(activeProject.updatedAt).toLocaleDateString()}
                />
                <PropertyItem
                  label="Frame Rate"
                  value={`${activeProject.fps || 30} FPS`}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
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
          </CardContent>
        </Card>

        {/* Media Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Media Library
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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

            {/* Media type breakdown */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">By Type</Label>
              <div className="flex flex-wrap gap-1">
                {mediaStats.video > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Video className="h-3 w-3 mr-1" />
                    {mediaStats.video} Video
                  </Badge>
                )}
                {mediaStats.audio > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Music className="h-3 w-3 mr-1" />
                    {mediaStats.audio} Audio
                  </Badge>
                )}
                {mediaStats.image > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Image className="h-3 w-3 mr-1" />
                    {mediaStats.image} Image
                  </Badge>
                )}
              </div>
            </div>

            {mediaStats.totalDuration > 0 && (
              <PropertyItem
                label="Media Duration"
                value={formatDuration(mediaStats.totalDuration)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

function PropertyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <Label className="text-xs text-muted-foreground">{label}:</Label>
      <span className="text-xs font-mono">{value}</span>
    </div>
  );
}
