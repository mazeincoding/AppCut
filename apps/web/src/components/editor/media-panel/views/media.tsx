"use client";

import { useDragDrop } from "@/hooks/use-drag-drop";
import { processMediaFiles } from "@/lib/media-processing";
import { useMediaStore, type MediaItem } from "@/stores/media-store";
import {
  Image,
  Loader2,
  Music,
  Plus,
  Video,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MediaDragOverlay } from "@/components/editor/media-panel/drag-overlay";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DraggableMediaItem } from "@/components/ui/draggable-item";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";

export function MediaView() {
  const { mediaItems, addMediaItem, removeMediaItem } = useMediaStore();
  const { activeProject } = useProjectStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaFilter, setMediaFilter] = useState("all");
  // Get media size from localStorage or default to 3
  const [mediaSize, setMediaSize] = useState(() => {
    const stored = localStorage.getItem("mediaSize");
    const parsed = parseInt(stored ?? "", 10);
    return !isNaN(parsed) && parsed >= 1 && parsed <= 5 ? parsed : 3;
  });

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    if (!activeProject) {
      toast.error("No active project");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    try {
      // Process files (extract metadata, generate thumbnails, etc.)
      const processedItems = await processMediaFiles(files, (p) =>
        setProgress(p)
      );
      // Add each processed media item to the store
      for (const item of processedItems) {
        await addMediaItem(activeProject.id, item);
      }
    } catch (error) {
      // Show error toast if processing fails
      console.error("Error processing files:", error);
      toast.error("Failed to process files");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleMediaSizeChange = (size: number) => {
    setMediaSize(size);
    localStorage.setItem("mediaSize", size.toString());
  };

  const handleSizeIncrease = () => {
    handleMediaSizeChange(Math.min(5, mediaSize + 1));
  };

  const handleSizeDecrease = () => {
    handleMediaSizeChange(Math.max(1, mediaSize - 1));
  };

  const handleSizeSliderChange = (values: number[]) => {
    handleMediaSizeChange(values[0]);
  };

  const { isDragOver, dragProps } = useDragDrop({
    // When files are dropped, process them
    onDrop: processFiles,
  });

  const handleFileSelect = () => fileInputRef.current?.click(); // Open file picker

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // When files are selected via file picker, process them
    if (e.target.files) processFiles(e.target.files);
    e.target.value = ""; // Reset input
  };

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    // Remove a media item from the store
    e.stopPropagation();

    if (!activeProject) {
      toast.error("No active project");
      return;
    }

    // Media store now handles cascade deletion automatically
    await removeMediaItem(activeProject.id, id);
  };

  const formatDuration = (duration: number) => {
    // Format seconds as mm:ss
    const min = Math.floor(duration / 60);
    const sec = Math.floor(duration % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  // Map size levels (1-5) to appropriate grid item widths
  const getGridItemWidth = (size: number) => {
    const sizeMap = {
      1: 90,
      2: 120,
      3: 160,
      4: 190,
      5: 220,
    };
    return sizeMap[size as keyof typeof sizeMap] || 120;
  };

  const [filteredMediaItems, setFilteredMediaItems] = useState(mediaItems);

  useEffect(() => {
    const filtered = mediaItems.filter((item) => {
      if (mediaFilter && mediaFilter !== "all" && item.type !== mediaFilter) {
        return false;
      }

      if (
        searchQuery &&
        !item.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      return true;
    });

    setFilteredMediaItems(filtered);
  }, [mediaItems, mediaFilter, searchQuery]);

  const renderPreview = (item: MediaItem) => {
    // Render a preview for each media type (image, video, audio, unknown)
    if (item.type === "image") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={item.url}
            alt={item.name}
            className="max-w-full max-h-full object-contain"
            loading="lazy"
          />
        </div>
      );
    }

    if (item.type === "video") {
      if (item.thumbnailUrl) {
        return (
          <div className="relative w-full h-full">
            <img
              src={item.thumbnailUrl}
              alt={item.name}
              className="w-full h-full object-cover rounded"
              loading="lazy"
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
        <div className="w-full h-full bg-muted/30 flex flex-col items-center justify-center text-muted-foreground rounded">
          <Video className="h-6 w-6 mb-1" />
          <span className="text-xs">Video</span>
          {item.duration && (
            <span className="text-xs opacity-70">
              {formatDuration(item.duration)}
            </span>
          )}
        </div>
      );
    }

    if (item.type === "audio") {
      return (
        <div className="w-full h-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex flex-col items-center justify-center text-muted-foreground rounded border border-green-500/20">
          <Music className="h-6 w-6 mb-1" />
          <span className="text-xs">Audio</span>
          {item.duration && (
            <span className="text-xs opacity-70">
              {formatDuration(item.duration)}
            </span>
          )}
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-muted/30 flex flex-col items-center justify-center text-muted-foreground rounded">
        <Image className="h-6 w-6" />
        <span className="text-xs mt-1">Unknown</span>
      </div>
    );
  };

  return (
    <>
      {/* Hidden file input for uploading media */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        className={`h-full flex flex-col gap-1 transition-colors relative ${isDragOver ? "bg-accent/30" : ""}`}
        {...dragProps}
      >
        <div className="p-3 pb-2 bg-panel flex justify-between">
          {/* Search and filter controls */}
          <div className="flex gap-2">
            <Select value={mediaFilter} onValueChange={setMediaFilter}>
              <SelectTrigger className="w-[80px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="image">Image</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="text"
              placeholder="Search media..."
              className="min-w-[60px] flex-1 h-9 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button
              variant="outline"
              size="lg"
              onClick={handleFileSelect}
              disabled={isProcessing}
              className="flex-none bg-transparent min-w-[30px] whitespace-nowrap overflow-hidden px-2 justify-center items-center h-9"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="text" size="icon" onClick={handleSizeDecrease}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Slider
              className="w-16"
              value={[mediaSize]}
              onValueChange={handleSizeSliderChange}
              min={1}
              max={5}
              step={1}
            />
            <Button variant="text" size="icon" onClick={handleSizeIncrease}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-full">
          <div className="flex-1 p-3 pt-0">
            {isDragOver || filteredMediaItems.length === 0 ? (
              <MediaDragOverlay
                isVisible={true}
                isProcessing={isProcessing}
                progress={progress}
                onClick={handleFileSelect}
                isEmptyState={filteredMediaItems.length === 0 && !isDragOver}
              />
            ) : (
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, ${getGridItemWidth(mediaSize)}px)`,
                }}
              >
                {/* Render each media item as a draggable button */}
                {filteredMediaItems.map((item) => (
                  <ContextMenu key={item.id}>
                    <ContextMenuTrigger>
                      <DraggableMediaItem
                        size={mediaSize}
                        name={item.name}
                        preview={renderPreview(item)}
                        dragData={{
                          id: item.id,
                          type: item.type,
                          name: item.name,
                        }}
                        showPlusOnDrag={false}
                        onAddToTimeline={(currentTime) =>
                          useTimelineStore
                            .getState()
                            .addMediaAtTime(item, currentTime)
                        }
                        rounded={false}
                      />
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem>Export clips</ContextMenuItem>
                      <ContextMenuItem
                        variant="destructive"
                        onClick={(e) => handleRemove(e, item.id)}
                      >
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
