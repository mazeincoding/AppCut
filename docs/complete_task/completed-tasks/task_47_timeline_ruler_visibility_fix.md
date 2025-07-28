# Timeline Ruler Time Labels Visibility Fix

## Problem Analysis
Based on the screenshot, the timeline ruler time labels (0s, 1s, 2s, 3s, etc.) are completely invisible because:
1. The ruler container height is too small (only ~16-20px tall based on `h-4` class)
2. The text is positioned with `top-1` (4px from top) inside a 16px container
3. With text size of `0.6rem` (~9.6px), there's not enough vertical space
4. The time labels appear to be cut off or hidden due to overflow

## File Path
`apps/web/src/components/editor/timeline.tsx`

## Current Issue
Looking at the HTML structure:
```html
<div class="flex-1 relative overflow-hidden h-4" data-ruler-area="true">
```

The ruler container has:
- `h-4` class = 16px height
- `overflow-hidden` = cuts off any content that exceeds the container

Inside, the time labels use:
```tsx
<span className="absolute top-1 left-1 text-[0.6rem] text-muted-foreground font-medium">
  {timeLabel}
</span>
```

With only 16px height and 4px top offset, the ~10px text has no room to display properly.

## Solution Plan

### Option 1: Increase Ruler Height (RECOMMENDED)
The main issue is the container height. Change from `h-4` to `h-6` or `h-8`:
```tsx
// Change the ruler container height
<div className="flex-1 relative overflow-hidden h-6" data-ruler-area="true">

// Adjust text positioning for better visibility
<span className="absolute top-0 left-1 text-[0.6rem] text-muted-foreground font-medium">
  {timeLabel}
</span>
```

### Option 2: Reduce Text Size and Adjust Position
Keep current height but optimize text:
```tsx
<span className="absolute top-0 left-1 text-[0.5rem] text-muted-foreground font-medium">
  {timeLabel}
</span>
```

### Option 3: Move Labels Outside Border Lines
Position labels between the tick marks instead of on them:
```tsx
<div className="absolute top-0 bottom-0" style="left: {position}px;">
  <div className="border-l border-muted-foreground/40 h-full"></div>
  <span className="absolute top-0 left-2 text-[0.6rem] text-muted-foreground font-medium">
    {timeLabel}
  </span>
</div>
```

### Option 4: Increase Both Height and Optimize Layout
Best solution - increase container height AND improve text positioning:
```tsx
// Container with better height
<div className="flex-1 relative overflow-hidden h-7" data-ruler-area="true">

// Ruler marks and labels
<div className="relative h-7 select-none cursor-default" style="width: {width}px;">
  {timeMarkers.map((time, index) => (
    <div key={index} className="absolute top-0 bottom-0 border-l border-muted-foreground/40" style={{left: `${position}px`}}>
      <span className="absolute top-0.5 left-1.5 text-[0.65rem] text-foreground/60 font-medium">
        {time}s
      </span>
    </div>
  ))}
</div>
```

## Implementation Steps
1. Locate the timeline ruler rendering code in `timeline.tsx`
2. Find where the time labels are generated (likely in a map or loop)
3. Update the className for the span elements
4. Test visibility at different zoom levels
5. Ensure labels don't overlap at high zoom levels

## Additional Improvements
- Consider adding a subtle shadow or outline to the text for better readability
- Ensure consistent spacing between labels
- Add hover effects to highlight specific time markers
- Consider using a monospace font for time values for better alignment