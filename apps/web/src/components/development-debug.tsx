"use client";

import {
  useTimelineStore,
  type TimelineClip,
  type TimelineTrack,
} from "@/stores/timeline-store";
import { useMediaStore, type MediaItem } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// Only show in development
const SHOW_DEBUG_INFO = process.env.NODE_ENV === "development";

interface ActiveClip {
  clip: TimelineClip;
  track: TimelineTrack;
  mediaItem: MediaItem | null;
}

export function DevelopmentDebug() {
  const { tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { currentTime } = usePlaybackStore();
  const [showDebug, setShowDebug] = useState(false);

  // Don't render anything in production
  if (!SHOW_DEBUG_INFO) return null;

  // Get active clips at current time
  const getActiveClips = (): ActiveClip[] => {
    const activeClips: ActiveClip[] = [];

    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const clipStart = clip.startTime;
        const clipEnd =
          clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);

        if (currentTime >= clipStart && currentTime < clipEnd) {
          const mediaItem =
            clip.mediaId === "test"
              ? null // Test clips don't have a real media item
              : mediaItems.find((item) => item.id === clip.mediaId) || null;

          activeClips.push({ clip, track, mediaItem });
        }
      });
    });

    return activeClips;
  };

  const activeClips = getActiveClips();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex flex-col items-end gap-2">
        {/* Toggle Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs backdrop-blur-md bg-background/80 border-border/50"
        >
          Debug {showDebug ? "ON" : "OFF"}
        </Button>

        {/* Debug Info Panel */}
        {showDebug && (
          <div className="backdrop-blur-md bg-background/90 border border-border/50 rounded-lg p-3 max-w-sm">
            <div className="text-xs font-medium mb-2 text-foreground">
              Active Clips ({activeClips.length})
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {activeClips.map((clipData, index) => (
                <div
                  key={clipData.clip.id}
                  className="flex items-center gap-2 px-2 py-1 bg-muted/60 rounded text-xs"
                >
                  <span className="w-4 h-4 bg-primary/20 rounded text-center text-xs leading-4 flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{clipData.clip.name}</div>
                    <div className="text-muted-foreground text-[10px]">
                      {clipData.mediaItem?.type || "test"}
                    </div>
                  </div>
                </div>
              ))}
              {activeClips.length === 0 && (
                <div className="text-muted-foreground text-xs py-2 text-center">
                  No active clips
                </div>
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-border/30 text-[10px] text-muted-foreground">
              Time: {currentTime.toFixed(2)}s
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
