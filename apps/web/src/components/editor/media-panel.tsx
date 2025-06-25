"use client";

import { Button } from "../ui/button";
import { AspectRatio } from "../ui/aspect-ratio";
import { DragOverlay } from "../ui/drag-overlay";
import { useMediaStore } from "@/stores/media-store";
import { processMediaFiles } from "@/lib/media-processing";
import { Plus, Image, Video, Music, Trash2, Upload } from "lucide-react";
import { useDragDrop } from "@/hooks/use-drag-drop";
import { useCallback, useRef, useState, useMemo, memo } from "react";
import { toast } from "sonner";

// Types for better type safety
interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio' | 'unknown';
  name: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  aspectRatio: number;
}

type MediaFilter = 'all' | 'video' | 'audio' | 'image';

interface MediaPreviewProps {
  item: MediaItem;
  onDragStart: (e: React.DragEvent, item: MediaItem) => void;
}

// Memoized media preview component to prevent unnecessary re-renders
const MediaPreview = memo<MediaPreviewProps>(({ item, onDragStart }) => {
  const formatDuration = useCallback((duration: number): string => {
    const min = Math.floor(duration / 60);
    const sec = Math.floor(duration % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }, []);

  const baseDragProps = useMemo(() => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => onDragStart(e, item),
  }), [item, onDragStart]);

  const renderContent = useMemo(() => {
    switch (item.type) {
      case "image":
        return (
          <img
            src={item.url}
            alt={item.name}
            className="w-full h-full object-cover rounded cursor-grab active:cursor-grabbing"
            loading="lazy"
            onError={(e) => {
              // Fallback for broken images
              e.currentTarget.style.display = 'none';
            }}
            {...baseDragProps}
          />
        );

      case "video":
        if (item.thumbnailUrl) {
          return (
            <div
              className="relative w-full h-full cursor-grab active:cursor-grabbing"
              {...baseDragProps}
            >
              <img
                src={item.thumbnailUrl}
                alt={item.name}
                className="w-full h-full object-cover rounded"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJtMTUgMTAtNS0zdjZ6IiBmaWxsPSJjdXJyZW50Q29sb3IiLz48L3N2Zz4=';
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded">
                <Video className="h-6 w-6 text-white drop-shadow-md" />
              </div>
              {item.duration && (
                <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                  {formatDuration(item.duration)}
                </div>
              )}
            </div>
          );
        }
        return (
          <div
            className="w-full h-full bg-muted/30 flex flex-col items-center justify-center text-muted-foreground rounded cursor-grab active:cursor-grabbing"
            {...baseDragProps}
          >
            <Video className="h-6 w-6 mb-1" />
            <span className="text-xs">Video</span>
            {item.duration && (
              <span className="text-xs opacity-70">
                {formatDuration(item.duration)}
              </span>
            )}
          </div>
        );

      case "audio":
        return (
          <div
            className="w-full h-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex flex-col items-center justify-center text-muted-foreground rounded border border-green-500/20 cursor-grab active:cursor-grabbing"
            {...baseDragProps}
          >
            <Music className="h-6 w-6 mb-1" />
            <span className="text-xs">Audio</span>
            {item.duration && (
              <span className="text-xs opacity-70">
                {formatDuration(item.duration)}
              </span>
            )}
          </div>
        );

      default:
        return (
          <div
            className="w-full h-full bg-muted/30 flex flex-col items-center justify-center text-muted-foreground rounded cursor-grab active:cursor-grabbing"
            {...baseDragProps}
          >
            <Image className="h-6 w-6" />
            <span className="text-xs mt-1">Unknown</span>
          </div>
        );
    }
  }, [item, baseDragProps, formatDuration]);

  return renderContent;
});

MediaPreview.displayName = 'MediaPreview';

// Memoized media item component
const MediaItemComponent = memo<{
  item: MediaItem;
  onRemove: (id: string) => void;
  onDragStart: (e: React.DragEvent, item: MediaItem) => void;
}>(({ item, onRemove, onDragStart }) => {
  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(item.id);
  }, [item.id, onRemove]);

  return (
    <div className="relative group">
      <Button
        variant="outline"
        className="flex flex-col gap-2 p-2 h-auto w-full relative"
      >
        <AspectRatio ratio={item.aspectRatio || 16/9}>
          <MediaPreview item={item} onDragStart={onDragStart} />
        </AspectRatio>
        <span className="text-xs truncate px-1" title={item.name}>
          {item.name}
        </span>
      </Button>

      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="destructive"
          size="icon"
          className="h-6 w-6"
          onClick={handleRemove}
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
});

MediaItemComponent.displayName = 'MediaItemComponent';

export function MediaPanel() {
  const { mediaItems, addMediaItem, removeMediaItem } = useMediaStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");

  // Memoized filtered media items - much more efficient than useEffect + useState
  const filteredMediaItems = useMemo(() => {
    if (!mediaItems.length) return [];
    
    return mediaItems.filter((item) => {
      // Filter by type
      if (mediaFilter !== 'all' && item.type !== mediaFilter) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [mediaItems, mediaFilter, searchQuery]);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    if (!files?.length) return;

    setIsProcessing(true);
    try {
      const items = await processMediaFiles(files);
      items.forEach((item) => {
        addMediaItem(item);
      });
      toast.success(`Successfully added ${items.length} media item${items.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error("File processing failed:", error);
      toast.error("Failed to process files. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [addMediaItem]);

  const { isDragOver, dragProps } = useDragDrop({
    onDrop: processFiles,
  });

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    e.target.value = ""; // Reset input
  }, [processFiles]);

  const handleRemove = useCallback((id: string) => {
    removeMediaItem(id);
    toast.success("Media item removed");
  }, [removeMediaItem]);

  const handleDragStart = useCallback((e: React.DragEvent, item: MediaItem) => {
    try {
      e.dataTransfer.setData(
        "application/x-media-item",
        JSON.stringify({
          id: item.id,
          type: item.type,
          name: item.name,
        })
      );
      e.dataTransfer.effectAllowed = "copy";
    } catch (error) {
      console.error("Failed to set drag data:", error);
      toast.error("Failed to start drag operation");
    }
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setMediaFilter(e.target.value as MediaFilter);
  }, []);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload media files"
      />

      <div
        className={`h-full flex flex-col transition-colors relative ${isDragOver ? "bg-accent/30" : ""}`}
        {...dragProps}
      >
        <DragOverlay isVisible={isDragOver} />

        <div className="p-2 border-b">
          <div className="flex gap-2">
            <select
              value={mediaFilter}
              onChange={handleFilterChange}
              className="px-2 py-1 text-xs border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Filter media by type"
            >
              <option value="all">All ({mediaItems.length})</option>
              <option value="video">Video ({mediaItems.filter(i => i.type === 'video').length})</option>
              <option value="audio">Audio ({mediaItems.filter(i => i.type === 'audio').length})</option>
              <option value="image">Image ({mediaItems.filter(i => i.type === 'image').length})</option>
            </select>
            
            <input
              type="text"
              placeholder="Search media..."
              className="min-w-[60px] flex-1 px-2 py-1 text-xs border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Search media items"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={handleFileSelect}
              disabled={isProcessing}
              className="flex-none min-w-[80px] whitespace-nowrap"
              aria-label="Add media files"
            >
              {isProcessing ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredMediaItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center h-full">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <Image className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {mediaItems.length === 0 ? "No media in project" : "No media matches your search"}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {mediaItems.length === 0 
                  ? "Drag files here or use the button above" 
                  : "Try adjusting your search or filter"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredMediaItems.map((item) => (
                <MediaItemComponent
                  key={item.id}
                  item={item}
                  onRemove={handleRemove}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
