# Video Clip Dragging Issue - Fix Guide

## Problem Description
Video clips cannot be dragged to different positions on the timeline after disabling VideoTimelinePreview component.

## Root Cause Analysis
Selection box system is interfering with drag operations. The `justFinishedSelecting` flag prevents drag handlers from executing.

## Key Files and Current Code

### 1. Selection Box Hook
**File:** `C:\Users\zdhpe\Desktop\New folder\OpenCut\apps\web\src\hooks\use-selection-box.ts`

**Problem Code (lines 35-37):**
```typescript
// Only start selection on empty space clicks
if ((e.target as HTMLElement).closest(".timeline-element")) {
  return;
}
```

**Problem Code (lines 169-176):**
```typescript
if (selectionBox?.isActive) {
  console.log(JSON.stringify({ settingJustFinishedSelecting: true }));
  setJustFinishedSelecting(true);
  // Clear the flag after a short delay to allow click events to check it
  setTimeout(() => {
    console.log(JSON.stringify({ clearingJustFinishedSelecting: true }));
    setJustFinishedSelecting(false);
  }, 50);
}
```

### 2. Timeline Click Handler
**File:** `C:\Users\zdhpe\Desktop\New folder\OpenCut\apps\web\src\components\editor\timeline.tsx`

**Problem Code (lines 178-179):**
```typescript
// Don't seek if this was a selection box operation
if (isSelecting || justFinishedSelecting) {
  return; // This blocks all timeline interactions after selection
}
```

### 3. Timeline Element Handlers
**File:** `C:\Users\zdhpe\Desktop\New folder\OpenCut\apps\web\src\components\editor\timeline-element.tsx`

**Current Code (lines 375-379):**
```typescript
const handleElementMouseDown = (e: React.MouseEvent) => {
  if (onElementMouseDown) {
    onElementMouseDown(e, element);
  }
};
```

**Current Code (lines 414-418):**
```typescript
onClick={(e) => onElementClick && onElementClick(e, element)}
onMouseDown={handleElementMouseDown}
onContextMenu={(e) => onElementMouseDown && onElementMouseDown(e, element)}
{...videoPreview.handlers}
```

## Solutions Implemented ✅

### Primary Fix: Timeline Click Handler Priority
**File:** `C:\Users\zdhpe\Desktop\New folder\OpenCut\apps\web\src\components\editor\timeline.tsx`

**Changed lines 178-186 from:**
```typescript
// Don't seek if this was a selection box operation
if (isSelecting || justFinishedSelecting) {
  return;
}

// Don't seek if clicking on timeline elements, but still deselect
if ((e.target as HTMLElement).closest(".timeline-element")) {
  return;
}
```

**To:**
```typescript
// Don't seek if this was a selection box operation
if (isSelecting) {
  return;
}

// Don't seek if clicking on timeline elements, but still deselect
if ((e.target as HTMLElement).closest(".timeline-element")) {
  return;
}

// Don't seek if we just finished selecting (but allow element interactions)
if (justFinishedSelecting) {
  return;
}
```

### Secondary Fix: Event Propagation Control ✅
**File:** `C:\Users\zdhpe\Desktop\New folder\OpenCut\apps\web\src\components\editor\timeline-element.tsx`

**Changed lines 375-379 from:**
```typescript
const handleElementMouseDown = (e: React.MouseEvent) => {
  if (onElementMouseDown) {
    onElementMouseDown(e, element);
  }
};
```

**To:**
```typescript
const handleElementMouseDown = (e: React.MouseEvent) => {
  e.stopPropagation(); // Prevent selection box from interfering with drag
  if (onElementMouseDown) {
    onElementMouseDown(e, element);
  }
};
```

## Testing
1. Load video file into timeline
2. Try dragging video element to new position
3. Verify element moves correctly