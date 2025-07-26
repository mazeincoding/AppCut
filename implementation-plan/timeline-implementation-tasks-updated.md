# Timeline Implementation Tasks - Updated with Existing Types

## Overview
Updated implementation plan based on the existing `types/timeline.ts` file. The existing types show that the local implementation already has a well-structured type system.

## Phase 1: Type Definitions and Interfaces (UPDATED - 4 tasks, ~12 minutes)

### Task 1.1: Create SnapPoint Type Definition
**File**: `apps/web/src/types/timeline.ts`
**Line**: Add after line 150 (after validateElementTrackCompatibility)
**Changes**:
```typescript
// Snapping system types
export interface SnapPoint {
  position: number; // Time position in seconds
  type: 'element-start' | 'element-end' | 'playhead' | 'grid';
  strength: number; // 0-1, how strong the snap should be
  elementId?: string;
  trackId?: string;
}

export interface SnapResult {
  snappedTime: number;
  snapPoint?: SnapPoint;
  didSnap: boolean;
}

export interface TimelineSnappingConfig {
  enabled: boolean;
  threshold: number; // in pixels
  showIndicators: boolean;
  snapToGrid: boolean;
  snapToElements: boolean;
  snapToPlayhead: boolean;
  gridInterval: number; // in seconds
}
```

### Task 1.2: Update TimelineElementProps
**File**: `apps/web/src/types/timeline.ts`
**Line**: 47-53 (TimelineElementProps interface)
**Changes**:
```typescript
export interface TimelineElementProps {
  element: TimelineElement;
  track: TimelineTrack;
  zoomLevel: number;
  isSelected: boolean;
  onElementMouseDown: (e: React.MouseEvent, element: TimelineElement) => void;
  onElementClick: (e: React.MouseEvent, element: TimelineElement) => void;
  isSnapping?: boolean; // ADD THIS
  onSnapChange?: (snapping: boolean) => void; // ADD THIS
}
```

### Task 1.3: Create Timeline Toolbar Props Type
**File**: `apps/web/src/types/timeline.ts`
**Line**: Add after TimelineTrack interface (around line 85)
**Changes**:
```typescript
export interface TimelineToolbarProps {
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  selectedTool: 'select' | 'cut' | 'text';
  setSelectedTool: (tool: 'select' | 'cut' | 'text') => void;
  isSnappingEnabled: boolean;
  setIsSnappingEnabled: (enabled: boolean) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}
```

### Task 1.4: Update Timeline Track Props
**Note**: Since TimelineTrack is already defined, we'll create a separate props interface
**File**: `apps/web/src/types/timeline.ts`
**Line**: Add after TimelineToolbarProps
**Changes**:
```typescript
export interface TimelineTrackContentProps {
  track: TimelineTrack;
  zoomLevel: number;
  onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
  isSnappingEnabled?: boolean;
}
```

## Phase 2: Create Snapping Hook (5 tasks, ~15 minutes)

### Task 2.1: Create Hook File Structure
**File**: Create `apps/web/src/hooks/use-timeline-snapping.ts`
**Changes**:
```typescript
import { useState, useCallback, useMemo, useRef } from 'react';
import { TimelineTrack, SnapPoint, SnapResult, TimelineSnappingConfig } from '@/types/timeline';
import { TIMELINE_CONSTANTS } from '@/constants/timeline-constants';
import { usePlaybackStore } from '@/stores/playback-store';

interface UseTimelineSnappingProps {
  tracks: TimelineTrack[];
  zoomLevel: number;
  config?: Partial<TimelineSnappingConfig>;
  onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
}

export function useTimelineSnapping({
  tracks,
  zoomLevel,
  config,
  onSnapPointChange,
}: UseTimelineSnappingProps) {
  // Default config
  const defaultConfig: TimelineSnappingConfig = {
    enabled: true,
    threshold: 10, // pixels
    showIndicators: true,
    snapToGrid: true,
    snapToElements: true,
    snapToPlayhead: true,
    gridInterval: 1, // seconds
  };
  
  const snapConfig = { ...defaultConfig, ...config };
  
  // Implementation continues in next tasks
}
```

### Task 2.2: Add Snap Points Generation
**File**: `apps/web/src/hooks/use-timeline-snapping.ts`
**Changes**:
```typescript
// Inside the hook, add:
const [activeSnapPoint, setActiveSnapPoint] = useState<SnapPoint | null>(null);
const { currentTime } = usePlaybackStore();

// Generate snap points from tracks and playhead
const snapPoints = useMemo(() => {
  const points: SnapPoint[] = [];
  
  if (!snapConfig.enabled) return points;
  
  // Add element snap points
  if (snapConfig.snapToElements) {
    tracks.forEach(track => {
      track.elements.forEach(element => {
        points.push({
          position: element.startTime,
          type: 'element-start',
          strength: 0.8,
          elementId: element.id,
          trackId: track.id,
        });
        
        const elementEnd = element.startTime + element.duration - element.trimStart - element.trimEnd;
        points.push({
          position: elementEnd,
          type: 'element-end',
          strength: 0.8,
          elementId: element.id,
          trackId: track.id,
        });
      });
    });
  }
  
  // Add playhead snap point
  if (snapConfig.snapToPlayhead && currentTime > 0) {
    points.push({
      position: currentTime,
      type: 'playhead',
      strength: 1.0,
    });
  }
  
  // Add grid snap points (generated dynamically in getSnapTime)
  
  return points;
}, [tracks, currentTime, snapConfig]);
```

### Task 2.3: Add Snap Time Calculator
**File**: `apps/web/src/hooks/use-timeline-snapping.ts`
**Changes**:
```typescript
const getSnapTime = useCallback((time: number): SnapResult => {
  if (!snapConfig.enabled) {
    return { snappedTime: time, didSnap: false };
  }
  
  let closestSnap: SnapPoint | null = null;
  let closestDistance = Infinity;
  let snappedTime = time;
  
  // Check element and playhead snap points
  snapPoints.forEach(point => {
    const distance = Math.abs(point.position - time);
    const pixelDistance = distance * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
    
    if (pixelDistance < snapConfig.threshold) {
      const weightedDistance = distance / point.strength;
      if (weightedDistance < closestDistance) {
        closestDistance = weightedDistance;
        closestSnap = point;
        snappedTime = point.position;
      }
    }
  });
  
  // Check grid snapping
  if (snapConfig.snapToGrid && !closestSnap) {
    const gridSnap = Math.round(time / snapConfig.gridInterval) * snapConfig.gridInterval;
    const gridDistance = Math.abs(gridSnap - time);
    const gridPixelDistance = gridDistance * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
    
    if (gridPixelDistance < snapConfig.threshold) {
      snappedTime = gridSnap;
      closestSnap = {
        position: gridSnap,
        type: 'grid',
        strength: 0.5,
      };
    }
  }
  
  if (closestSnap) {
    setActiveSnapPoint(closestSnap);
    onSnapPointChange?.(closestSnap);
    return { snappedTime, snapPoint: closestSnap, didSnap: true };
  }
  
  setActiveSnapPoint(null);
  onSnapPointChange?.(null);
  return { snappedTime: time, didSnap: false };
}, [snapPoints, snapConfig, zoomLevel, onSnapPointChange]);
```

### Task 2.4: Add Utility Functions
**File**: `apps/web/src/hooks/use-timeline-snapping.ts`
**Changes**:
```typescript
// Add these functions:
const clearSnapPoints = useCallback(() => {
  setActiveSnapPoint(null);
  onSnapPointChange?.(null);
}, [onSnapPointChange]);

// Get all current snap positions for visualization
const getSnapPositions = useCallback((): number[] => {
  const positions = snapPoints.map(p => p.position);
  
  // Add grid positions if enabled
  if (snapConfig.snapToGrid && snapConfig.showIndicators) {
    const duration = Math.max(...tracks.map(t => 
      Math.max(...t.elements.map(e => 
        e.startTime + e.duration - e.trimStart - e.trimEnd
      ), 0)
    ), 30);
    
    for (let t = 0; t <= duration; t += snapConfig.gridInterval) {
      positions.push(t);
    }
  }
  
  return [...new Set(positions)].sort((a, b) => a - b);
}, [snapPoints, snapConfig, tracks]);

// Check if a time is near a snap point
const isNearSnapPoint = useCallback((time: number): boolean => {
  const result = getSnapTime(time);
  return result.didSnap;
}, [getSnapTime]);
```

### Task 2.5: Complete Hook Return
**File**: `apps/web/src/hooks/use-timeline-snapping.ts`
**Changes**:
```typescript
// Return statement:
return {
  // State
  snapPoints,
  activeSnapPoint,
  snapConfig,
  
  // Functions
  getSnapTime,
  clearSnapPoints,
  getSnapPositions,
  isNearSnapPoint,
  
  // Utilities
  isSnapping: activeSnapPoint !== null,
};
```

## Phase 3: Extract Timeline Toolbar (4 tasks, ~12 minutes)

### Task 3.1: Create Timeline Toolbar Component
**File**: `apps/web/src/components/editor/timeline-toolbar.tsx` already exists!
**Action**: Check existing file and update if needed
**Changes**: If file exists, ensure it matches our TimelineToolbarProps interface

### Task 3.2: Update Existing Toolbar
**File**: `apps/web/src/components/editor/timeline-toolbar.tsx`
**Changes**: Add tool selection if missing:
```typescript
import { MousePointer, Scissors, Type } from "lucide-react";

// Add tool selection buttons:
<div className="flex gap-1 mr-2">
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant={selectedTool === 'select' ? 'default' : 'ghost'}
          onClick={() => setSelectedTool('select')}
          className="h-8 w-8"
        >
          <MousePointer className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Select Tool (V)</p>
      </TooltipContent>
    </Tooltip>
    
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant={selectedTool === 'cut' ? 'default' : 'ghost'}
          onClick={() => setSelectedTool('cut')}
          className="h-8 w-8"
        >
          <Scissors className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Cut Tool (C)</p>
      </TooltipContent>
    </Tooltip>
    
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="sm"
          variant={selectedTool === 'text' ? 'default' : 'ghost'}
          onClick={() => setSelectedTool('text')}
          className="h-8 w-8"
        >
          <Type className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Text Tool (T)</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</div>
```

### Task 3.3: Update Timeline Component State
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: Around line 86
**Changes**:
```typescript
// Add these states if not present:
const [selectedTool, setSelectedTool] = useState<'select' | 'cut' | 'text'>('select');
const [isSnappingEnabled, setIsSnappingEnabled] = useState(true);
```

### Task 3.4: Pass Props to Toolbar
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: Find TimelineToolbar usage
**Changes**:
```typescript
// Update the TimelineToolbar props:
<TimelineToolbar
  zoomLevel={zoomLevel}
  setZoomLevel={setZoomLevel}
  selectedTool={selectedTool}
  setSelectedTool={setSelectedTool}
  isSnappingEnabled={isSnappingEnabled}
  setIsSnappingEnabled={setIsSnappingEnabled}
  onUndo={undo}
  onRedo={redo}
  canUndo={/* check undo availability */}
  canRedo={/* check redo availability */}
/>
```

## Phase 4: Integrate Snapping into Track Component (5 tasks, ~15 minutes)

### Task 4.1: Import Snapping Hook and Types
**File**: `apps/web/src/components/editor/timeline-track.tsx`
**Line**: 1-25
**Changes**:
```typescript
// Add imports:
import { useTimelineSnapping } from "@/hooks/use-timeline-snapping";
import type { SnapPoint, TimelineTrackContentProps } from "@/types/timeline";
```

### Task 4.2: Update Component Props
**File**: `apps/web/src/components/editor/timeline-track.tsx`
**Line**: 26-32
**Changes**:
```typescript
export function TimelineTrackContent({
  track,
  zoomLevel,
  onSnapPointChange,
  isSnappingEnabled = true,
}: TimelineTrackContentProps) {
```

### Task 4.3: Initialize Snapping Hook
**File**: `apps/web/src/components/editor/timeline-track.tsx`
**Line**: After line 47
**Changes**:
```typescript
// Initialize snapping
const {
  getSnapTime,
  clearSnapPoints,
  getSnapPositions,
  isSnapping,
} = useTimelineSnapping({
  tracks,
  zoomLevel,
  config: { enabled: isSnappingEnabled },
  onSnapPointChange,
});
```

### Task 4.4: Replace snapTimeToFrame Calls
**File**: `apps/web/src/components/editor/timeline-track.tsx`
**Changes**: Replace all `snapTimeToFrame` calls with `getSnapTime`:
```typescript
// Line 90: 
const snapResult = getSnapTime(adjustedTime);
const snappedTime = snapResult.snappedTime;

// Line 356:
const snapResult = getSnapTime(dropTime);
const snappedTime = snapResult.snappedTime;

// And so on for all other instances...
// Each replacement should use the result object pattern
```

### Task 4.5: Add Snap Visualization
**File**: `apps/web/src/components/editor/timeline-track.tsx`
**Line**: After elements rendering (around line 975)
**Changes**:
```typescript
{/* Snap Indicators */}
{isSnappingEnabled && getSnapPositions().map((position, index) => (
  <div
    key={`snap-${index}-${position}`}
    className="absolute top-0 bottom-0 w-px pointer-events-none"
    style={{
      left: position * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel,
      backgroundColor: isSnapping && Math.abs(position - dragState.currentTime) < 0.01 
        ? 'rgb(var(--accent))' 
        : 'rgba(var(--primary), 0.2)',
      opacity: isSnapping ? 1 : 0.5,
    }}
  />
))}
```

## Phase 5: Update Playhead Component (4 tasks, ~12 minutes)

### Task 5.1: Update Playhead Props Interface
**File**: `apps/web/src/components/editor/timeline-playhead.tsx`
**Line**: 11-23
**Changes**:
```typescript
interface TimelinePlayheadProps {
  currentTime: number;
  duration: number;
  zoomLevel: number;
  tracks: TimelineTrack[];
  seek: (time: number) => void;
  rulerRef: React.RefObject<HTMLDivElement | null>;
  rulerScrollRef: React.RefObject<HTMLDivElement | null>;
  tracksScrollRef: React.RefObject<HTMLDivElement | null>;
  trackLabelsRef?: React.RefObject<HTMLDivElement | null>;
  timelineRef: React.RefObject<HTMLDivElement | null>;
  playheadRef?: React.RefObject<HTMLDivElement | null>;
  isSnappingToPlayhead?: boolean; // ADD THIS
}
```

### Task 5.2: Add Time Formatter Function
**File**: `apps/web/src/components/editor/timeline-playhead.tsx`
**Line**: Before the component function
**Changes**:
```typescript
// Time formatter helper
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30); // Assuming 30fps
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
}
```

### Task 5.3: Update Visual Styling with Snapping
**File**: `apps/web/src/components/editor/timeline-playhead.tsx`
**Line**: 77
**Changes**:
```typescript
{/* The line spanning full height */}
<div className={`absolute left-0 w-2 cursor-col-resize h-full shadow-xl border-l transition-all duration-150 ${
  isSnappingToPlayhead 
    ? 'bg-accent shadow-accent/80 border-accent animate-pulse' 
    : 'bg-red-600 shadow-red-600/80 border-red-400'
}`} />
```

### Task 5.4: Add Time Display
**File**: `apps/web/src/components/editor/timeline-playhead.tsx`
**Line**: After the red dot (line 80)
**Changes**:
```typescript
{/* Time indicator tooltip */}
{isSnappingToPlayhead && (
  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground text-xs px-2 py-1 rounded-md whitespace-nowrap pointer-events-none shadow-lg">
    {formatTime(currentTime)}
  </div>
)}
```

## Phase 6: Update Timeline Element (3 tasks, ~9 minutes)

### Task 6.1: Add Snapping Props
**File**: `apps/web/src/components/editor/timeline-element.tsx`
**Line**: In props destructuring (around line 48-55)
**Changes**:
```typescript
export function TimelineElement({
  element,
  track,
  zoomLevel,
  isSelected,
  onElementMouseDown,
  onElementClick,
  isSnapping = false, // ADD
  onSnapChange, // ADD
}: TimelineElementProps) {
```

### Task 6.2: Add Snap Visual Feedback
**File**: `apps/web/src/components/editor/timeline-element.tsx`
**Line**: In the main element div className (around line 150)
**Changes**:
```typescript
<div
  ref={elementRef}
  className={`timeline-element absolute transition-all duration-150 ${
    isSelected ? 'ring-2 ring-primary z-20' : 'z-10'
  } ${
    isSnapping ? 'ring-2 ring-accent shadow-lg shadow-accent/50' : ''
  } ${
    dragState.isDragging && dragState.elementId === element.id ? 'opacity-50' : ''
  }`}
  // ... rest of props
>
```

### Task 6.3: Add Snap to Playhead Action
**File**: `apps/web/src/components/editor/timeline-element.tsx`
**Line**: In context menu (around line 200)
**Changes**:
```typescript
<ContextMenuItem 
  onClick={() => {
    const { currentTime } = usePlaybackStore.getState();
    const { updateElementStartTime } = useTimelineStore.getState();
    updateElementStartTime(track.id, element.id, currentTime);
    toast.success('Snapped to playhead');
  }}
>
  <Magnet size={16} className="mr-2" />
  Snap to Playhead
</ContextMenuItem>
```

## Phase 7: Wire Everything in Timeline Component (4 tasks, ~12 minutes)

### Task 7.1: Import Snapping Types
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: In imports section
**Changes**:
```typescript
import type { SnapPoint } from "@/types/timeline";
```

### Task 7.2: Add Snapping State
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: After line 92
**Changes**:
```typescript
// Snapping state
const [activeSnapPoint, setActiveSnapPoint] = useState<SnapPoint | null>(null);
const [elementSnapping, setElementSnapping] = useState<Map<string, boolean>>(new Map());
```

### Task 7.3: Update Track Rendering
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: Where TimelineTrackContent is rendered
**Changes**:
```typescript
{tracks.map((track) => (
  <TimelineTrackContent
    key={track.id}
    track={track}
    zoomLevel={zoomLevel}
    onSnapPointChange={setActiveSnapPoint}
    isSnappingEnabled={isSnappingEnabled}
  />
))}
```

### Task 7.4: Update Playhead with Snapping
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: Where TimelinePlayhead is rendered
**Changes**:
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
  isSnappingToPlayhead={activeSnapPoint?.type === 'playhead'}
/>
```

## Phase 8: Add Keyboard Shortcuts and Polish (3 tasks, ~9 minutes)

### Task 8.1: Add Snapping Toggle Shortcut
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: In keyboard event handler
**Changes**:
```typescript
case 's':
  if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
    e.preventDefault();
    setIsSnappingEnabled(!isSnappingEnabled);
    toast.success(`Snapping ${!isSnappingEnabled ? 'enabled' : 'disabled'}`);
  }
  break;
  
case 'v':
  if (!e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    setSelectedTool('select');
  }
  break;
  
case 'c':
  if (!e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    setSelectedTool('cut');
  }
  break;
  
case 't':
  if (!e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    setSelectedTool('text');
  }
  break;
```

### Task 8.2: Add Snap Indicator Overlay
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: At the end of the timeline div
**Changes**:
```typescript
{/* Snap Indicator */}
{activeSnapPoint && isSnappingEnabled && (
  <div className="absolute top-2 right-2 bg-accent/90 text-accent-foreground px-3 py-1 rounded-md text-xs pointer-events-none animate-in fade-in duration-150">
    Snapping to {activeSnapPoint.type} at {activeSnapPoint.position.toFixed(2)}s
  </div>
)}
```

### Task 8.3: Update Constants
**File**: `apps/web/src/constants/timeline-constants.ts`
**Line**: Add to existing constants
**Changes**:
```typescript
export const SNAPPING_CONSTANTS = {
  SNAP_THRESHOLD: 10, // pixels
  SNAP_STRENGTH: 0.8,
  GRID_INTERVAL: 1, // seconds
  ENABLE_GRID_SNAP: true,
  ENABLE_ELEMENT_SNAP: true,
  ENABLE_PLAYHEAD_SNAP: true,
  VISUAL_INDICATOR_OPACITY: 0.3,
  ACTIVE_INDICATOR_OPACITY: 1.0,
};

// Also ensure DEFAULT_TEXT_DURATION exists if referenced
export const DEFAULT_TEXT_DURATION = 5; // seconds
```

## Summary

**Total Tasks**: 33 (updated from 30)
**Estimated Time**: ~99 minutes

**Key Updates from Original Plan**:
1. Accounts for existing type definitions in `types/timeline.ts`
2. Recognizes that `timeline-toolbar.tsx` already exists
3. Adds proper TypeScript types based on existing patterns
4. Maintains compatibility with existing MediaElement and TextElement types
5. Integrates with existing store patterns

**Implementation Order Remains**:
1. Type updates (using existing structure)
2. Snapping hook creation
3. Toolbar enhancement
4. Track integration
5. Playhead updates
6. Element updates
7. Main component wiring
8. Polish and shortcuts

Each task is still designed to be completable in under 3 minutes with specific code changes provided.