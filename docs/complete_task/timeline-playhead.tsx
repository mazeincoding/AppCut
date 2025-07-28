"use client";

import { useRef } from "react";
import { TimelineTrack } from "@/types/timeline";
import {
 TIMELINE_CONSTANTS,
 getTotalTracksHeight,
} from "@/constants/timeline-constants";
import { useTimelinePlayhead } from "@/hooks/use-timeline-playhead";

interface TimelinePlayheadProps {
 currentTime: number;
 duration: number;
 zoomLevel: number;
 tracks: TimelineTrack[];
 seek: (time: number) => void;
 rulerRef: React.RefObject<HTMLDivElement>;
 rulerScrollRef: React.RefObject<HTMLDivElement>;
 tracksScrollRef: React.RefObject<HTMLDivElement>;
 trackLabelsRef?: React.RefObject<HTMLDivElement>;
 timelineRef: React.RefObject<HTMLDivElement>;
 playheadRef?: React.RefObject<HTMLDivElement>;
 isSnappingToPlayhead?: boolean;
}

export function TimelinePlayhead({
 currentTime,
 duration,
 zoomLevel,
 tracks,
 seek,
 rulerRef,
 rulerScrollRef,
 tracksScrollRef,
 trackLabelsRef,
 timelineRef,
 playheadRef: externalPlayheadRef,
 isSnappingToPlayhead = false,
}: TimelinePlayheadProps) {
 const internalPlayheadRef = useRef<HTMLDivElement>(null);
 const playheadRef = externalPlayheadRef || internalPlayheadRef;
 
 const { playheadPosition, handlePlayheadMouseDown } = useTimelinePlayhead({
   currentTime,
   duration,
   zoomLevel,
   seek,
   rulerRef,
   rulerScrollRef,
   tracksScrollRef,
   playheadRef,
 });

 // Use timeline container height minus a few pixels for breathing room
 const timelineContainerHeight = timelineRef.current?.offsetHeight || getTotalTracksHeight(tracks);
 const playheadHeight = Math.max(timelineContainerHeight - 8, TIMELINE_CONSTANTS.RULER_HEIGHT);

 // Calculate playhead position based on current time and zoom level
 const leftPosition = currentTime * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;

 return (
   <>
     {/* Playhead line that spans the timeline */}
     <div
       ref={playheadRef}
       className={`absolute top-0 w-0.5 bg-primary z-30 cursor-ew-resize transition-colors duration-150 ${
         isSnappingToPlayhead ? 'bg-accent shadow-lg' : ''
       }`}
       style={{
         left: leftPosition,
         height: playheadHeight,
         transform: 'translateX(-1px)', // Center the line
       }}
       onMouseDown={handlePlayheadMouseDown}
     >
       {/* Playhead handle/head */}
       <div className="absolute -top-1 -left-2 w-4 h-4 bg-primary border-2 border-background rounded-sm cursor-ew-resize shadow-sm" />
       
       {/* Time indicator */}
       <div className="absolute -top-8 -left-8 bg-primary text-primary-foreground text-xs px-2 py-1 rounded whitespace-nowrap shadow-md">
         {formatTime(currentTime)}
       </div>
     </div>

     {/* Playhead extension for ruler area */}
     <div
       className="absolute top-0 w-0.5 bg-primary z-20"
       style={{
         left: leftPosition,
         height: TIMELINE_CONSTANTS.RULER_HEIGHT,
         transform: 'translateX(-1px)',
       }}
     />
   </>
 );
}

// Helper function to format time display
function formatTime(seconds: number): string {
 const mins = Math.floor(seconds / 60);
 const secs = Math.floor(seconds % 60);
 const frames = Math.floor((seconds % 1) * 30); // Assuming 30fps
 
 return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
}