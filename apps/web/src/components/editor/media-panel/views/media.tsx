"use client";

import { useDragDrop } from "@/hooks/use-drag-drop";
import { processMediaFiles } from "@/lib/media-processing";
import { useMediaStore, type MediaItem } from "@/stores/media-store";
import { Image, Loader2, Music, Plus, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

export function MediaView() {
  const { mediaItems, addMediaItem, removeMediaItem } = useMediaStore();
  const { activeProject } = useProjectStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaFilter, setMediaFilter] = useState("all");

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

  const formatFileSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
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
    // Enhanced preview rendering with better error handling and tooltip info display
    if (item.type === "image") {
      return (
        <Tooltip delayDuration={1000}>
          <TooltipTrigger asChild>
            <div className="relative w-full h-full">
              <img
                src={item.url}
                alt={item.name}
                className="w-full h-full object-contain rounded"
                loading="lazy"
                onError={(e) => {
                  // Handle broken images
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                <span className="font-medium">{item.name}</span>
              </div>
              <div className="text-xs space-y-1">
                <div>Size: {formatFileSize(item.file.size)}</div>
                {item.width && item.height && (
                  <div>
                    Dimensions: {item.width} × {item.height}
                  </div>
                )}
                <div>Type: {item.type.toUpperCase()}</div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (item.type === "video") {
      return (
        <Tooltip delayDuration={1000}>
          <TooltipTrigger asChild>
            <div className="relative w-full h-full">
              {item.thumbnailUrl ? (
                <>
                  <img
                    src={item.thumbnailUrl}
                    alt={item.name}
                    className="w-full h-full object-cover rounded"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to placeholder if thumbnail fails
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  {/* Video play indicator */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded">
                    <div className="bg-white/90 rounded-full p-2">
                      <Video className="h-4 w-4 text-black" />
                    </div>
                  </div>
                  {/* Duration badge */}
                  {item.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded font-mono">
                      {formatDuration(item.duration)}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-muted/30 flex flex-col items-center justify-center text-muted-foreground rounded">
                  <Video className="h-6 w-6 mb-1" />
                  <span className="text-xs">Video</span>
                  {item.duration && (
                    <span className="text-xs opacity-70">
                      {formatDuration(item.duration)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                <span className="font-medium">{item.name}</span>
              </div>
              <div className="text-xs space-y-1">
                <div>Size: {formatFileSize(item.file.size)}</div>
                {item.width && item.height && (
                  <div>
                    Dimensions: {item.width} × {item.height}
                  </div>
                )}
                {item.duration && (
                  <div>Duration: {formatDuration(item.duration)}</div>
                )}
                {item.fps && <div>Frame Rate: {item.fps} FPS</div>}
                <div>Type: {item.type.toUpperCase()}</div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (item.type === "audio") {
      return (
        <Tooltip delayDuration={1000}>
          <TooltipTrigger asChild>
            <div className="w-full h-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex flex-col items-center justify-center text-muted-foreground rounded border border-green-500/20">
              <Music className="h-6 w-6 mb-1" />
              <span className="text-xs text-center px-1 font-medium truncate w-full">
                {item.name}
              </span>
              {item.duration && (
                <span className="text-xs opacity-70 font-mono">
                  {formatDuration(item.duration)}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                <span className="font-medium">{item.name}</span>
              </div>
              <div className="text-xs space-y-1">
                <div>Size: {formatFileSize(item.file.size)}</div>
                {item.duration && (
                  <div>Duration: {formatDuration(item.duration)}</div>
                )}
                <div>Type: {item.type.toUpperCase()}</div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
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
    <TooltipProvider>
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
        <div className="p-3 pb-2">
          {/* Search and filter controls */}
          <div className="flex gap-2 mb-3">
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

          {/* Media count and info */}
          {filteredMediaItems.length > 0 && (
            <div className="text-xs text-muted-foreground mb-3 flex justify-between items-center">
              <span>
                {filteredMediaItems.length} item
                {filteredMediaItems.length !== 1 ? "s" : ""}
                {mediaFilter !== "all" && ` (${mediaFilter})`}
              </span>
              <span className="text-[10px]">
                {formatFileSize(
                  filteredMediaItems.reduce(
                    (total, item) => total + item.file.size,
                    0
                  )
                )}{" "}
                total
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 pt-0">
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
              className="grid gap-2"
              style={{
                gridTemplateColumns: "repeat(auto-fill, 160px)",
              }}
            >
              {/* Render each media item as a draggable button */}
              {filteredMediaItems.map((item) => (
                <ContextMenu key={item.id}>
                  <ContextMenuTrigger>
                    <DraggableMediaItem
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
                    <ContextMenuItem
                      onClick={() => {
                        useTimelineStore.getState().addMediaAtTime(item, 0);
                      }}
                    >
                      Add to Timeline
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        // Copy media info to clipboard
                        const info = `Name: ${item.name}\nType: ${item.type}\nSize: ${formatFileSize(item.file.size)}${item.duration ? `\nDuration: ${formatDuration(item.duration)}` : ""}${item.width && item.height ? `\nDimensions: ${item.width}×${item.height}` : ""}`;
                        navigator.clipboard.writeText(info);
                        toast.success("Media info copied to clipboard");
                      }}
                    >
                      Copy Info
                    </ContextMenuItem>
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
      </div>
    </TooltipProvider>
  );
}
