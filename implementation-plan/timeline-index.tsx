"use client";

import { ScrollArea } from "../../ui/scroll-area";
import { Button } from "../../ui/button";
import {
  Scissors,
  ArrowLeftToLine,
  ArrowRightToLine,
  Trash2,
  Snowflake,
  Copy,
  SplitSquareHorizontal,
  Pause,
  Play,
  Video,
  Music,
  TypeIcon,
  Magnet,
  Link,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

// Import statements for stores, components, and utilities
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useProjectStore } from "@/stores/project-store";
import { TimelineTrackContent } from "./timeline-track";
import { TimelinePlayhead } from "./timeline-playhead";
import { TimelineToolbar } from "./timeline-toolbar";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { useRef, useState, useEffect } from "react";

export function Timeline() {
  // Store hooks for state management
  const {
    tracks,
    getTotalDuration,
    clearSelectedElements,
    selectedElements,
    addTrack,
    addElement,
    updateElement,
    deleteElement,
    splitElement,
    copyElements,
    pasteElements,
  } = useTimelineStore();

  const { mediaItems, addMediaItem } = useMediaStore();
  const { 
    currentTime, 
    duration, 
    isPlaying, 
    play, 
    pause, 
    seek 
  } = usePlaybackStore();
  
  const { currentProject, updateProject } = useProjectStore();

  // Refs for timeline elements and scroll management
  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const rulerScrollRef = useRef<HTMLDivElement>(null);
  const tracksScrollRef = useRef<HTMLDivElement>(null);
  const trackLabelsRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);

  // State for zoom level and interactions
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSnappingEnabled, setIsSnappingEnabled] = useState(true);
  const [selectedTool, setSelectedTool] = useState<'select' | 'cut' | 'text'>('select');

  // Calculate total duration from tracks or use playback duration
  const totalDuration = getTotalDuration() || duration || 0;

  // Dynamic timeline width calculation based on content and zoom
  const dynamicTimelineWidth = Math.max(
    (totalDuration || 0) * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel,
    (currentTime + 30) * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel,
    timelineRef.current?.clientWidth || 1000
  );

  // Scroll synchronization between ruler and tracks
  const handleRulerScroll = () => {
    if (rulerScrollRef.current && tracksScrollRef.current) {
      tracksScrollRef.current.scrollLeft = rulerScrollRef.current.scrollLeft;
    }
  };

  const handleTracksScroll = () => {
    if (tracksScrollRef.current && rulerScrollRef.current) {
      rulerScrollRef.current.scrollLeft = tracksScrollRef.current.scrollLeft;
    }
  };

  // Drag and drop handling for media files
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    
    const files = Array.from(e.dataTransfer.files);
    const dropX = e.clientX;
    const dropY = e.clientY;
    
    // Calculate drop position in timeline
    const timelineRect = timelineRef.current?.getBoundingClientRect();
    if (!timelineRect) return;
    
    const relativeX = dropX - timelineRect.left;
    const scrollLeft = tracksScrollRef.current?.scrollLeft || 0;
    const timePosition = (relativeX + scrollLeft) / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel);
    
    // Process dropped files
    for (const file of files) {
      try {
        // Add media item to store
        const mediaItem = await addMediaItem(file);
        
        // Determine appropriate track based on file type
        const trackType = file.type.startsWith('video/') ? 'video' : 
                         file.type.startsWith('audio/') ? 'audio' : 'video';
        
        // Find or create appropriate track
        let targetTrack = tracks.find(track => track.type === trackType && track.elements.length === 0);
        if (!targetTrack) {
          targetTrack = addTrack(trackType);
        }
        
        // Create timeline element
        const newElement = {
          id: `element_${Date.now()}`,
          type: trackType,
          mediaId: mediaItem.id,
          startTime: Math.max(0, timePosition),
          duration: mediaItem.duration || 10, // Default duration
          trackId: targetTrack.id,
        };
        
        addElement(newElement);
        
      } catch (error) {
        console.error('Error processing dropped file:', error);
        toast.error(`Failed to process ${file.name}`);
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't handle shortcuts when typing
      }
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          isPlaying ? pause() : play();
          break;
        case 'c':
          if (e.ctrlKey || e.metaKey) {
            copyElements(selectedElements);
          } else if (selectedTool !== 'cut') {
            setSelectedTool('cut');
          }
          break;
        case 'v':
          if (e.ctrlKey || e.metaKey) {
            pasteElements(currentTime);
          }
          break;
        case 'Delete':
          if (selectedElements.length > 0) {
            selectedElements.forEach(elementId => deleteElement(elementId));
            clearSelectedElements();
          }
          break;
        case 'Escape':
          clearSelectedElements();
          setSelectedTool('select');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedElements, currentTime, isPlaying, selectedTool]);

  // Render timeline ruler with time markers
  const renderRuler = () => {
    const rulerWidth = dynamicTimelineWidth;
    const majorTickInterval = Math.max(1, Math.floor(10 / zoomLevel)); // Adjust based on zoom
    const minorTickInterval = majorTickInterval / 5;
    
    const ticks = [];
    for (let time = 0; time <= totalDuration + 30; time += minorTickInterval) {
      const left = time * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
      const isMajorTick = time % majorTickInterval === 0;
      
      ticks.push(
        <div
          key={time}
          className={`absolute top-0 ${isMajorTick ? 'h-4 bg-foreground' : 'h-2 bg-foreground/50'} w-px`}
          style={{ left }}
        >
          {isMajorTick && (
            <span className="absolute top-4 left-1 text-xs text-foreground/70 whitespace-nowrap">
              {Math.floor(time / 60)}:{(time % 60).toFixed(0).padStart(2, '0')}
            </span>
          )}
        </div>
      );
    }
    
    return (
      <div className="relative bg-background border-b" style={{ width: rulerWidth, height: TIMELINE_CONSTANTS.RULER_HEIGHT }}>
        {ticks}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col transition-colors duration-200 relative bg-panel rounded-sm overflow-hidden">
      {/* Timeline Toolbar */}
      <TimelineToolbar 
        zoomLevel={zoomLevel} 
        setZoomLevel={setZoomLevel}
        selectedTool={selectedTool}
        setSelectedTool={setSelectedTool}
        isSnappingEnabled={isSnappingEnabled}
        setIsSnappingEnabled={setIsSnappingEnabled}
      />
      
      {/* Main Timeline Container */}
      <div ref={timelineRef} className="flex-1 flex flex-col relative overflow-hidden">
        {/* Ruler */}
        <div className="relative">
          <ScrollArea
            ref={rulerScrollRef}
            className="w-full"
            onScroll={handleRulerScroll}
          >
            {renderRuler()}
          </ScrollArea>
        </div>

        {/* Tracks Container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Track Labels */}
          <div ref={trackLabelsRef} className="w-40 bg-background border-r overflow-y-auto">
            {tracks.map((track, index) => (
              <div
                key={track.id}
                className="h-16 flex items-center px-4 border-b border-border/20 bg-background/50"
              >
                <div className="flex items-center gap-2">
                  {track.type === 'video' && <Video size={16} />}
                  {track.type === 'audio' && <Music size={16} />}
                  {track.type === 'text' && <TypeIcon size={16} />}
                  <span className="text-sm font-medium">Track {index + 1}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline Tracks */}
          <div className="flex-1 relative">
            <ScrollArea
              ref={tracksScrollRef}
              className="h-full w-full"
              onScroll={handleTracksScroll}
            >
              <div
                className="relative"
                style={{ width: dynamicTimelineWidth }}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                {tracks.map((track) => (
                  <TimelineTrackContent
                    key={track.id}
                    track={track}
                    zoomLevel={zoomLevel}
                  />
                ))}
                
                {/* Timeline Playhead */}
                <TimelinePlayhead
                  currentTime={currentTime}
                  duration={totalDuration}
                  zoomLevel={zoomLevel}
                  tracks={tracks}
                  seek={seek}
                  rulerRef={rulerRef}
                  rulerScrollRef={rulerScrollRef}
                  tracksScrollRef={tracksScrollRef}
                  trackLabelsRef={trackLabelsRef}
                  timelineRef={timelineRef}
                  playheadRef={playheadRef}
                />
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}