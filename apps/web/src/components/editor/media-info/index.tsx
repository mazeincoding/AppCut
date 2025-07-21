"use client";

import { MediaItem } from "@/stores/media-store";
import { Badge } from "../../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { formatTimeCode } from "@/lib/time";
import {
  FileText,
  Image,
  Music,
  Video,
  Clock,
  Maximize,
  HardDrive,
  Zap,
  Code,
} from "lucide-react";

interface MediaInfoProps {
  mediaItem: MediaItem;
  fps?: number;
}

export function MediaInfo({ mediaItem, fps = 30 }: MediaInfoProps) {
  const formatFileSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDuration = (duration: number) => {
    return formatTimeCode(duration, "HH:MM:SS", fps);
  };

  const formatBitrate = (bitrate: number) => {
    if (bitrate >= 1000000) {
      return `${(bitrate / 1000000).toFixed(1)} Mbps`;
    }
    return `${(bitrate / 1000).toFixed(0)} Kbps`;
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "video":
        return Video;
      case "audio":
        return Music;
      case "image":
        return Image;
      default:
        return FileText;
    }
  };

  const Icon = getMediaIcon(mediaItem.type);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4" />
          Media Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {mediaItem.type.toUpperCase()}
            </Badge>
            {mediaItem.codecName && (
              <Badge variant="secondary" className="text-xs">
                {mediaItem.codecName}
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium truncate" title={mediaItem.name}>
            {mediaItem.name}
          </p>
        </div>

        {/* File Properties */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <HardDrive className="h-3 w-3 text-muted-foreground" />
            <span>{formatFileSize(mediaItem.file.size)}</span>
          </div>

          {mediaItem.duration && (
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span>{formatDuration(mediaItem.duration)}</span>
            </div>
          )}

          {mediaItem.width && mediaItem.height && (
            <div className="flex items-center gap-2">
              <Maximize className="h-3 w-3 text-muted-foreground" />
              <span>
                {mediaItem.width} × {mediaItem.height}
              </span>
            </div>
          )}

          {mediaItem.fps && (
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3 text-muted-foreground" />
              <span>{mediaItem.fps} FPS</span>
            </div>
          )}

          {mediaItem.bitrate && (
            <div className="flex items-center gap-2 col-span-2">
              <Code className="h-3 w-3 text-muted-foreground" />
              <span>{formatBitrate(mediaItem.bitrate)}</span>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="pt-2 border-t border-border space-y-1 text-xs text-muted-foreground">
          {mediaItem.createdAt && (
            <div>Added: {mediaItem.createdAt.toLocaleDateString()}</div>
          )}
          {mediaItem.lastModified && (
            <div>Modified: {mediaItem.lastModified.toLocaleDateString()}</div>
          )}
        </div>

        {/* Tags */}
        {mediaItem.tags && mediaItem.tags.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Tags</p>
            <div className="flex flex-wrap gap-1">
              {mediaItem.tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-[10px] px-1 py-0"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
