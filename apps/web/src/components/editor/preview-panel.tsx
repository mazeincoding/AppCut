"use client";

import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useProjectStore } from "@/stores/project-store";
import { VideoPlayer } from "@/components/ui/video-player";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Monitor } from "lucide-react";
import { useState, useRef, useEffect } from "react";

// Debug flag - set to false to hide active clips info
const SHOW_DEBUG_INFO = process.env.NODE_ENV === 'development';

export function PreviewPanel() {
  const { tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { isPlaying, toggle, currentTime } = usePlaybackStore();
  const { activeProject } = useProjectStore();

  const [canvasSize, setCanvasSize] = useState({ 
    width: activeProject?.resolution?.width || 1920, 
    height: activeProject?.resolution?.height || 1080 
  });
  const [showDebug, setShowDebug] = useState(SHOW_DEBUG_INFO);
  const previewRef = useRef<HTMLDivElement>(null);

  // Update canvas size when project resolution changes
  useEffect(() => {
    if (activeProject?.resolution) {
      setCanvasSize({
        width: activeProject.resolution.width,
        height: activeProject.resolution.height
      });
    }
  }, [activeProject?.resolution]);

  // Get active clips at current time
  const getActiveClips = () => {
    const activeClips: Array<{
      clip: any;
      track: any;
      mediaItem: any;
    }> = [];

    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);

        if (currentTime >= clipStart && currentTime < clipEnd) {
          const mediaItem = clip.mediaId === "test"
            ? { type: "test", name: clip.name, url: "", thumbnailUrl: "" }
            : mediaItems.find((item) => item.id === clip.mediaId);

          if (mediaItem || clip.mediaId === "test") {
            activeClips.push({ clip, track, mediaItem });
          }
        }
      });
    });

    return activeClips;
  };

  const activeClips = getActiveClips();
  const aspectRatio = canvasSize.width / canvasSize.height;

  // Render a clip
  const renderClip = (clipData: any, index: number) => {
    const { clip, mediaItem } = clipData;

    // Test clips
    if (!mediaItem || clip.mediaId === "test") {
      return (
        <div
          key={clip.id}
          className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center"
        >
          <div className="text-center">
            <div className="text-2xl mb-2">🎬</div>
            <p className="text-xs text-white">{clip.name}</p>
          </div>
        </div>
      );
    }

    // Video clips
    if (mediaItem.type === "video") {
      return (
        <div key={clip.id} className="absolute inset-0">
          <VideoPlayer
            src={mediaItem.url}
            poster={mediaItem.thumbnailUrl}
            clipStartTime={clip.startTime}
            trimStart={clip.trimStart}
            trimEnd={clip.trimEnd}
            clipDuration={clip.duration}
          />
        </div>
      );
    }

    // Image clips
    if (mediaItem.type === "image") {
      return (
        <div key={clip.id} className="absolute inset-0">
          <img
            src={mediaItem.url}
            alt={mediaItem.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      );
    }

    // Audio clips (visual representation)
    if (mediaItem.type === "audio") {
      return (
        <div
          key={clip.id}
          className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center"
        >
          <div className="text-center">
            <div className="text-2xl mb-2">🎵</div>
            <p className="text-xs text-white">{mediaItem.name}</p>
          </div>
        </div>
      );
    }

    return null;
  };

  // Canvas size presets with project resolution awareness
  const getCanvasPresets = () => {
    const basePresets = [
      { name: "16:9 HD", width: 1920, height: 1080 },
      { name: "16:9 4K", width: 3840, height: 2160 },
      { name: "9:16 Mobile", width: 1080, height: 1920 },
      { name: "1:1 Square", width: 1080, height: 1080 },
      { name: "4:3 Standard", width: 1440, height: 1080 },
    ];

    // Add project resolution as first option if it exists and is different from presets
    if (activeProject?.resolution) {
      const { width, height, label } = activeProject.resolution;
      const existsInPresets = basePresets.some(p => p.width === width && p.height === height);
      
      if (!existsInPresets) {
        return [
          { name: `Project: ${label}`, width, height },
          ...basePresets
        ];
      }
    }

    return basePresets;
  };

  const canvasPresets = getCanvasPresets();

  return (
    <div className="h-full w-full flex flex-col min-h-0 min-w-0">
      {/* Canvas Controls */}
      <div className="border-b p-2 flex items-center gap-2 text-xs flex-shrink-0">
        {activeProject?.resolution && (
          <div className="flex items-center gap-2">
            <Monitor className="h-3 w-3" />
            <Badge variant={activeProject.resolution.autoDetected ? "default" : "secondary"} className="text-xs">
              {activeProject.resolution.label}
            </Badge>
            {activeProject.resolution.autoDetected && (
              <span className="text-muted-foreground text-xs">Auto</span>
            )}
          </div>
        )}

        <span className="text-muted-foreground">Canvas:</span>
        <select
          value={`${canvasSize.width}x${canvasSize.height}`}
          onChange={(e) => {
            const preset = canvasPresets.find(p => `${p.width}x${p.height}` === e.target.value);
            if (preset) setCanvasSize({ width: preset.width, height: preset.height });
          }}
          className="bg-background border rounded px-2 py-1 text-xs"
        >
          {canvasPresets.map(preset => (
            <option key={preset.name} value={`${preset.width}x${preset.height}`}>
              {preset.name} ({preset.width}×{preset.height})
            </option>
          ))}
        </select>

        {/* Debug Toggle - Only show in development */}
        {SHOW_DEBUG_INFO && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs"
          >
            Debug {showDebug ? 'ON' : 'OFF'}
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={toggle} className="ml-auto">
          {isPlaying ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
          {isPlaying ? "Pause" : "Play"}
        </Button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 bg-gray-900 min-h-0 min-w-0">
        <div
          ref={previewRef}
          className="relative overflow-hidden rounded-sm max-w-full max-h-full bg-black border border-gray-600"
          style={{
            aspectRatio: aspectRatio.toString(),
            width: "100%",
            height: "100%",
          }}
        >
          {activeClips.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-white/50">
              {tracks.length === 0 ? "Drop media to start editing" : "No clips at current time"}
            </div>
          ) : (
            activeClips.map((clipData, index) => renderClip(clipData, index))
          )}
        </div>
      </div>

      {/* Debug Info Panel - Conditionally rendered */}
      {showDebug && (
        <div className="border-t bg-background p-2 flex-shrink-0">
          <div className="text-xs font-medium mb-1">Debug: Active Clips ({activeClips.length})</div>
          <div className="flex gap-2 overflow-x-auto">
            {activeClips.map((clipData, index) => (
              <div
                key={clipData.clip.id}
                className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs whitespace-nowrap"
              >
                <span className="w-4 h-4 bg-primary/20 rounded text-center text-xs leading-4">
                  {index + 1}
                </span>
                <span>{clipData.clip.name}</span>
                <span className="text-muted-foreground">({clipData.mediaItem?.type || 'test'})</span>
              </div>
            ))}
            {activeClips.length === 0 && (
              <span className="text-muted-foreground">No active clips</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
