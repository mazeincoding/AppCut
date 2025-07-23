# Timeline Playhead Visibility Solution

## File Path
`apps/web/src/components/editor/timeline-playhead.tsx`

## Problem
Based on the screenshot, the timeline playhead (red vertical line) in the video editor is barely visible. The thin red line needs to be much more prominent for better user experience.

## Solution Applied

### Changes Made:

#### 1. Z-Index Increase (Line 67)
```tsx
// Before:
className="absolute pointer-events-auto z-[100]"

// After:
className="absolute pointer-events-auto z-[999]"
```

#### 2. Red Line Enhancement (Line 77)
```tsx
// Before:
<div className="absolute left-0 w-0.5 bg-foreground cursor-col-resize h-full" />

// After:
<div className="absolute left-0 w-1 bg-red-500 cursor-col-resize h-full shadow-lg shadow-red-500/50" />
```

#### 3. Red Dot Enhancement (Line 80)
```tsx
// Before:
<div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-foreground rounded-full border-2 border-foreground shadow-sm" />

// After:
<div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-red-600 shadow-lg shadow-red-500/50" />
```

## Improvements Made:
- **Higher z-index**: Moved from `z-[100]` to `z-[999]` to ensure it appears above other elements
- **Brighter red color**: Changed from `bg-foreground` to `bg-red-500` for better visibility
- **Wider line**: Increased from `w-0.5` (2px) to `w-1` (4px) for better visibility
- **Added glow effect**: Added `shadow-lg shadow-red-500/50` to create a red glow around the playhead
- **Consistent styling**: Applied red theme to both the line and the dot indicator

The playhead should now be much more visible in the timeline interface.