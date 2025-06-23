"use client";

import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { VideoPlayer } from "@/components/ui/video-player";
import { Button } from "@/components/ui/button";
import { Play, Pause, Move, RotateCw, Crop, ZoomIn, ZoomOut } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

interface ClipTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  width: number;
  height: number;
  blendMode: string;
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
}

interface DragState {
  isDragging: boolean;
  dragType: 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | 'rotate' | 'scale' | 'crop-n' | 'crop-s' | 'crop-e' | 'crop-w';
  startMouseX: number;
  startMouseY: number;
  startTransform: ClipTransform;
  clipId: string;
}

export function PreviewPanel() {
  const { tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { isPlaying, toggle, currentTime } = usePlaybackStore();

  const [clipTransforms, setClipTransforms] = useState<Record<string, ClipTransform>>({});
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 }); // Default 16:9
  const [dragState, setDragState] = useState<DragState | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Get all active clips at current time (for overlaying)
  const getActiveClips = () => {
    const activeClips: Array<{
      clip: any;
      track: any;
      mediaItem: any;
      layer: number;
    }> = [];

    tracks.forEach((track, trackIndex) => {
      track.clips.forEach((clip) => {
        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);

        if (currentTime >= clipStart && currentTime < clipEnd) {
          const mediaItem = clip.mediaId === "test"
            ? { type: "test", name: clip.name, url: "", thumbnailUrl: "" }
            : mediaItems.find((item) => item.id === clip.mediaId);

          if (mediaItem || clip.mediaId === "test") {
            activeClips.push({
              clip,
              track,
              mediaItem,
              layer: trackIndex, // Track index determines layer order
            });
          }
        }
      });
    });

    // Sort by layer (track order) - higher index = on top
    return activeClips.sort((a, b) => a.layer - b.layer);
  };

  const activeClips = getActiveClips();
  const aspectRatio = canvasSize.width / canvasSize.height;

  // Get or create transform for a clip
  const getClipTransform = (clipId: string): ClipTransform => {
    return clipTransforms[clipId] || {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      width: 100, // Percentage of canvas
      height: 100,
      blendMode: 'normal',
      cropTop: 0,
      cropBottom: 0,
      cropLeft: 0,
      cropRight: 0,
    };
  };

  // Update clip transform
  const updateClipTransform = useCallback((clipId: string, updates: Partial<ClipTransform>) => {
    setClipTransforms(prev => {
      const currentTransform = prev[clipId] || {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        width: 100,
        height: 100,
        blendMode: 'normal',
        cropTop: 0,
        cropBottom: 0,
        cropLeft: 0,
        cropRight: 0,
      };

      return {
        ...prev,
        [clipId]: { ...currentTransform, ...updates }
      };
    });
  }, []);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent, clipId: string, dragType: DragState['dragType']) => {
    e.preventDefault();
    e.stopPropagation();

    setDragState({
      isDragging: true,
      dragType,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startTransform: getClipTransform(clipId),
      clipId
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !dragState.isDragging) return;

    const deltaX = e.clientX - dragState.startMouseX;
    const deltaY = e.clientY - dragState.startMouseY;
    const { startTransform, clipId, dragType } = dragState;

    switch (dragType) {
      case 'move':
        updateClipTransform(clipId, {
          x: Math.max(-100, Math.min(100, startTransform.x + deltaX * 0.3)),
          y: Math.max(-100, Math.min(100, startTransform.y + deltaY * 0.3))
        });
        break;

      case 'resize-nw':
        updateClipTransform(clipId, {
          width: Math.max(20, startTransform.width - deltaX * 0.5),
          height: Math.max(20, startTransform.height - deltaY * 0.5)
        });
        break;

      case 'resize-ne':
        updateClipTransform(clipId, {
          width: Math.max(20, startTransform.width + deltaX * 0.5),
          height: Math.max(20, startTransform.height - deltaY * 0.5)
        });
        break;

      case 'resize-sw':
        updateClipTransform(clipId, {
          width: Math.max(20, startTransform.width - deltaX * 0.5),
          height: Math.max(20, startTransform.height + deltaY * 0.5)
        });
        break;

      case 'resize-se':
        updateClipTransform(clipId, {
          width: Math.max(20, startTransform.width + deltaX * 0.5),
          height: Math.max(20, startTransform.height + deltaY * 0.5)
        });
        break;

      case 'rotate':
        updateClipTransform(clipId, {
          rotation: (startTransform.rotation + deltaX * 2) % 360
        });
        break;

      case 'scale':
        updateClipTransform(clipId, {
          scale: Math.max(0.1, Math.min(3, startTransform.scale + deltaX * 0.01))
        });
        break;

      case 'crop-n':
        updateClipTransform(clipId, {
          cropTop: Math.max(0, Math.min(40, startTransform.cropTop + deltaY * 0.2))
        });
        break;

      case 'crop-s':
        updateClipTransform(clipId, {
          cropBottom: Math.max(0, Math.min(40, startTransform.cropBottom - deltaY * 0.2))
        });
        break;

      case 'crop-e':
        updateClipTransform(clipId, {
          cropRight: Math.max(0, Math.min(40, startTransform.cropRight - deltaX * 0.2))
        });
        break;

      case 'crop-w':
        updateClipTransform(clipId, {
          cropLeft: Math.max(0, Math.min(40, startTransform.cropLeft + deltaX * 0.2))
        });
        break;
    }
  }, [dragState, updateClipTransform]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  // Add global mouse event listeners
  useEffect(() => {
    if (dragState?.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  // Initialize transforms for new clips
  useEffect(() => {
    const activeClips = getActiveClips();
    const newTransforms: Record<string, ClipTransform> = {};
    let hasNewClips = false;

    activeClips.forEach(({ clip }) => {
      if (!clipTransforms[clip.id]) {
        hasNewClips = true;
        newTransforms[clip.id] = {
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          opacity: 1,
          width: 100,
          height: 100,
          blendMode: 'normal',
          cropTop: 0,
          cropBottom: 0,
          cropLeft: 0,
          cropRight: 0,
        };
      }
    });

    if (hasNewClips) {
      setClipTransforms(prev => ({ ...prev, ...newTransforms }));
    }
  }, [tracks, currentTime]); // Re-run when tracks or time changes



  // Render a single clip layer
  const renderClipLayer = (clipData: any, index: number) => {
    const { clip, mediaItem } = clipData;
    const transform = getClipTransform(clip.id);

    const layerStyle = {
      position: 'absolute' as const,
      left: '50%',
      top: '50%',
      width: `${transform.width}%`,
      height: `${transform.height}%`,
      transform: `translate(-50%, -50%) translate(${transform.x}%, ${transform.y}%) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
      opacity: transform.opacity,
      mixBlendMode: transform.blendMode as any,
      clipPath: `inset(${transform.cropTop}% ${transform.cropRight}% ${transform.cropBottom}% ${transform.cropLeft}%)`,
      zIndex: index + 10,
      cursor: dragState?.isDragging && dragState.clipId === clip.id ? 'grabbing' : 'grab',
      userSelect: 'none' as const,
    };

    const handleClipMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleMouseDown(e, clip.id, 'move');
    };

    // Handle test clips
    if (!mediaItem || clip.mediaId === "test") {
      return (
        <div
          key={clip.id}
          style={layerStyle}
          onMouseDown={handleClipMouseDown}
          className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center group"
        >
          <div className="text-center pointer-events-none">
            <div className="text-2xl">🎬</div>
            <p className="text-xs text-white">{clip.name}</p>
          </div>

          {/* Hover resize corners */}
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, clip.id, 'resize-nw'); }}></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-ne-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, clip.id, 'resize-ne'); }}></div>
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-sw-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, clip.id, 'resize-sw'); }}></div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, clip.id, 'resize-se'); }}></div>
        </div>
      );
    }

    // Render video
    if (mediaItem.type === "video") {
      return (
        <div key={clip.id} style={layerStyle} onMouseDown={handleClipMouseDown} className="group">
          <VideoPlayer
            src={mediaItem.url}
            poster={mediaItem.thumbnailUrl}
            className="w-full h-full pointer-events-none"
            clipStartTime={clip.startTime}
            trimStart={clip.trimStart}
            trimEnd={clip.trimEnd}
            clipDuration={clip.duration}
          />

          {/* Hover resize corners */}
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, clip.id, 'resize-nw'); }}></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-ne-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, clip.id, 'resize-ne'); }}></div>
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-sw-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, clip.id, 'resize-sw'); }}></div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, clip.id, 'resize-se'); }}></div>
        </div>
      );
    }

    // Render image
    if (mediaItem.type === "image") {
      return (
        <div key={clip.id} style={layerStyle} onMouseDown={handleClipMouseDown} className="group">
          <img
            src={mediaItem.url}
            alt={mediaItem.name}
            className="w-full h-full object-cover rounded pointer-events-none"
            draggable={false}
          />

          {/* Hover resize corners */}
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, clip.id, 'resize-nw'); }}></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-ne-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, clip.id, 'resize-ne'); }}></div>
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-sw-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, clip.id, 'resize-sw'); }}></div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, clip.id, 'resize-se'); }}></div>
        </div>
      );
    }

    // Render audio (visual representation)
    if (mediaItem.type === "audio") {
      return (
        <div
          key={clip.id}
          style={layerStyle}
          onMouseDown={handleClipMouseDown}
          className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center group"
        >
          <div className="text-center pointer-events-none">
            <div className="text-2xl">🎵</div>
            <p className="text-xs text-white">{mediaItem.name}</p>
          </div>

          {/* Hover resize corners */}
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, clip.id, 'resize-nw'); }}></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-ne-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, clip.id, 'resize-ne'); }}></div>
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-sw-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, clip.id, 'resize-sw'); }}></div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, clip.id, 'resize-se'); }}></div>
        </div>
      );
    }

    return null;
  };

  // Canvas size presets
  const canvasPresets = [
    { name: "16:9 HD", width: 1920, height: 1080 },
    { name: "16:9 4K", width: 3840, height: 2160 },
    { name: "9:16 Mobile", width: 1080, height: 1920 },
    { name: "1:1 Square", width: 1080, height: 1080 },
    { name: "4:3 Standard", width: 1440, height: 1080 },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Canvas Controls */}
      <div className="border-b p-2 flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Canvas:</span>
        <select
          value={`${canvasSize.width}x${canvasSize.height}`}
          onChange={(e) => {
            const preset = canvasPresets.find(p => `${p.width}x${p.height}` === e.target.value);
            if (preset) setCanvasSize({ width: preset.width, height: preset.height });
          }}
          className="bg-background border rounded px-2 py-1"
        >
          {canvasPresets.map(preset => (
            <option key={preset.name} value={`${preset.width}x${preset.height}`}>
              {preset.name} ({preset.width}×{preset.height})
            </option>
          ))}
        </select>

        <Button
          variant="outline"
          size="sm"
          onClick={toggle}
          className="ml-auto"
        >
          {isPlaying ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
          {isPlaying ? "Pause" : "Play"}
        </Button>
      </div>

      {/* Preview Area - Full Width */}
      <div className="flex-1 flex items-center justify-center p-4 bg-gray-900">
        <div
          ref={previewRef}
          className="relative overflow-hidden"
          style={{
            aspectRatio: aspectRatio.toString(),
            width: aspectRatio > 1 ? "100%" : "auto",
            height: aspectRatio <= 1 ? "100%" : "auto",
            maxWidth: "100%",
            maxHeight: "100%",
            background: '#000000',
            border: '1px solid #374151'
          }}

        >


          {/* Render all active clips as layers */}
          {activeClips.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-white/50">
              {tracks.length === 0 ? "Drop media to start editing" : "No clips at current time"}
            </div>
          ) : (
            activeClips.map((clipData, index) => renderClipLayer(clipData, index))
          )}


        </div>
      </div>

      {/* Bottom Info Panel */}
      <div className="border-t bg-background">
        {/* Layer List */}
        <div className="p-2 border-b">
          <div className="text-xs font-medium mb-2">Active Layers ({activeClips.length})</div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {activeClips.map((clipData, index) => (
              <div
                key={clipData.clip.id}
                className="flex items-center gap-2 p-1 rounded text-xs hover:bg-muted/50"
              >
                <span className="w-4 h-4 bg-muted rounded text-center text-xs leading-4">
                  {index + 1}
                </span>
                <span className="flex-1 truncate">{clipData.clip.name}</span>
                <span className="text-muted-foreground">{clipData.track.name}</span>
              </div>
            ))}
          </div>
        </div>


      </div>
    </div>
  );
}
