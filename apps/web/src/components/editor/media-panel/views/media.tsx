"use client";

import { useDragDrop } from "@/hooks/use-drag-drop";
import { processMediaFiles } from "@/lib/media-processing";
import { useMediaStore, type MediaItem } from "@/stores/media-store";
import { Image, Music, Plus, Upload, Video, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DragOverlay } from "@/components/ui/drag-overlay";
import { debugLogger } from "@/lib/debug-logger";
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
import { useAdjustmentStore } from "@/stores/adjustment-store";
import { useMediaPanelStore } from "../store";
import { ExportAllButton } from "../export-all-button";

// Enhanced video preview component with hover scrubbing
const EnhancedVideoPreview = ({ item }: { item: MediaItem }) => {
  const [currentThumbnail, setCurrentThumbnail] = useState(item.thumbnailUrl);
  const [isHovering, setIsHovering] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);
  const { getThumbnailAtTime, generateEnhancedThumbnails } = useMediaStore();

  // Handle thumbnail scrubbing on hover
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isHovering || !item.duration || !item.thumbnails) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    const timestamp = position * item.duration;
    
    const thumbnail = getThumbnailAtTime(item.id, timestamp);
    if (thumbnail) {
      setCurrentThumbnail(thumbnail);
      setScrubPosition(position);
    }
  };

  // Reset to primary thumbnail when not hovering
  const handleMouseLeave = () => {
    setIsHovering(false);
    setCurrentThumbnail(item.thumbnailUrl);
    setScrubPosition(0);
  };

  // Generate enhanced thumbnails if not available
  useEffect(() => {
    if (item.type === 'video' && !item.thumbnails && !item.thumbnailError) {
      generateEnhancedThumbnails(item.id, {
        resolution: 'medium',
        sceneDetection: true
      });
    }
  }, [item.id, item.type, item.thumbnails, item.thumbnailError, generateEnhancedThumbnails]);

  if (item.thumbnailError) {
    return (
      <div className="relative w-full h-full bg-muted flex items-center justify-center rounded">
        <Video className="h-8 w-8 text-muted-foreground" />
        <div className="absolute bottom-1 left-1 text-xs text-red-500">
          Thumbnail failed
        </div>
      </div>
    );
  }

  if (!item.thumbnailUrl) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex flex-col items-center justify-center text-white rounded border border-blue-500/20">
        <Video className="h-8 w-8 mb-1 drop-shadow-sm" />
        <span className="text-xs font-medium">Video</span>
        {item.duration && (
          <span className="text-xs opacity-80 bg-black/30 px-1 rounded mt-1">
            {formatDuration(item.duration)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-full cursor-pointer group"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Enhanced thumbnail display */}
      <img 
        src={currentThumbnail || item.thumbnailUrl} 
        className="w-full h-full object-cover rounded transition-all duration-150" 
        alt={`Thumbnail for ${item.name}`}
        loading="lazy"
      />
      
      {/* Existing gradient and video icon */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-transparent rounded"></div>
      <div className="absolute top-1 right-1">
        <Video className="h-4 w-4 text-white drop-shadow-md bg-black/50 rounded p-0.5" />
      </div>
      
      {/* Enhanced duration badge */}
      {item.duration && (
        <div className="absolute bottom-1 right-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
          {formatDuration(item.duration)}
        </div>
      )}
      
      {/* File name */}
      <div className="absolute bottom-1 left-1 text-white text-xs font-medium drop-shadow-sm bg-black/50 px-1.5 py-0.5 rounded truncate max-w-[80%]">
        {item.name.replace(/\.[^/.]+$/, '')}
      </div>
      
      {/* NEW: Scrub position indicator */}
      {isHovering && item.thumbnails && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
          <div 
            className="h-full bg-white/80 transition-all duration-75"
            style={{ width: `${scrubPosition * 100}%` }}
          />
        </div>
      )}
      
      {/* NEW: Quality indicator */}
      {item.thumbnailMetadata?.sceneDetected && (
        <div className="absolute top-1 left-1 bg-green-500/80 text-white text-xs px-1 py-0.5 rounded">
          HD
        </div>
      )}
      
      {/* NEW: Multiple thumbnails indicator */}
      {item.thumbnails && item.thumbnails.length > 1 && (
        <div className="absolute top-8 left-1 bg-blue-500/80 text-white text-xs px-1 py-0.5 rounded">
          {item.thumbnails.length}
        </div>
      )}
    </div>
  );
};

// Helper function for formatting duration
const formatDuration = (duration: number) => {
  // Format seconds as mm:ss
  const min = Math.floor(duration / 60);
  const sec = Math.floor(duration % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
};

// Thumbnail quality controls component
const ThumbnailControls = () => {
  const { mediaItems, generateEnhancedThumbnails, clearThumbnailCache } = useMediaStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRegenerateAll = async (quality: 'low' | 'medium' | 'high') => {
    setIsGenerating(true);
    const videoItems = mediaItems.filter(item => item.type === 'video');
    
    for (const item of videoItems) {
      await generateEnhancedThumbnails(item.id, {
        resolution: quality,
        sceneDetection: true,
        timestamps: quality === 'high' ? [1, 5, 10, 15, 20] : [1, 5, 10]
      });
    }
    
    setIsGenerating(false);
  };

  if (!mediaItems.some(item => item.type === 'video')) {
    return null;
  }

  return (
    <div className="flex gap-2 mb-2 p-2 bg-muted rounded-lg">
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleRegenerateAll('low')}
          disabled={isGenerating}
          className="!border-transparent !bg-transparent hover:!bg-transparent"
        >
          {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Low'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleRegenerateAll('medium')}
          disabled={isGenerating}
          className="!border-transparent !bg-transparent hover:!bg-transparent"
        >
          Medium
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleRegenerateAll('high')}
          disabled={isGenerating}
          className="!border-transparent !bg-transparent hover:!bg-transparent"
        >
          High
        </Button>
      </div>
      
      <Button
        size="sm"
        variant="outline"
        onClick={clearThumbnailCache}
        className="!border-transparent !bg-transparent hover:!bg-transparent"
      >
        Clear Cache
      </Button>
    </div>
  );
};

export function MediaView() {
  const { mediaItems, addMediaItem, removeMediaItem, generateEnhancedThumbnails, getThumbnailAtTime, clearThumbnailCache } = useMediaStore();
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
        
        // Generate enhanced thumbnails for videos in the background
        if (item.type === 'video') {
          // Get the newly added item with its ID
          const addedItem = useMediaStore.getState().mediaItems.find(
            media => media.file === item.file && media.name === item.name
          );
          if (addedItem) {
            generateEnhancedThumbnails(addedItem.id, {
              resolution: 'medium',
              sceneDetection: true
            });
          }
        }
      }
    } catch (error) {
      // Show error toast if processing fails
      debugLogger.log('MediaView', 'FILE_PROCESSING_ERROR', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
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
      return <EnhancedVideoPreview item={item} />;
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
        className={`h-full flex flex-col gap-1 transition-colors relative border-panel-primary rounded-sm ${isDragOver ? "bg-accent/30" : ""}`}
        {...dragProps}
      >
        {/* Show overlay when dragging files over the panel */}
        <DragOverlay isVisible={isDragOver} />

        {/* Thumbnail quality controls */}
        <ThumbnailControls />

        <div className="px-3 pt-1 pb-2">
          {/* Button to add/upload media */}
          <div className="flex gap-2">
            {/* Search and filter controls */}
            <Select value={mediaFilter} onValueChange={setMediaFilter}>
              <SelectTrigger className="w-[80px] h-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="image">Image</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="text"
              placeholder="Search media..."
              className="min-w-[60px] flex-1 h-full text-xs border-subtle"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Export All button */}
            <ExportAllButton variant="outline" size="sm" />

            {/* Add media button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleFileSelect}
              disabled={isProcessing}
              className="flex-none bg-transparent min-w-[30px] whitespace-nowrap overflow-hidden px-2 justify-center items-center !border-transparent"
            >
              {isProcessing ? (
                <>
                  <Upload className="h-4 w-4 animate-spin" />
                  <span className="hidden md:inline ml-2">{progress}%</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2" aria-label="Add file">
                    Add
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 pt-0">
          {/* Show message if no media, otherwise show media grid */}
          {filteredMediaItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center h-full">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <Image className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No media in project
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Drag files here or use the button above
              </p>
            </div>
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
                      rounded={false}
                    />
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    {item.type === 'image' && (
                      <ContextMenuItem
                        onClick={() => {
                          // Navigate to adjustment tab and load the image
                          const mediaStore = useMediaStore.getState();
                          const adjustmentStore = useAdjustmentStore.getState();
                          const mediaPanelStore = useMediaPanelStore.getState();
                          
                          // Set the image in adjustment store
                          const imageUrl = item.url && item.url.startsWith('blob:') 
                            ? item.url 
                            : item.file ? URL.createObjectURL(item.file) : '';
                          if (item.file && imageUrl) {
                            adjustmentStore.setOriginalImage(item.file, imageUrl);
                          }
                          
                          // Navigate to adjustment tab
                          mediaPanelStore.setActiveTab('adjustment');
                        }}
                      >
                        Edit Image
                      </ContextMenuItem>
                    )}
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
    </>
  );
}
