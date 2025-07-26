"use client";

import { useState } from "react";
import { Button } from "../../ui/button";
import {
  MoreVertical,
  Scissors,
  Trash2,
  SplitSquareHorizontal,
  Music,
  ChevronRight,
  ChevronLeft,
  Type,
  Copy,
  RefreshCw,
} from "lucide-react";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import AudioWaveform from "../audio-waveform";
import { toast } from "sonner";
import { TimelineElementProps, TrackType } from "@/types/timeline";
import { useTimelineElementResize } from "@/hooks/use-timeline-element-resize";
import {
  getTrackElementClasses,
  TIMELINE_CONSTANTS,
  getTrackHeight,
} from "@/constants/timeline-constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "../../ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../../ui/context-menu";

export function TimelineElement({
  element,
  track,
  zoomLevel,
  isSelected,
  onElementMouseDown,
  onElementClick,
}: TimelineElementProps) {
  const { mediaItems } = useMediaStore();
  const { 
    updateElement, 
    deleteElement, 
    splitElement, 
    duplicateElement,
    selectedElements,
    setSelectedElements 
  } = useTimelineStore();
  const { seek } = usePlaybackStore();

  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Get media item associated with this element
  const mediaItem = mediaItems.find(item => item.id === element.mediaId);
  
  // Calculate element dimensions
  const elementWidth = element.duration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
  const elementLeft = element.startTime * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
  const elementHeight = getTrackHeight(track.type);

  // Use resize hook for element manipulation
  const {
    isResizing,
    resizeHandles,
    handleResizeStart,
  } = useTimelineElementResize({
    element,
    onResize: (newElement) => updateElement(element.id, newElement),
  });

  // Handle element selection
  const handleElementClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (e.ctrlKey || e.metaKey) {
      // Multi-select
      if (isSelected) {
        setSelectedElements(selectedElements.filter(id => id !== element.id));
      } else {
        setSelectedElements([...selectedElements, element.id]);
      }
    } else {
      // Single select
      setSelectedElements([element.id]);
    }
    
    onElementClick?.();
  };

  // Handle element drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    
    setIsDragging(true);
    onElementMouseDown?.(e);
  };

  // Context menu actions
  const handleCutElement = () => {
    const currentTime = element.startTime + element.duration / 2; // Cut at middle
    splitElement(element.id, currentTime);
    toast.success("Element split");
  };

  const handleDeleteElement = () => {
    deleteElement(element.id);
    toast.success("Element deleted");
  };

  const handleDuplicateElement = () => {
    const duplicated = duplicateElement(element.id);
    if (duplicated) {
      toast.success("Element duplicated");
    }
  };

  const handleSeekToElement = () => {
    seek(element.startTime);
  };

  // Get element-specific styling
  const elementClasses = getTrackElementClasses(track.type, isSelected);

  // Render element content based on type
  const renderElementContent = () => {
    switch (track.type) {
      case 'video':
        return (
          <div className="flex items-center justify-between h-full px-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
              <span className="text-xs font-medium truncate">
                {mediaItem?.name || 'Video'}
              </span>
            </div>
            {elementWidth > 60 && (
              <span className="text-xs text-foreground/60 flex-shrink-0">
                {element.duration.toFixed(1)}s
              </span>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="relative h-full">
            {mediaItem && elementWidth > 40 ? (
              <AudioWaveform
                mediaItem={mediaItem}
                width={elementWidth}
                height={elementHeight - 4}
                startTime={element.trimStart || 0}
                duration={element.duration}
              />
            ) : (
              <div className="flex items-center h-full px-2">
                <Music size={12} className="text-green-500 mr-1" />
                <span className="text-xs truncate">
                  {mediaItem?.name || 'Audio'}
                </span>
              </div>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="flex items-center h-full px-2">
            <Type size={12} className="text-purple-500 mr-1" />
            <span className="text-xs truncate">
              {element.content || 'Text Element'}
            </span>
          </div>
        );

      default:
        return (
          <div className="flex items-center h-full px-2">
            <span className="text-xs truncate">Unknown Element</span>
          </div>
        );
    }
  };

  return (
    <ContextMenu onOpenChange={setIsContextMenuOpen}>
      <ContextMenuTrigger asChild>
        <div
          className={`absolute top-0 select-none cursor-pointer transition-all duration-150 ${elementClasses}`}
          style={{
            left: elementLeft,
            width: Math.max(elementWidth, 20), // Minimum width
            height: elementHeight,
            zIndex: isSelected ? 20 : 10,
          }}
          onMouseDown={handleMouseDown}
          onClick={handleElementClick}
        >
          {/* Element Content */}
          <div className="relative h-full overflow-hidden rounded border-2 border-transparent">
            {renderElementContent()}
            
            {/* Selection Indicator */}
            {isSelected && (
              <div className="absolute inset-0 border-2 border-primary rounded pointer-events-none" />
            )}

            {/* Resize Handles */}
            {isSelected && !isDragging && (
              <>
                {/* Left resize handle */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-primary/20 hover:bg-primary/40 opacity-0 hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => handleResizeStart(e, 'left')}
                />
                
                {/* Right resize handle */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-primary/20 hover:bg-primary/40 opacity-0 hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => handleResizeStart(e, 'right')}
                />
              </>
            )}

            {/* Element Menu Button */}
            {isSelected && elementWidth > 80 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical size={12} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSeekToElement}>
                    <ChevronRight size={16} className="mr-2" />
                    Go to Element
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCutElement}>
                    <Scissors size={16} className="mr-2" />
                    Split Element
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicateElement}>
                    <Copy size={16} className="mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDeleteElement}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </ContextMenuTrigger>

      {/* Context Menu */}
      <ContextMenuContent>
        <ContextMenuItem onClick={handleSeekToElement}>
          <ChevronRight size={16} className="mr-2" />
          Go to Element
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCutElement}>
          <Scissors size={16} className="mr-2" />
          Split Element
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDuplicateElement}>
          <Copy size={16} className="mr-2" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          onClick={handleDeleteElement}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 size={16} className="mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}