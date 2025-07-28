# Timeline Components Comparison: GitHub vs Local Implementation

## Overview
This document compares the timeline components from the GitHub repository (OpenCut-app/OpenCut) with the local implementation. The analysis identifies structural differences, missing features, and modifications needed.

## File Structure Differences

### GitHub Structure
- `apps/web/src/components/editor/timeline/timeline-track.tsx`
- `apps/web/src/components/editor/timeline/timeline-playhead.tsx`
- `apps/web/src/components/editor/timeline/index.tsx`
- `apps/web/src/components/editor/timeline/timeline-element.tsx`

### Local Structure
- `apps/web/src/components/editor/timeline-track.tsx`
- `apps/web/src/components/editor/timeline-playhead.tsx`
- `apps/web/src/components/editor/timeline.tsx` (not index.tsx)
- `apps/web/src/components/editor/timeline-element.tsx`

**Key Difference**: Local implementation has timeline components in the editor folder directly, not in a separate timeline subfolder.

## Component-by-Component Analysis

### 1. Timeline Track Component (`timeline-track.tsx`)

#### GitHub Version Key Features:
- Uses `useTimelineSnapping` hook with `SnapPoint` type (line 25)
- Has `onSnapPointChange` prop in component interface (line 29)
- Implements snapping visualization with snap points rendering (lines not shown in preview)
- Simpler drag-and-drop implementation

#### Local Version Key Features:
- No snapping hook usage - implements inline snapping logic
- Complex drag state management with mouse event listeners (lines 60-233)
- More elaborate overlap detection logic (lines 340-460)
- Position-aware track creation for drops (lines 534-542)
- Extensive track type handling for media placement (lines 731-836)

#### Major Differences:
1. **Snapping System**: 
   - GitHub: Uses dedicated `useTimelineSnapping` hook
   - Local: Inline `snapTimeToFrame` calls with project FPS (lines 89-90, 356, 378, etc.)

2. **Drag Implementation**:
   - GitHub: Not fully shown but appears simpler
   - Local: Complex mouse event system with drag state tracking (lines 60-233)

3. **Drop Zones**:
   - GitHub: Basic drop handling
   - Local: Position-aware drops ("above", "on", "below") at lines 534-542

4. **Track Creation**:
   - GitHub: Simple track addition
   - Local: Smart track insertion based on drop position and media type (lines 645-835)

### 2. Timeline Playhead Component (`timeline-playhead.tsx`)

#### GitHub Version Key Features:
- Includes `isSnappingToPlayhead` prop (line 22)
- Has snapping indicator visual feedback
- Includes time formatter function
- More elaborate visual styling with time indicator

#### Local Version Key Features:
- Simpler implementation without snapping indicator
- Uses `useTimelinePlayheadRuler` hook export (lines 86-108)
- Different visual styling (red theme vs primary theme)
- No time display formatter

#### Major Differences:
1. **Snapping Support**:
   - GitHub: Has `isSnappingToPlayhead` prop for visual feedback
   - Local: No snapping indicator support

2. **Visual Design**:
   - GitHub: Uses primary color theme with time display
   - Local: Uses red color theme (line 77) without time display

3. **Height Calculation**:
   - GitHub: Uses `getTotalTracksHeight` or timeline container height
   - Local: Simple container height minus padding (lines 52-53)

### 3. Timeline Index/Main Component

#### GitHub Version (`index.tsx`) Key Features:
- Named export as `Timeline` component
- Has timeline toolbar with zoom controls
- Implements snapping toggle
- Tool selection (select, cut, text)
- More comprehensive keyboard shortcuts

#### Local Version (`timeline.tsx`) Key Features:
- Default export function
- Uses `useTimelineZoom` hook (line 95)
- Selection box implementation (lines 51-52)
- Different import structure (UI components from parent directory)
- Missing tool selection system

#### Major Differences:
1. **Component Organization**:
   - GitHub: Separate toolbar component
   - Local: Inline controls

2. **Selection System**:
   - GitHub: Tool-based selection (select, cut, text tools)
   - Local: Selection box implementation

3. **Zoom Implementation**:
   - GitHub: Toolbar-based zoom controls
   - Local: Hook-based zoom with wheel support (line 95)

### 4. Timeline Element Component (`timeline-element.tsx`)

#### GitHub Version Key Features:
- Simple media type rendering
- Basic context menu
- Standard resize handles
- Audio waveform support

#### Local Version Key Features:
- Video timeline preview support (lines 21-22, 94-98)
- Uses `useVideoTimelinePreview` hook
- Replace media functionality (line 67)
- Split variations (keep left/right) at lines 63-65
- Separate audio feature (line 65)

#### Major Differences:
1. **Preview System**:
   - GitHub: No preview system
   - Local: Advanced video preview on hover (lines 94-98)

2. **Media Operations**:
   - GitHub: Basic operations
   - Local: Replace media, separate audio tracks

3. **Split Functionality**:
   - GitHub: Single split operation
   - Local: Multiple split variants (split, keep left, keep right)

## Required Modifications

### High Priority Changes:

1. **Add Snapping System** (All Components):
   - Implement `useTimelineSnapping` hook
   - Add `SnapPoint` type definitions
   - Add visual snapping indicators
   - Add `onSnapPointChange` callbacks

2. **Timeline Toolbar** (`timeline.tsx`):
   - Extract toolbar into separate component
   - Add tool selection (select, cut, text)
   - Add snapping toggle button
   - Implement proper zoom controls UI

3. **Playhead Snapping** (`timeline-playhead.tsx`):
   - Add `isSnappingToPlayhead` prop
   - Implement snapping visual feedback
   - Add time display with formatter
   - Change color scheme to match GitHub version

4. **Track Component** (`timeline-track.tsx`):
   - Integrate `useTimelineSnapping` hook
   - Add snap point visualization
   - Simplify drag implementation if possible
   - Keep position-aware drops (local advantage)

### Medium Priority Changes:

5. **File Structure**:
   - Consider moving timeline components to subfolder
   - Organize imports consistently
   - Align with GitHub repository structure

6. **Element Preview**:
   - Keep local video preview feature (advantage)
   - Add configuration for preview behavior
   - Optimize preview performance

7. **Keyboard Shortcuts**:
   - Align shortcuts with GitHub version
   - Add missing tool shortcuts
   - Document shortcut system

### Low Priority Changes:

8. **Visual Consistency**:
   - Align color schemes between components
   - Standardize spacing and sizing
   - Match GitHub UI patterns

9. **Type Definitions**:
   - Add missing type exports
   - Align prop interfaces
   - Add proper JSDoc comments

10. **Performance Optimizations**:
    - Review drag performance
    - Optimize overlap calculations
    - Add memoization where needed

## Implementation Notes

- Local version has several advanced features not in GitHub version (video previews, smart track insertion, position-aware drops)
- GitHub version has better architectural patterns (hooks, separation of concerns)
- Recommend keeping local advantages while adopting GitHub's architectural improvements
- Snapping system is the most critical missing feature in local version
- Timeline toolbar extraction would improve maintainability

---

*This comparison provides a roadmap for aligning the local timeline implementation with the GitHub version while preserving valuable local enhancements.*