"use client";

import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore, type MediaItem } from "@/stores/media-store";
import { TimelineTrack } from "@/types/timeline";
import { usePlaybackStore } from "@/stores/playback-store";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { TimelineElement } from "@/types/timeline";

// Only show in development
const SHOW_DEBUG_INFO = process.env.NODE_ENV === "development";

interface ActiveElement {
  element: TimelineElement;
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

  // Get active elements at current time
  const getActiveElements = (): ActiveElement[] => {
    const activeElements: ActiveElement[] = [];

    tracks.forEach((track) => {
      track.elements.forEach((element) => {
        const elementStart = element.startTime;
        const elementEnd =
          element.startTime +
          (element.duration - element.trimStart - element.trimEnd);

        if (currentTime >= elementStart && currentTime < elementEnd) {
          const mediaItem =
            element.type === "media"
              ? mediaItems.find((item) => item.id === element.mediaId) || null
              : null; // Text elements don't have media items

          activeElements.push({ element, track, mediaItem });
        }
      });
    });

    return activeElements;
  };

  const activeElements = getActiveElements();

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
              Active Elements ({activeElements.length})
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {activeElements.map((elementData, index) => (
                <div
                  key={elementData.element.id}
                  className="flex items-center gap-2 px-2 py-1 bg-muted/60 rounded text-xs"
                >
                  <span className="w-4 h-4 bg-primary/20 rounded text-center text-xs leading-4 flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{elementData.element.name}</div>
                    <div className="text-muted-foreground text-[10px]">
                      {elementData.element.type === "media"
                        ? elementData.mediaItem?.type || "media"
                        : "text"}
                    </div>
                  </div>
                </div>
              ))}
              {activeElements.length === 0 && (
                <div className="text-muted-foreground text-xs py-2 text-center">
                  No active elements
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
