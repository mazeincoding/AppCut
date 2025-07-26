# Timeline Implementation Tasks - 3-Minute Chunks

## Overview
This document breaks down the timeline modifications into small, focused tasks that can each be completed in under 3 minutes. Each task includes specific line numbers and code changes needed.

## Phase 1: Type Definitions and Interfaces (6 tasks, ~18 minutes)

### Task 1.1: Create SnapPoint Type Definition
**File**: Create `apps/web/src/types/timeline-snapping.ts`
**Changes**:
```typescript
// Add new file with:
export interface SnapPoint {
  position: number; // Time position in seconds
  type: 'element-start' | 'element-end' | 'playhead' | 'grid';
  strength: number; // 0-1, how strong the snap should be
  elementId?: string;
}

export interface SnapResult {
  snappedTime: number;
  snapPoint?: SnapPoint;
  didSnap: boolean;
}
```

### Task 1.2: Update Timeline Element Props
**File**: `apps/web/src/types/timeline.ts`
**Changes**:
- Add to TimelineElementProps interface (around line 50-60):
```typescript
onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
```

### Task 1.3: Update Timeline Track Props  
**File**: `apps/web/src/components/editor/timeline-track.tsx`
**Line**: 26-32
**Changes**:
- Add to component props interface:
```typescript
export function TimelineTrackContent({
  track,
  zoomLevel,
  onSnapPointChange, // ADD THIS LINE
}: {
  track: TimelineTrack;
  zoomLevel: number;
  onSnapPointChange?: (snapPoint: SnapPoint | null) => void; // ADD THIS LINE
}) {
```

### Task 1.4: Update Playhead Props
**File**: `apps/web/src/components/editor/timeline-playhead.tsx`
**Line**: 11-23
**Changes**:
- Add to TimelinePlayheadProps interface:
```typescript
isSnappingToPlayhead?: boolean; // ADD after line 22
```

### Task 1.5: Create Snapping Constants
**File**: `apps/web/src/constants/timeline-constants.ts`
**Changes**:
- Add new constants:
```typescript
export const SNAPPING_CONSTANTS = {
  SNAP_THRESHOLD: 10, // pixels
  SNAP_STRENGTH: 0.8,
  GRID_INTERVAL: 1, // seconds
  ENABLE_GRID_SNAP: true,
  ENABLE_ELEMENT_SNAP: true,
  ENABLE_PLAYHEAD_SNAP: true,
};
```

### Task 1.6: Export Timeline Toolbar Props Type
**File**: Create `apps/web/src/types/timeline-toolbar.ts`
**Changes**:
```typescript
export interface TimelineToolbarProps {
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  selectedTool: 'select' | 'cut' | 'text';
  setSelectedTool: (tool: 'select' | 'cut' | 'text') => void;
  isSnappingEnabled: boolean;
  setIsSnappingEnabled: (enabled: boolean) => void;
}
```

## Phase 2: Create Snapping Hook (5 tasks, ~15 minutes)

### Task 2.1: Create Hook File Structure
**File**: Create `apps/web/src/hooks/use-timeline-snapping.ts`
**Changes**:
```typescript
import { useState, useCallback, useMemo } from 'react';
import { TimelineTrack } from '@/types/timeline';
import { SnapPoint } from '@/types/timeline-snapping';
import { SNAPPING_CONSTANTS } from '@/constants/timeline-constants';

export function useTimelineSnapping({
  tracks,
  zoomLevel,
  onSnapPointChange,
}: {
  tracks: TimelineTrack[];
  zoomLevel: number;
  onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
}) {
  // Implementation in next tasks
}
```

### Task 2.2: Add Snap Points State
**File**: `apps/web/src/hooks/use-timeline-snapping.ts`
**Changes**:
- Inside the hook function, add:
```typescript
const [activeSnapPoint, setActiveSnapPoint] = useState<SnapPoint | null>(null);

// Generate snap points from tracks
const snapPoints = useMemo(() => {
  const points: SnapPoint[] = [];
  
  // Add element snap points
  tracks.forEach(track => {
    track.elements.forEach(element => {
      points.push({
        position: element.startTime,
        type: 'element-start',
        strength: 0.8,
        elementId: element.id,
      });
      points.push({
        position: element.startTime + element.duration - element.trimStart - element.trimEnd,
        type: 'element-end',
        strength: 0.8,
        elementId: element.id,
      });
    });
  });
  
  return points;
}, [tracks]);
```

### Task 2.3: Add Snap Time Calculator
**File**: `apps/web/src/hooks/use-timeline-snapping.ts`
**Changes**:
- Add getSnapTime function:
```typescript
const getSnapTime = useCallback((time: number): number => {
  if (!SNAPPING_CONSTANTS.ENABLE_ELEMENT_SNAP) return time;
  
  let closestSnap: SnapPoint | null = null;
  let closestDistance = Infinity;
  
  snapPoints.forEach(point => {
    const distance = Math.abs(point.position - time);
    const pixelDistance = distance * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
    
    if (pixelDistance < SNAPPING_CONSTANTS.SNAP_THRESHOLD && distance < closestDistance) {
      closestDistance = distance;
      closestSnap = point;
    }
  });
  
  if (closestSnap) {
    setActiveSnapPoint(closestSnap);
    onSnapPointChange?.(closestSnap);
    return closestSnap.position;
  }
  
  setActiveSnapPoint(null);
  onSnapPointChange?.(null);
  return time;
}, [snapPoints, zoomLevel, onSnapPointChange]);
```

### Task 2.4: Add Clear and Add Functions
**File**: `apps/web/src/hooks/use-timeline-snapping.ts`
**Changes**:
- Add utility functions:
```typescript
const clearSnapPoints = useCallback(() => {
  setActiveSnapPoint(null);
  onSnapPointChange?.(null);
}, [onSnapPointChange]);

const addSnapPoint = useCallback((point: SnapPoint) => {
  // This would be used for dynamic snap points like guides
  // For now, just a placeholder
}, []);
```

### Task 2.5: Complete Hook Return
**File**: `apps/web/src/hooks/use-timeline-snapping.ts`
**Changes**:
- Add return statement:
```typescript
return {
  snapPoints,
  activeSnapPoint,
  getSnapTime,
  clearSnapPoints,
  addSnapPoint,
};
```

## Phase 3: Extract Timeline Toolbar (4 tasks, ~12 minutes)

### Task 3.1: Create Timeline Toolbar Component
**File**: Create `apps/web/src/components/editor/timeline-toolbar.tsx`
**Changes**:
```typescript
"use client";

import { Button } from "../ui/button";
import { 
  Magnet, 
  ZoomIn, 
  ZoomOut,
  MousePointer,
  Scissors,
  Type
} from "lucide-react";
import { TimelineToolbarProps } from "@/types/timeline-toolbar";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "../ui/tooltip";

export function TimelineToolbar({
  zoomLevel,
  setZoomLevel,
  selectedTool,
  setSelectedTool,
  isSnappingEnabled,
  setIsSnappingEnabled,
}: TimelineToolbarProps) {
  // Implementation in next task
}
```

### Task 3.2: Add Toolbar Controls
**File**: `apps/web/src/components/editor/timeline-toolbar.tsx`
**Changes**:
- Inside the component function:
```typescript
return (
  <div className="flex items-center gap-2 p-2 border-b">
    {/* Tool Selection */}
    <div className="flex gap-1 mr-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={selectedTool === 'select' ? 'default' : 'ghost'}
              onClick={() => setSelectedTool('select')}
            >
              <MousePointer className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Select Tool (V)</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Add Cut and Text tools similarly */}
    </div>
    
    {/* Snapping Toggle */}
    <Button
      size="sm"
      variant={isSnappingEnabled ? 'default' : 'ghost'}
      onClick={() => setIsSnappingEnabled(!isSnappingEnabled)}
    >
      <Magnet className="h-4 w-4" />
    </Button>
    
    {/* Zoom Controls */}
    <div className="flex gap-1 ml-auto">
      <Button size="sm" variant="ghost" onClick={() => setZoomLevel(Math.max(0.1, zoomLevel - 0.1))}>
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="text-sm px-2">{Math.round(zoomLevel * 100)}%</span>
      <Button size="sm" variant="ghost" onClick={() => setZoomLevel(Math.min(5, zoomLevel + 0.1))}>
        <ZoomIn className="h-4 w-4" />
      </Button>
    </div>
  </div>
);
```

### Task 3.3: Update Timeline Component Imports
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: 1-60
**Changes**:
- Add import after line 46:
```typescript
import { TimelineToolbar } from "./timeline-toolbar";
```
- Add state after line 86:
```typescript
const [selectedTool, setSelectedTool] = useState<'select' | 'cut' | 'text'>('select');
const [isSnappingEnabled, setIsSnappingEnabled] = useState(true);
```

### Task 3.4: Replace Inline Toolbar with Component
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: Find toolbar implementation (around line 200-250)
**Changes**:
- Replace inline toolbar JSX with:
```typescript
<TimelineToolbar
  zoomLevel={zoomLevel}
  setZoomLevel={setZoomLevel}
  selectedTool={selectedTool}
  setSelectedTool={setSelectedTool}
  isSnappingEnabled={isSnappingEnabled}
  setIsSnappingEnabled={setIsSnappingEnabled}
/>
```

## Phase 4: Integrate Snapping into Track Component (5 tasks, ~15 minutes)

### Task 4.1: Import Snapping Hook
**File**: `apps/web/src/components/editor/timeline-track.tsx`
**Line**: 1-25
**Changes**:
- Add import after line 24:
```typescript
import { useTimelineSnapping, SnapPoint } from "@/hooks/use-timeline-snapping";
```

### Task 4.2: Initialize Snapping Hook
**File**: `apps/web/src/components/editor/timeline-track.tsx`
**Line**: 33-48
**Changes**:
- After line 47, add:
```typescript
const {
  snapPoints,
  getSnapTime,
  clearSnapPoints,
  addSnapPoint,
} = useTimelineSnapping({
  tracks,
  zoomLevel,
  onSnapPointChange,
});
```

### Task 4.3: Replace Inline Snap Calls
**File**: `apps/web/src/components/editor/timeline-track.tsx`
**Changes**:
- Line 90: Replace `snapTimeToFrame(adjustedTime, projectFps)` with `getSnapTime(adjustedTime)`
- Line 356: Replace `snapTimeToFrame(dropTime, projectFps)` with `getSnapTime(dropTime)`
- Line 378: Replace `snapTimeToFrame(dropTime, projectFps)` with `getSnapTime(dropTime)`
- Line 421: Replace `snapTimeToFrame(dropTime, projectFps)` with `getSnapTime(dropTime)`
- Line 451: Replace `snapTimeToFrame(dropTime, projectFps)` with `getSnapTime(dropTime)`
- Line 459: Replace `snapTimeToFrame(dropTime, projectFps)` with `getSnapTime(dropTime)`
- Line 529: Replace `snapTimeToFrame(newStartTime, projectFps)` with `getSnapTime(newStartTime)`
- Line 575: Replace `snapTimeToFrame(adjustedStartTime, projectFps)` with `getSnapTime(adjustedStartTime)`

### Task 4.4: Add Snap Visualization
**File**: `apps/web/src/components/editor/timeline-track.tsx`
**Line**: 895-915
**Changes**:
- After the track elements rendering (around line 975), add:
```typescript
{/* Snap Point Indicators */}
{snapPoints.map((snapPoint, index) => (
  <div
    key={`snap-${index}`}
    className="absolute top-0 bottom-0 w-px bg-primary/30 pointer-events-none"
    style={{
      left: snapPoint.position * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel,
    }}
  />
))}
```

### Task 4.5: Clean Up Drag End
**File**: `apps/web/src/components/editor/timeline-track.tsx`
**Line**: 205-209
**Changes**:
- In handleMouseUp function, add after endDragAction():
```typescript
clearSnapPoints();
```

## Phase 5: Update Playhead Component (4 tasks, ~12 minutes)

### Task 5.1: Add Snapping Prop
**File**: `apps/web/src/components/editor/timeline-playhead.tsx`
**Line**: 25-37
**Changes**:
- Add parameter to function:
```typescript
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
  isSnappingToPlayhead = false, // ADD THIS LINE
}: TimelinePlayheadProps) {
```

### Task 5.2: Update Visual Styling
**File**: `apps/web/src/components/editor/timeline-playhead.tsx`
**Line**: 77-78
**Changes**:
- Replace line 77 with conditional styling:
```typescript
<div className={`absolute left-0 w-2 cursor-col-resize h-full shadow-xl border-l ${
  isSnappingToPlayhead 
    ? 'bg-accent shadow-accent/80 border-accent-foreground' 
    : 'bg-red-600 shadow-red-600/80 border-red-400'
}`} />
```

### Task 5.3: Add Time Display
**File**: `apps/web/src/components/editor/timeline-playhead.tsx`
**Line**: 80-81
**Changes**:
- After the red dot indicator, add:
```typescript
{/* Time indicator */}
<div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-background text-foreground text-xs px-2 py-1 rounded border whitespace-nowrap pointer-events-none">
  {formatTime(currentTime)}
</div>
```

### Task 5.4: Add Time Formatter
**File**: `apps/web/src/components/editor/timeline-playhead.tsx`
**Line**: After the component function (before line 110)
**Changes**:
```typescript
// Helper function to format time display
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30); // Assuming 30fps
  
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
}
```

## Phase 6: Update Timeline Element (3 tasks, ~9 minutes)

### Task 6.1: Add Snapping Context Menu
**File**: `apps/web/src/components/editor/timeline-element.tsx`
**Line**: Around line 200 in context menu
**Changes**:
- Add new menu item in ContextMenuContent:
```typescript
<ContextMenuItem onClick={() => {
  // Snap to playhead functionality
  const { currentTime } = usePlaybackStore.getState();
  const { updateElementStartTime } = useTimelineStore.getState();
  updateElementStartTime(track.id, element.id, currentTime);
}}>
  <Magnet size={16} className="mr-2" />
  Snap to Playhead
</ContextMenuItem>
```

### Task 6.2: Update Resize with Snapping
**File**: `apps/web/src/components/editor/timeline-element.tsx`
**Line**: 74-86
**Changes**:
- Update resize hook call to include snapping:
```typescript
const {
  resizing,
  isResizing,
  handleResizeStart,
  handleResizeMove,
  handleResizeEnd,
} = useTimelineElementResize({
  element,
  track,
  zoomLevel,
  onUpdateTrim: updateElementTrim,
  onUpdateDuration: updateElementDuration,
  enableSnapping: true, // ADD THIS
});
```

### Task 6.3: Visual Feedback for Snapping
**File**: `apps/web/src/components/editor/timeline-element.tsx`
**Line**: Around line 150 in render
**Changes**:
- Add conditional class for snapping state:
```typescript
className={`timeline-element ${
  isSelected ? 'ring-2 ring-primary' : ''
} ${
  isSnapping ? 'ring-2 ring-accent animate-pulse' : '' // ADD THIS
}`}
```

## Phase 7: Timeline Main Component Updates (3 tasks, ~9 minutes)

### Task 7.1: Add Snapping State
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: After line 100
**Changes**:
- Add state for active snap point:
```typescript
const [activeSnapPoint, setActiveSnapPoint] = useState<SnapPoint | null>(null);
```

### Task 7.2: Pass Snapping Props to Tracks
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: Find TimelineTrackContent usage (around line 300-400)
**Changes**:
- Update each TimelineTrackContent call:
```typescript
<TimelineTrackContent
  key={track.id}
  track={track}
  zoomLevel={zoomLevel}
  onSnapPointChange={setActiveSnapPoint} // ADD THIS
/>
```

### Task 7.3: Pass Snapping to Playhead
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: Find TimelinePlayhead usage
**Changes**:
- Update TimelinePlayhead props:
```typescript
<TimelinePlayhead
  currentTime={currentTime}
  duration={duration}
  zoomLevel={zoomLevel}
  tracks={tracks}
  seek={seek}
  rulerRef={rulerRef}
  rulerScrollRef={rulerScrollRef}
  tracksScrollRef={tracksScrollRef}
  trackLabelsRef={trackLabelsRef}
  timelineRef={timelineRef}
  playheadRef={playheadRef}
  isSnappingToPlayhead={activeSnapPoint?.type === 'playhead'} // ADD THIS
/>
```

## Phase 8: Testing and Refinement (2 tasks, ~6 minutes)

### Task 8.1: Add Snap Debug Overlay
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: At the end of component before return
**Changes**:
- Add debug overlay (can be removed later):
```typescript
{/* Debug: Active Snap Point */}
{process.env.NODE_ENV === 'development' && activeSnapPoint && (
  <div className="absolute top-2 right-2 bg-background/90 p-2 rounded text-xs">
    Snapping to: {activeSnapPoint.type} at {activeSnapPoint.position.toFixed(2)}s
  </div>
)}
```

### Task 8.2: Add Keyboard Shortcut for Snapping
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: In keyboard event handler (around line 150-200)
**Changes**:
- Add case for 'S' key:
```typescript
case 's':
  if (!e.ctrlKey && !e.metaKey) {
    setIsSnappingEnabled(!isSnappingEnabled);
    toast.success(`Snapping ${!isSnappingEnabled ? 'enabled' : 'disabled'}`);
  }
  break;
```

## Summary

**Total Tasks**: 30
**Estimated Time**: ~90 minutes (30 tasks × 3 minutes)

**Implementation Order**:
1. Phase 1: Type definitions (foundation)
2. Phase 2: Snapping hook (core logic)
3. Phase 3: Toolbar extraction (UI improvement)
4. Phase 4: Track integration (main functionality)
5. Phase 5: Playhead updates (visual feedback)
6. Phase 6: Element updates (interaction)
7. Phase 7: Main component wiring (integration)
8. Phase 8: Testing helpers (validation)

Each task is designed to be:
- Self-contained
- Testable independently
- Completable in under 3 minutes
- Non-breaking to existing functionality

After completing all phases, the local timeline will have:
- Full snapping system matching GitHub version
- Extracted toolbar component
- Tool selection system
- Visual snapping indicators
- Improved architecture while keeping local advantages