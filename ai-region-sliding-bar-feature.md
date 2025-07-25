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

### Current ResizablePanel System Integration
The OpenCut editor already uses `@radix-ui/react-resizable-panels` for layout management. The AI sliding bar feature can leverage this existing system.

### Relevant File Paths and Implementation Points

#### **Main Layout File (ResizablePanel System)**
**File**: `apps/web/src/pages/editor/project/[project_id].tsx`
- **Line 304**: Main horizontal ResizablePanelGroup for editor layout
- **Line 306-314**: Media Panel (AI panel) ResizablePanel configuration
  ```typescript
  <ResizablePanel 
    defaultSize={toolsPanel}  // Currently from panel-store.ts
    minSize={15} 
    maxSize={35}
    onResize={(size) => setToolsPanel(size)}
  >
  ```
- **Line 315**: MediaPanel component integration
- **Line 11**: MediaPanel import statement

#### **Panel State Management**
**File**: `apps/web/src/stores/panel-store.ts`
- **Line 5**: DEFAULT_PANEL_SIZES configuration (toolsPanel: 45)
- **Line 16**: toolsPanel property definition
- **Line 25**: setToolsPanel action definition
- **Need to Add**: AI-specific panel width state and constraints

#### **AI Panel Components**
**File**: `apps/web/src/components/editor/media-panel/index.tsx`
- **Line 8**: AiView import
- **Line 55**: AI view mapping in viewMap
- **Line 59**: Main container div with styling classes
- **Need to Add**: Resizer handle and dynamic width management

#### **AI Tab Configuration**
**File**: `apps/web/src/components/editor/media-panel/store.ts`
- **Line 28**: "ai" tab definition
- **Line 58**: AI tab icon configuration (BotIcon)
- **Need to Add**: AI panel width state management

#### **AI Content Component**
**File**: `apps/web/src/components/editor/media-panel/views/ai.tsx`
- **Line 612**: Main AiView component container div
- **Line 615**: Header section with BotIcon
- **Line 632**: Tab content area that needs responsive layout
- **Line 746**: Generate button that should adapt to width
- **Line 765**: AI models grid that needs responsive columns
- **Need to Modify**: Add responsive layout based on panel width

#### **Tab Bar System**
**File**: `apps/web/src/components/editor/media-panel/tabbar.tsx`
- **Current**: Fixed icon-only layout in collapsed state
- **Need to Modify**: Show/hide tab labels based on panel width

### Proposed New File Locations
```
apps/web/src/components/editor/media-panel/
├── ai-panel-resizer.tsx         # New: Drag handle component
├── resizable-ai-panel.tsx       # New: Enhanced AI panel with resizer
└── hooks/
    └── use-panel-resize.tsx     # New: Custom hook for resize logic
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

### Implementation Strategy

#### **Option 1: Enhance Existing ResizablePanel (Recommended)**
Leverage the existing ResizablePanel system by:
1. **Modifying ResizablePanel Props** in `[project_id].tsx:306-314`
2. **Adding AI-specific width constraints** in `panel-store.ts`
3. **Creating responsive AI content** in `ai.tsx`

#### **Option 2: Custom Resizer Component**
Create a dedicated AI panel resizer for more granular control.

### ResizablePanel Integration Points

#### **Current Media Panel Configuration** (`[project_id].tsx:306-314`)
```typescript
<ResizablePanel 
  defaultSize={toolsPanel}     // From panel-store.ts (45%)
  minSize={15}                 // Current minimum (15%)
  maxSize={35}                 // Current maximum (35%)
  onResize={(size) => setToolsPanel(size)}
>
```

#### **Proposed AI-Specific Enhancement**
```typescript
<ResizablePanel 
  defaultSize={toolsPanel}
  minSize={aiPanelMinSize}     // New: Dynamic based on content
  maxSize={aiPanelMaxSize}     // New: AI-specific constraints
  onResize={(size) => {
    setToolsPanel(size);
    setAiPanelWidth(size);     // New: AI-specific tracking
  }}
>
```

### Panel Store Extensions Needed

#### **Add to `panel-store.ts`**
```typescript
// Line 5: Add to DEFAULT_PANEL_SIZES
aiPanelWidth: 280,           // Default AI panel width in px
aiPanelMinWidth: 52,         // Collapsed state (icon only)
aiPanelMaxWidth: 400,        // Expanded state

// Line 16: Add to interface
aiPanelWidth: number;
aiPanelMinWidth: number;
aiPanelMaxWidth: number;

// Line 25: Add actions
setAiPanelWidth: (width: number) => void;
getAiPanelConstraints: () => { min: number; max: number };
```

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

.ai-panel-content {
  transition: width 0.2s ease-in-out;
}

.ai-panel-collapsed {
  min-width: 52px;
  max-width: 52px;
}

.ai-panel-expanded {
  min-width: 280px;
  max-width: 400px;
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

## Implementation Checklist

### Phase 1: Core ResizablePanel Enhancement
- [ ] **Panel Store Updates** (`panel-store.ts:5,16,25`)
  - [ ] Add AI panel width state properties
  - [ ] Add AI panel constraint getters
  - [ ] Add AI panel resize actions

- [ ] **Main Layout Integration** (`[project_id].tsx:306-314`)
  - [ ] Add AI-specific min/max size calculation
  - [ ] Integrate AI panel resize handler
  - [ ] Add conditional sizing based on active tab

### Phase 2: Responsive AI Content
- [ ] **AI View Responsiveness** (`ai.tsx:612,632,746,765`)
  - [ ] Add width-based layout switching
  - [ ] Implement responsive model grid
  - [ ] Add compact/expanded button layouts
  - [ ] Handle text truncation in narrow mode

- [ ] **Tab Bar Adaptation** (`tabbar.tsx`)
  - [ ] Add width-based label visibility
  - [ ] Implement icon-only collapsed mode
  - [ ] Add smooth label transitions

### Phase 3: Advanced Features
- [ ] **Custom Resize Hooks** (New: `hooks/use-panel-resize.tsx`)
  - [ ] Implement drag gesture handling
  - [ ] Add snap-to-position logic
  - [ ] Create keyboard resize support

- [ ] **Visual Enhancements**
  - [ ] Add resize handle visual indicators
  - [ ] Implement smooth transition animations
  - [ ] Add resize preview during drag

### Phase 4: Persistence & Settings
- [ ] **User Preferences**
  - [ ] Save AI panel width to localStorage
  - [ ] Restore panel width on app load
  - [ ] Add settings panel integration

## Dependencies & Compatibility

### Existing Dependencies (Already Available)
- **@radix-ui/react-resizable-panels**: Core resizing functionality
- **zustand**: State management with persistence
- **tailwindcss**: CSS styling system
- **lucide-react**: Icons for resize handles

### No Additional Dependencies Required
This feature leverages the existing OpenCut technology stack without requiring new external dependencies.

### Browser Compatibility
- **Desktop**: Full feature support
- **Tablet**: Adaptive touch-friendly resize
- **Mobile**: Auto-collapse to icon-only mode

---

**Note**: This feature integrates seamlessly with the existing Zustand state management, Tailwind CSS styling system, and @radix-ui ResizablePanel architecture already in use in the OpenCut project.