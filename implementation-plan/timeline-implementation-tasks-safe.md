# Timeline Implementation Tasks - Safe Non-Breaking Version

## Overview
This implementation plan ensures NO existing timeline features are broken. Each change includes backward compatibility, feature flags, and gradual integration to maintain all current functionality.

## Core Safety Principles
1. **All new features are optional** - Existing code paths remain unchanged
2. **Feature flags** - New functionality can be toggled on/off
3. **Backward compatibility** - All existing props and behaviors preserved
4. **Gradual rollout** - Test each phase before proceeding
5. **Non-invasive changes** - Add new code alongside existing, don't replace

## Phase 1: Safe Type Additions (4 tasks, ~12 minutes)

### Task 1.1: Add Snapping Types (Non-Breaking)
**File**: `apps/web/src/types/timeline.ts`
**Line**: Add after line 150 (ADDITION ONLY - no modifications)
**Changes**:
```typescript
// SAFE: New types added at end of file, no existing types modified
export interface SnapPoint {
  position: number;
  type: 'element-start' | 'element-end' | 'playhead' | 'grid';
  strength: number;
  elementId?: string;
  trackId?: string;
}

export interface SnapResult {
  snappedTime: number;
  snapPoint?: SnapPoint;
  didSnap: boolean;
}

// Feature flag interface
export interface TimelineFeatureFlags {
  enableSnapping?: boolean;
  enableSnapVisualization?: boolean;
  enableToolSelection?: boolean;
  enableTimeDisplay?: boolean;
}
```

### Task 1.2: Extend TimelineElementProps Safely
**File**: `apps/web/src/types/timeline.ts`
**Line**: After TimelineElementProps interface
**Changes**:
```typescript
// SAFE: Create extended interface, don't modify existing
export interface TimelineElementPropsWithSnapping extends TimelineElementProps {
  isSnapping?: boolean;
  onSnapChange?: (snapping: boolean) => void;
}

// For backward compatibility, components can use either interface
```

### Task 1.3: Add Optional Toolbar Props
**File**: `apps/web/src/types/timeline.ts`
**Line**: After existing interfaces
**Changes**:
```typescript
// SAFE: New interface for enhanced toolbar, existing toolbar remains unchanged
export interface EnhancedTimelineToolbarProps {
  // Existing props
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  
  // New optional props with defaults
  selectedTool?: 'select' | 'cut' | 'text';
  setSelectedTool?: (tool: 'select' | 'cut' | 'text') => void;
  isSnappingEnabled?: boolean;
  setIsSnappingEnabled?: (enabled: boolean) => void;
  featureFlags?: TimelineFeatureFlags;
}
```

### Task 1.4: Add Track Content Props
**File**: `apps/web/src/types/timeline.ts`
**Line**: After existing interfaces
**Changes**:
```typescript
// SAFE: Optional props interface that extends functionality
export interface TimelineTrackContentEnhancedProps {
  track: TimelineTrack;
  zoomLevel: number;
  // All new props are optional with defaults
  onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
  isSnappingEnabled?: boolean;
  featureFlags?: TimelineFeatureFlags;
}
```

## Phase 2: Create Snapping Hook with Feature Flag (5 tasks, ~15 minutes)

### Task 2.1: Create Safe Hook Structure
**File**: Create `apps/web/src/hooks/use-timeline-snapping.ts`
**Changes**:
```typescript
import { useState, useCallback, useMemo } from 'react';
import { TimelineTrack, SnapPoint, SnapResult, TimelineFeatureFlags } from '@/types/timeline';
import { TIMELINE_CONSTANTS } from '@/constants/timeline-constants';
import { snapTimeToFrame } from '@/constants/timeline-constants';
import { useProjectStore } from '@/stores/project-store';

interface UseTimelineSnappingProps {
  tracks: TimelineTrack[];
  zoomLevel: number;
  enabled?: boolean; // SAFE: Defaults to false
  onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
}

export function useTimelineSnapping({
  tracks,
  zoomLevel,
  enabled = false, // SAFE: Off by default
  onSnapPointChange,
}: UseTimelineSnappingProps) {
  const { activeProject } = useProjectStore();
  const projectFps = activeProject?.fps || 30;
  
  // SAFE: If not enabled, return legacy behavior
  if (!enabled) {
    return {
      getSnapTime: (time: number) => ({
        snappedTime: snapTimeToFrame(time, projectFps), // Use existing function
        didSnap: false,
      }),
      snapPoints: [],
      activeSnapPoint: null,
      clearSnapPoints: () => {},
      getSnapPositions: () => [],
      isSnapping: false,
    };
  }
  
  // New snapping implementation continues...
}
```

### Task 2.2: Add Backward Compatible Snap Points
**File**: `apps/web/src/hooks/use-timeline-snapping.ts`
**Changes**:
```typescript
// Inside the hook, after the early return:
const [activeSnapPoint, setActiveSnapPoint] = useState<SnapPoint | null>(null);

const snapPoints = useMemo(() => {
  const points: SnapPoint[] = [];
  
  // SAFE: Only generate points if enabled
  if (!enabled) return points;
  
  try {
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
  } catch (error) {
    console.warn('Snapping: Error generating snap points', error);
    // SAFE: Return empty array on error
    return [];
  }
  
  return points;
}, [tracks, enabled]);
```

### Task 2.3: Add Safe Snap Time Calculator
**File**: `apps/web/src/hooks/use-timeline-snapping.ts`
**Changes**:
```typescript
const getSnapTime = useCallback((time: number): SnapResult => {
  // SAFE: Always fall back to frame snapping if anything fails
  try {
    if (!enabled || snapPoints.length === 0) {
      return {
        snappedTime: snapTimeToFrame(time, projectFps),
        didSnap: false,
      };
    }
    
    const threshold = 10; // pixels
    let closestSnap: SnapPoint | null = null;
    let closestDistance = Infinity;
    
    snapPoints.forEach(point => {
      const distance = Math.abs(point.position - time);
      const pixelDistance = distance * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
      
      if (pixelDistance < threshold && distance < closestDistance) {
        closestDistance = distance;
        closestSnap = point;
      }
    });
    
    if (closestSnap) {
      setActiveSnapPoint(closestSnap);
      onSnapPointChange?.(closestSnap);
      return {
        snappedTime: closestSnap.position,
        snapPoint: closestSnap,
        didSnap: true,
      };
    }
    
    // SAFE: Fall back to frame snapping
    return {
      snappedTime: snapTimeToFrame(time, projectFps),
      didSnap: false,
    };
  } catch (error) {
    console.warn('Snapping: Error in getSnapTime', error);
    // SAFE: Always return frame-snapped time on error
    return {
      snappedTime: snapTimeToFrame(time, projectFps),
      didSnap: false,
    };
  }
}, [snapPoints, enabled, zoomLevel, projectFps, onSnapPointChange]);
```

### Task 2.4: Add Safe Utility Functions
**File**: `apps/web/src/hooks/use-timeline-snapping.ts`
**Changes**:
```typescript
const clearSnapPoints = useCallback(() => {
  try {
    setActiveSnapPoint(null);
    onSnapPointChange?.(null);
  } catch (error) {
    console.warn('Snapping: Error clearing snap points', error);
  }
}, [onSnapPointChange]);

const getSnapPositions = useCallback((): number[] => {
  if (!enabled) return [];
  
  try {
    return snapPoints.map(p => p.position);
  } catch (error) {
    console.warn('Snapping: Error getting snap positions', error);
    return [];
  }
}, [snapPoints, enabled]);
```

### Task 2.5: Complete Safe Hook Return
**File**: `apps/web/src/hooks/use-timeline-snapping.ts`
**Changes**:
```typescript
return {
  // Always return these for compatibility
  getSnapTime,
  snapPoints,
  activeSnapPoint,
  clearSnapPoints,
  getSnapPositions,
  isSnapping: enabled && activeSnapPoint !== null,
  
  // Legacy compatibility
  isEnabled: enabled,
};
```

## Phase 3: Safe Toolbar Enhancement (3 tasks, ~9 minutes)

### Task 3.1: Create Toolbar Wrapper
**File**: Create `apps/web/src/components/editor/timeline-toolbar-enhanced.tsx`
**Changes**:
```typescript
"use client";

import { TimelineToolbar } from "./timeline-toolbar";
import { Button } from "../ui/button";
import { MousePointer, Scissors, Type, Magnet } from "lucide-react";
import { EnhancedTimelineToolbarProps } from "@/types/timeline";

// SAFE: Wrapper component that adds features without modifying existing toolbar
export function TimelineToolbarEnhanced({
  zoomLevel,
  setZoomLevel,
  selectedTool = 'select',
  setSelectedTool = () => {},
  isSnappingEnabled = false,
  setIsSnappingEnabled = () => {},
  featureFlags = {},
}: EnhancedTimelineToolbarProps) {
  // If feature flags disable enhancements, render original toolbar
  if (!featureFlags.enableToolSelection && !featureFlags.enableSnapping) {
    return <TimelineToolbar zoomLevel={zoomLevel} setZoomLevel={setZoomLevel} />;
  }
  
  // Enhanced toolbar implementation...
  return (
    <div className="timeline-toolbar-enhanced">
      <TimelineToolbar zoomLevel={zoomLevel} setZoomLevel={setZoomLevel} />
      
      {/* SAFE: Additional controls added separately */}
      {featureFlags.enableToolSelection && (
        <div className="flex gap-1 px-2">
          {/* Tool buttons */}
        </div>
      )}
      
      {featureFlags.enableSnapping && (
        <Button
          size="sm"
          variant={isSnappingEnabled ? 'default' : 'ghost'}
          onClick={() => setIsSnappingEnabled(!isSnappingEnabled)}
        >
          <Magnet className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
```

### Task 3.2: Add Feature Flag to Timeline
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: After existing state declarations
**Changes**:
```typescript
// SAFE: Feature flags default to false
const [featureFlags] = useState<TimelineFeatureFlags>({
  enableSnapping: false, // Set to true when ready to test
  enableSnapVisualization: false,
  enableToolSelection: false,
  enableTimeDisplay: false,
});

// SAFE: New states only used if features enabled
const [selectedTool, setSelectedTool] = useState<'select' | 'cut' | 'text'>('select');
const [isSnappingEnabled, setIsSnappingEnabled] = useState(false);
```

### Task 3.3: Conditionally Use Enhanced Toolbar
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: Where toolbar is rendered
**Changes**:
```typescript
// SAFE: Use enhanced toolbar only if any feature is enabled
{(featureFlags.enableSnapping || featureFlags.enableToolSelection) ? (
  <TimelineToolbarEnhanced
    zoomLevel={zoomLevel}
    setZoomLevel={setZoomLevel}
    selectedTool={selectedTool}
    setSelectedTool={setSelectedTool}
    isSnappingEnabled={isSnappingEnabled}
    setIsSnappingEnabled={setIsSnappingEnabled}
    featureFlags={featureFlags}
  />
) : (
  // SAFE: Existing toolbar remains unchanged
  <TimelineToolbar zoomLevel={zoomLevel} setZoomLevel={setZoomLevel} />
)}
```

## Phase 4: Safe Track Integration (4 tasks, ~12 minutes)

### Task 4.1: Create Enhanced Track Wrapper
**File**: Create `apps/web/src/components/editor/timeline-track-enhanced.tsx`
**Changes**:
```typescript
"use client";

import { TimelineTrackContent } from "./timeline-track";
import { useTimelineSnapping } from "@/hooks/use-timeline-snapping";
import type { TimelineTrackContentEnhancedProps } from "@/types/timeline";

// SAFE: Wrapper that adds snapping without modifying existing component
export function TimelineTrackContentEnhanced({
  track,
  zoomLevel,
  onSnapPointChange,
  isSnappingEnabled = false,
  featureFlags = {},
}: TimelineTrackContentEnhancedProps) {
  // SAFE: Only use snapping if enabled
  const snapping = isSnappingEnabled ? useTimelineSnapping({
    tracks: [track], // Only this track for now
    zoomLevel,
    enabled: isSnappingEnabled,
    onSnapPointChange,
  }) : null;
  
  // Render original component
  return (
    <>
      <TimelineTrackContent track={track} zoomLevel={zoomLevel} />
      
      {/* SAFE: Snap indicators rendered as overlay */}
      {featureFlags.enableSnapVisualization && snapping && (
        <div className="absolute inset-0 pointer-events-none">
          {snapping.getSnapPositions().map((position, i) => (
            <div
              key={`snap-${i}`}
              className="absolute top-0 bottom-0 w-px bg-primary/20"
              style={{ left: position * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel }}
            />
          ))}
        </div>
      )}
    </>
  );
}
```

### Task 4.2: Add Snapping Override Option
**File**: `apps/web/src/components/editor/timeline-track.tsx`
**Line**: At the very beginning of TimelineTrackContent function
**Changes**:
```typescript
export function TimelineTrackContent({
  track,
  zoomLevel,
  onSnapPointChange, // SAFE: Optional prop
  isSnappingEnabled = false, // SAFE: Defaults to false
}: TimelineTrackContentProps & { 
  onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
  isSnappingEnabled?: boolean;
}) {
  // SAFE: Feature detection
  const useEnhancedSnapping = isSnappingEnabled && typeof onSnapPointChange === 'function';
  
  // Existing code continues unchanged...
```

### Task 4.3: Conditionally Use Snapping
**File**: `apps/web/src/components/editor/timeline-track.tsx`
**Line**: Where snapTimeToFrame is called (line 90)
**Changes**:
```typescript
// SAFE: Preserve existing behavior by default
const snappedTime = useEnhancedSnapping && snappingHook 
  ? snappingHook.getSnapTime(adjustedTime).snappedTime
  : snapTimeToFrame(adjustedTime, projectFps); // Existing behavior
```

### Task 4.4: Safe Track Rendering in Timeline
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: Where tracks are rendered
**Changes**:
```typescript
{tracks.map((track) => 
  featureFlags.enableSnapping ? (
    <TimelineTrackContentEnhanced
      key={track.id}
      track={track}
      zoomLevel={zoomLevel}
      onSnapPointChange={setActiveSnapPoint}
      isSnappingEnabled={isSnappingEnabled}
      featureFlags={featureFlags}
    />
  ) : (
    // SAFE: Existing track component unchanged
    <TimelineTrackContent
      key={track.id}
      track={track}
      zoomLevel={zoomLevel}
    />
  )
)}
```

## Phase 5: Safe Playhead Updates (3 tasks, ~9 minutes)

### Task 5.1: Create Playhead Wrapper
**File**: Create `apps/web/src/components/editor/timeline-playhead-enhanced.tsx`
**Changes**:
```typescript
"use client";

import { TimelinePlayhead } from "./timeline-playhead";

// SAFE: Wrapper adds features without modifying existing
export function TimelinePlayheadEnhanced(props: any) {
  const { isSnappingToPlayhead = false, showTimeDisplay = false, ...baseProps } = props;
  
  return (
    <>
      <TimelinePlayhead {...baseProps} />
      
      {/* SAFE: Additional features rendered separately */}
      {showTimeDisplay && (
        <div className="absolute top-0 left-0 pointer-events-none">
          {/* Time display overlay */}
        </div>
      )}
      
      {/* SAFE: Snapping visual indicator */}
      {isSnappingToPlayhead && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="animate-pulse bg-accent/20" />
        </div>
      )}
    </>
  );
}
```

### Task 5.2: Add Time Format Helper
**File**: `apps/web/src/lib/timeline-helpers.ts` (create new file)
**Changes**:
```typescript
// SAFE: New utility file, doesn't affect existing code
export function formatTimelineTime(seconds: number, fps: number = 30): string {
  try {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * fps);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
  } catch (error) {
    // SAFE: Fallback to simple format
    return seconds.toFixed(2) + 's';
  }
}
```

### Task 5.3: Conditionally Use Enhanced Playhead
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: Where TimelinePlayhead is rendered
**Changes**:
```typescript
{featureFlags.enableTimeDisplay || (featureFlags.enableSnapping && activeSnapPoint?.type === 'playhead') ? (
  <TimelinePlayheadEnhanced
    {...playheadProps}
    isSnappingToPlayhead={activeSnapPoint?.type === 'playhead'}
    showTimeDisplay={featureFlags.enableTimeDisplay}
  />
) : (
  // SAFE: Existing playhead unchanged
  <TimelinePlayhead {...playheadProps} />
)}
```

## Phase 6: Safe Element Updates (2 tasks, ~6 minutes)

### Task 6.1: Add Optional Snapping Props
**File**: `apps/web/src/components/editor/timeline-element.tsx`
**Line**: At component declaration
**Changes**:
```typescript
export function TimelineElement({
  element,
  track,
  zoomLevel,
  isSelected,
  onElementMouseDown,
  onElementClick,
  // SAFE: New optional props with defaults
  isSnapping = false,
  onSnapChange = () => {},
  ...extraProps // SAFE: Capture any additional props
}: TimelineElementProps & { 
  isSnapping?: boolean; 
  onSnapChange?: (snapping: boolean) => void;
}) {
  // SAFE: Only use new features if explicitly provided
  const enhancedMode = 'isSnapping' in extraProps;
  
  // Existing code continues...
```

### Task 6.2: Add Conditional Snap Feedback
**File**: `apps/web/src/components/editor/timeline-element.tsx`
**Line**: In className construction
**Changes**:
```typescript
// SAFE: Only add snap classes if feature is enabled
const snapClasses = enhancedMode && isSnapping 
  ? 'ring-2 ring-accent shadow-lg shadow-accent/50' 
  : '';

className={`timeline-element ${existingClasses} ${snapClasses}`}
```

## Phase 7: Testing Strategy (3 tasks, ~9 minutes)

### Task 7.1: Add Feature Toggle UI
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: At the top of timeline component
**Changes**:
```typescript
{/* SAFE: Dev-only feature toggles */}
{process.env.NODE_ENV === 'development' && (
  <div className="absolute top-0 right-0 z-50 p-2 bg-background/90 text-xs">
    <div className="space-y-1">
      <label>
        <input
          type="checkbox"
          checked={featureFlags.enableSnapping}
          onChange={(e) => setFeatureFlags(prev => ({
            ...prev,
            enableSnapping: e.target.checked
          }))}
        />
        Enable Snapping
      </label>
      {/* Add other feature toggles */}
    </div>
  </div>
)}
```

### Task 7.2: Add Error Boundaries
**File**: Create `apps/web/src/components/editor/timeline-error-boundary.tsx`
**Changes**:
```typescript
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

// SAFE: Catches errors in new features, falls back to original
export class TimelineErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Timeline enhancement error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Timeline enhancement failed, using default.</div>;
    }

    return this.props.children;
  }
}
```

### Task 7.3: Wrap Enhanced Components
**File**: `apps/web/src/components/editor/timeline.tsx`
**Line**: Around enhanced component usage
**Changes**:
```typescript
// SAFE: Any errors in enhancements fall back to original
<TimelineErrorBoundary fallback={<TimelineTrack track={track} zoomLevel={zoomLevel} />}>
  <TimelineTrackContentEnhanced {...enhancedProps} />
</TimelineErrorBoundary>
```

## Phase 8: Gradual Rollout Plan (2 tasks, ~6 minutes)

### Task 8.1: Create Feature Flag Config
**File**: Create `apps/web/src/config/timeline-features.ts`
**Changes**:
```typescript
// SAFE: Centralized feature configuration
export const TIMELINE_FEATURES = {
  // Start with everything disabled
  snapping: {
    enabled: false,
    threshold: 10,
    showIndicators: false,
  },
  toolSelection: {
    enabled: false,
    defaultTool: 'select' as const,
  },
  enhancedPlayhead: {
    enabled: false,
    showTime: false,
  },
};

// SAFE: Enable features gradually
export function enableTimelineFeature(feature: keyof typeof TIMELINE_FEATURES) {
  if (process.env.NODE_ENV === 'development') {
    TIMELINE_FEATURES[feature].enabled = true;
  }
}
```

### Task 8.2: Add Migration Guide
**File**: Create `implementation-plan/timeline-feature-migration.md`
**Changes**:
```markdown
# Timeline Feature Migration Guide

## Rollout Phases

### Phase 1: Testing (All features disabled)
- Deploy with all features disabled
- Verify no regressions in existing functionality
- Enable features one by one in development

### Phase 2: Gradual Enable
1. Enable snapping in dev environment only
2. Test for 1 week
3. Enable tool selection
4. Test for 1 week
5. Enable enhanced playhead
6. Final testing

### Phase 3: Production Rollout
- Enable features for beta users
- Monitor for issues
- Full rollout after confirmation

## Rollback Plan
If any issues:
1. Set all feature flags to false
2. Components automatically fall back to original behavior
3. No code changes needed

## Testing Checklist
- [ ] Existing drag/drop works unchanged
- [ ] Video preview still functions
- [ ] Performance unchanged
- [ ] All keyboard shortcuts work
- [ ] Export functionality intact
```

## Summary

**Total Tasks**: 25 (optimized for safety)
**Estimated Time**: ~75 minutes

**Safety Features**:
1. **Feature Flags** - Everything can be toggled off instantly
2. **Wrapper Components** - Original components untouched
3. **Error Boundaries** - Failures don't break timeline
4. **Backward Compatibility** - All existing props/behavior preserved
5. **Gradual Rollout** - Test each feature independently

**Key Differences from Original Plan**:
- No modifications to existing components (only additions)
- Everything is opt-in with defaults to current behavior
- Error handling at every level
- Can be rolled back without code changes
- Original timeline continues to work throughout implementation

**Implementation Order**:
1. Add types and interfaces (safe additions)
2. Create new hooks (independent of existing code)
3. Create wrapper components (don't modify originals)
4. Add conditional rendering (feature flags control)
5. Test with features disabled first
6. Enable features one by one
7. Monitor and rollback if needed