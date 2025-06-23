"use client";

import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { ImageTimelineTreatment } from "@/components/ui/image-timeline-treatment";
import { VideoPlayer } from "@/components/ui/video-player";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

export function PreviewPanel() {
  const { tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { isPlaying, toggle, currentTime } = usePlaybackStore();

  // Find the active clip at the current playback time
  const getActiveClip = () => {
    for (const track of tracks) {
      for (const clip of track.clips) {
        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);

        if (currentTime >= clipStart && currentTime < clipEnd) {
          return clip;
        }
      }
    }
    return null;
  };

  const activeClip = getActiveClip();
  const activeMediaItem = activeClip
    ? mediaItems.find((item) => item.id === activeClip.mediaId)
    : null;

  const aspectRatio = activeMediaItem?.aspectRatio || 16 / 9;

  const renderContent = () => {
    if (!activeClip) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50">
          {tracks.length === 0 ? "Drop media to start editing" : "No clip at current time"}
        </div>
      );
    }

    // Handle test clips without media items
    if (!activeMediaItem && activeClip.mediaId === "test") {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20">
          <div className="text-center">
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-muted-foreground">{activeClip.name}</p>
            <p className="text-xs text-muted-foreground/70 mt-2">Test clip for playback</p>
          </div>
        </div>
      );
    }

    if (!activeMediaItem) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50">
          Media not found
        </div>
      );
    }

    if (activeMediaItem.type === "video") {
      return (
        <VideoPlayer
          src={activeMediaItem.url}
          poster={activeMediaItem.thumbnailUrl}
          className="w-full h-full"
          clipStartTime={activeClip.startTime}
          trimStart={activeClip.trimStart}
          trimEnd={activeClip.trimEnd}
          clipDuration={activeClip.duration}
          key={`${activeClip.id}-${activeClip.trimStart}-${activeClip.trimEnd}`}
        />
      );
    }

    if (activeMediaItem.type === "image") {
      return (
        <ImageTimelineTreatment
          src={activeMediaItem.url}
          alt={activeMediaItem.name}
          targetAspectRatio={aspectRatio}
          className="w-full h-full"
          backgroundType="blur"
        />
      );
    }

    if (activeMediaItem.type === "audio") {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-500/20 to-emerald-500/20">
          <div className="text-center">
            <div className="text-6xl mb-4">🎵</div>
            <p className="text-muted-foreground">{activeMediaItem.name}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={toggle}
            >
              {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {isPlaying ? "Pause" : "Play"}
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 overflow-hidden">
      <div
        className="bg-black rounded-lg shadow-lg relative overflow-hidden flex-shrink-0"
        style={{
          aspectRatio: aspectRatio.toString(),
          width: aspectRatio > 1 ? "100%" : "auto",
          height: aspectRatio <= 1 ? "100%" : "auto",
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      >
        {renderContent()}
      </div>

      {activeMediaItem && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            {activeMediaItem.name}
          </p>
          <p className="text-xs text-muted-foreground/70">
            {aspectRatio.toFixed(2)} • {aspectRatio > 1 ? "Landscape" : aspectRatio < 1 ? "Portrait" : "Square"}
          </p>
        </div>
      )}
    </div>
  );
}
