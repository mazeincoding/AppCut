# AI Region Sliding Bar Feature Request

## Overview
Add a sliding bar/resizer for the AI region panel to allow users to adjust the width of the AI tools section dynamically.

## Current State
The AI region currently has a fixed width with the following structure:
```html
<div class="flex flex-col gap-2 items-center cursor-pointer px-3 pt-3 pb-2 mx-1 rounded-lg transition-all duration-200 hover:bg-white/10 flex-shrink-0 min-w-[52px] group text-primary bg-primary/10" style="transform: scale(1);">
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bot !size-[1.5rem] transition-all duration-200" aria-hidden="true">
    <path d="M12 8V4H8"></path>
    <rect width="16" height="12" x="4" y="8" rx="2"></rect>
    <path d="M2 14h2"></path>
    <path d="M20 14h2"></path>
    <path d="M15 13v2"></path>
    <path d="M9 13v2"></path>
  </svg>
  <span class="text-[0.65rem] tracking-wide mt-1 leading-none">
    AI<br>
    <span class="text-[0.2rem] leading-none">&nbsp;</span>
  </span>
</div>
```

## Proposed Feature
Add a draggable sliding bar/resizer that allows users to:
- Expand the AI region to show more AI tools and content
- Collapse it to a minimal size for more workspace
- Smooth resize animation and responsive layout

## Implementation Requirements

### 1. Resizer Component
- Add a vertical drag handle on the right edge of the AI panel
- Visual indicator (e.g., dotted line or resize icon)
- Hover and active states for better UX

### 2. State Management
- Store AI panel width in user preferences/localStorage
- Default width and min/max constraints
- Responsive breakpoints for mobile devices

### 3. Layout Integration
- Update the main editor layout to accommodate dynamic AI panel sizing
- Ensure other panels (timeline, preview, etc.) adjust accordingly
- Maintain proper spacing and proportions

### 4. Animation & Transitions
- Smooth resize transitions using CSS transforms
- Snap-to positions (collapsed, default, expanded)
- Prevent layout jumps during resize

## Technical Specifications

### Proposed File Locations
```
apps/web/src/components/editor/
├── ai-panel/
│   ├── ai-panel-resizer.tsx     # New resizer component
│   ├── ai-panel-container.tsx   # Updated AI panel wrapper
│   └── ai-panel-content.tsx     # AI tools content
├── layout/
│   └── editor-layout.tsx        # Update to handle dynamic sizing
└── stores/
    └── ui-store.ts              # Add AI panel width state
```

### Key Features
1. **Drag Handle**: Vertical bar on the right edge of AI panel
2. **Width Constraints**: 
   - Minimum: 52px (icon only)
   - Default: 280px (comfortable working size)
   - Maximum: 400px (full feature display)
3. **Persistence**: Save user preference across sessions
4. **Responsive**: Auto-collapse on mobile/small screens
5. **Keyboard Support**: Arrow keys for accessibility

### CSS Classes Needed
```css
.ai-panel-resizer {
  width: 4px;
  cursor: col-resize;
  background: transparent;
  transition: background-color 0.2s;
}

.ai-panel-resizer:hover {
  background-color: rgba(var(--primary), 0.3);
}

.ai-panel-resizing {
  user-select: none;
  pointer-events: none;
}
```

## User Experience Flow
1. User hovers over AI panel right edge → resize cursor appears
2. User drags to resize → panel width adjusts in real-time
3. Release drag → panel snaps to nearest breakpoint if desired
4. Double-click resize handle → toggle between collapsed/expanded

## Benefits
- **Improved Workflow**: Users can customize their workspace layout
- **Space Efficiency**: More room for timeline/preview when AI tools not needed
- **Better UX**: Expandable panel for complex AI operations
- **Accessibility**: Keyboard navigation support
- **Consistency**: Matches other professional video editing tools

## Priority: Medium
This is a quality-of-life improvement that enhances the user experience but is not critical for core functionality.

## Related Components
- Main editor layout system
- AI tools panel
- Timeline component (may need layout adjustments)
- Video preview area (responsive to available space)

---

**Note**: This feature should integrate seamlessly with the existing Zustand state management and Tailwind CSS styling system already in use in the OpenCut project.