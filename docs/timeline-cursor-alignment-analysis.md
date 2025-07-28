# Timeline Cursor Alignment Analysis

## Problem Statement
The mouse cursor does not align with the red timeline playhead line when dragging. The cursor appears 200px to the left of the red line. The user wants to keep the red line position correct but move the cursor display 200px to the right to align with the red line.

## Current Situation Analysis

### Visual Structure (Correct - Don't Change)
```
Timeline View:
                                    ┌─Red Line (CORRECT)─┐
                                    │                    │
                                    │                    │
                                    └────────────────────┘
                                              
Mouse Cursor Position: ← 200px gap → Red Line Position
         ↓                                    ↓
    [Cursor Here]                      [Red Line Here]
```

### Mouse Cursor Behavior (The Issue)
- **Red line position**: Correct at position `X + 200px` and should not be moved
- **Mouse cursor appears at**: `X` (200px left of red line)  
- **Desired behavior**: Cursor should appear at `X + 200px` (same position as red line)
- **Goal**: Move cursor display 200px right to align with red line

## Root Cause: CSS Cursor Property Limitation

### Why This Happens
1. **CSS `cursor: col-resize`**: Shows system cursor at exact mouse position
2. **Red line offset**: Positioned 200px right of where cursor appears
3. **No native CSS solution**: CSS cannot offset cursor display position
4. **Browser limitation**: Cursor always appears at actual mouse coordinates
5. **Timeline positioning calculation**: Creates large visual disconnect

### Technical Constraint
```css
/* Current (what we have) */
.playhead {
  cursor: col-resize; /* Shows at exact mouse position */
  left: 'calculated-position'; /* Red line 200px right of cursor */
}

/* What we want (not possible with CSS) */
.playhead {
  cursor: col-resize;
  cursor-offset: 200px 0px; /* ❌ This doesn't exist */
}
```

## Solution: Hide System Cursor + Fake Cursor

### Implementation Approach ⭐ **RECOMMENDED**
**Concept**: Hide real cursor, create fake cursor element that appears at red line position
- **How**: `cursor: none` + JavaScript mouse tracking + positioned div at mouse position + 200px
- **Pros**: Complete control, normal cursor size, perfect alignment with red line
- **Cons**: Complex implementation, potential performance issues
- **Result**: Cursor appears exactly where the red line is, 200px right of actual mouse position

### Relevant Files for Implementation

#### 1. Timeline Playhead Component
**File**: `apps/web/src/components/editor/timeline-playhead.tsx`
- **Current Issue**: Mouse events handled here, cursor shows 200px left of red line
- **Changes Needed**: 
  - Add `cursor: 'none'` to container style to hide system cursor
  - Create fake cursor element that tracks mouse position
  - Position fake cursor 200px right of actual mouse position (to align with red line)

#### 2. Timeline Playhead Hook
**File**: `apps/web/src/hooks/use-timeline-playhead.ts` ✅ **CONFIRMED EXISTS**
- **Current Role**: Handles mouse tracking and playhead positioning logic
- **Current Functions**:
  - `handlePlayheadMouseDown` - Handles playhead drag start
  - `handleRulerMouseDown` - Handles ruler clicks  
  - `handleScrub` - Calculates time from mouse position
  - Mouse move/up event listeners (lines 86-123)
- **Changes Needed**:
  - Add fake cursor position state (`useState<{x: number, y: number}>`)
  - Track mouse movement for fake cursor updates in existing `onMouseMove` handler
  - Return fake cursor position from hook

#### 3. Timeline Constants  
**File**: `apps/web/src/constants/timeline-constants.ts` ✅ **CONFIRMED EXISTS**
- **Current Role**: Defines timeline positioning constants
- **Current Constants**:
  - `PIXELS_PER_SECOND: 80` - Timeline scale factor
  - `TIMELINE_CONSTANTS` - Various timeline measurements
- **Usage**: May need to add cursor offset constant for consistent positioning
- **Suggested Addition**: `CURSOR_OFFSET_PX: 200` for fake cursor positioning

### Code Implementation Areas

#### 1. Hide System Cursor
```css
/* In timeline-playhead.tsx container */
style={{
  cursor: 'none', /* Hide system cursor so we can show fake one at red line position */
  /* ... existing styles ... */
}}
```

#### 2. Fake Cursor Element (Add to TimelinePlayhead component)
```tsx
/* Add to TimelinePlayhead component after red line div */
const { playheadPosition, handlePlayheadMouseDown, fakeCursorPosition } = useTimelinePlayhead({
  // ... existing props
});

return (
  <div /* existing container with cursor: 'none' */>
    {/* Existing red line */}
    <div className="absolute cursor-col-resize h-full select-none" /* existing red line */ />
    
    {/* Add fake cursor element */}
    {fakeCursorPosition.x > 0 && (
      <div 
        className="fake-cursor fixed z-[9999]"
        style={{
          left: `${fakeCursorPosition.x + 200}px`, /* Show cursor 200px right of actual mouse position */
          top: `${fakeCursorPosition.y - 10}px`, /* Center vertically */
          pointerEvents: 'none',
          transform: 'translate(-50%, -50%)', /* Center the cursor icon */
        }}
      >
        <FakeCursor />
      </div>
    )}
  </div>
);
```

#### 3. Mouse Tracking Logic (Update Existing Hook)
```tsx
/* Add to useTimelinePlayhead hook - modify existing onMouseMove */
const [fakeCursorPosition, setFakeCursorPosition] = useState({ x: 0, y: 0 });

// Modify existing onMouseMove handler (line 88):
const onMouseMove = (e: MouseEvent) => {
  handleScrub(e); // Existing logic
  
  // Add fake cursor tracking
  setFakeCursorPosition({ 
    x: e.clientX, // Track actual mouse position
    y: e.clientY 
  });
  
  // Mark that we've dragged if ruler drag is active
  if (isDraggingRuler) {
    setHasDraggedRuler(true);
  }
};

// Return fake cursor position from hook
return {
  playheadPosition,
  handlePlayheadMouseDown,
  handleRulerMouseDown,
  isDraggingRuler,
  fakeCursorPosition, // Add this
};
```

### Fake Cursor Visual Design
```tsx
/* Fake cursor appearance - col-resize style */
const FakeCursor = () => (
  <div className="fake-cursor" style={{
    width: '20px',
    height: '20px',
    background: 'transparent',
    border: 'none',
    pointerEvents: 'none',
    zIndex: 9999
  }}>
    {/* Col-resize arrows using CSS or SVG */}
    <div style={{
      width: '2px',
      height: '16px',
      background: '#000',
      margin: '0 auto',
      position: 'relative'
    }}>
      {/* Top arrow */}
      <div style={{
        position: 'absolute',
        top: '-2px',
        left: '-2px',
        width: '0',
        height: '0',
        borderLeft: '3px solid transparent',
        borderRight: '3px solid transparent',
        borderBottom: '4px solid #000',
      }} />
      {/* Bottom arrow */}
      <div style={{
        position: 'absolute',
        bottom: '-2px',
        left: '-2px',
        width: '0',
        height: '0',
        borderLeft: '3px solid transparent',
        borderRight: '3px solid transparent',
        borderTop: '4px solid #000',
      }} />
    </div>
  </div>
);
```

### Implementation Steps
1. **Hide System Cursor**: `cursor: none` on timeline area
2. **Track Mouse**: JavaScript mouse move events in playhead hook (track actual position)
3. **Position Fake Cursor**: Fixed positioned div at mouse position + 200px right
4. **Cursor Style**: Col-resize appearance via CSS (shown above)
5. **Result**: User sees cursor exactly where red line is, even though mouse is 200px left

## Technical Constraints Summary

### What CSS Can Do
- ✅ Change cursor appearance
- ✅ Set cursor hotspot position (in custom cursors)
- ✅ Provide fallback cursors

### What CSS Cannot Do
- ❌ Offset system cursor from mouse position
- ❌ Adjust cursor coordinates dynamically
- ❌ Create cursor position independent of mouse coordinates

### JavaScript Limitations
- ✅ Can hide cursor and create fake one
- ✅ Can track mouse movement precisely
- ❌ Cannot adjust system cursor position
- ❌ Creates complexity and performance overhead

## Conclusion

For **moving cursor display 200px right** to align with the red line, the **fake cursor approach** is the only practical solution:

### Why This Approach Works:
- ✅ Preserves existing red line positioning (as requested)
- ✅ Normal-sized cursor appearance (not 200px wide)
- ✅ Cursor appears exactly at red line position
- ✅ Mouse still works at actual position, but cursor displays 200px right
- ✅ Perfect visual alignment without changing red line logic

### Implementation Summary:
1. Set `cursor: none` on timeline interaction area to hide system cursor
2. Track actual mouse position with JavaScript  
3. Create fake cursor element positioned at `mousePosition.x + 200px`
4. Style fake cursor to look like system `col-resize` cursor
5. Result: User sees cursor at red line position, mouse interaction works normally

### User Experience:
- **Mouse position**: User clicks and drags at actual mouse location
- **Cursor display**: Shows 200px to the right (at red line position)  
- **Visual feedback**: Perfect alignment between cursor and red line
- **Functionality**: All mouse interactions work exactly as before

This approach solves the visual misalignment while keeping all existing functionality intact.