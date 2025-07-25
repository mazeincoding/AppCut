# AI Region Vertical Sliding Bar Feature

## Overview
The AI panel resizing functionality is **partially implemented** in OpenCut. The system already uses ResizablePanel with AI-specific sizing when the AI tab is active. However, based on the screenshot analysis, the visual vertical resize bar indicator may not be clearly visible or styled appropriately.

## Current Implementation Status

### ✅ Already Implemented
1. **ResizablePanel System** (`apps/web/src/pages/editor/project/[project_id].tsx`)
   - Lines 311-324: AI panel with dynamic sizing based on active tab
   - Uses `getAiPanelSizeForTab()` for AI-specific constraints
   - Automatically adjusts size when AI tab is active

2. **AI Panel State Management** (`apps/web/src/stores/panel-store.ts`)
   - Lines 13-15: AI panel width configuration (default: 22%, min: 4%, max: 30%)
   - Lines 64-70: `setAiPanelWidth()` action with validation
   - Lines 80-106: `getAiPanelSizeForTab()` for dynamic sizing

### ❌ Missing/Needs Enhancement
- **Visual Resize Handle**: No visible vertical bar indicator in the screenshot
- **Hover States**: Resize cursor and visual feedback not apparent
- **Responsive Content**: AI content doesn't adapt to panel width changes

## Enhancement Requirements

### 1. Visual Resize Handle
The ResizablePanel functionality exists but needs visual enhancement:
- Add visible vertical bar between panels
- Style the existing ResizableHandle component
- Match dark theme with subtle gray line

### 2. Responsive AI Content
The AI view needs to adapt to panel width:
- Collapse to icon-only at minimum width (4%)
- Show/hide model descriptions based on available space
- Responsive button and input field layouts


## Implementation Details

### Existing Code Locations

#### **ResizablePanel Integration** (`apps/web/src/pages/editor/project/[project_id].tsx`)
```typescript
// Lines 311-324: Current implementation
<ResizablePanel 
  defaultSize={getAiPanelSizeForTab(activeTab || 'media').defaultSize || 22} 
  minSize={getAiPanelSizeForTab(activeTab || 'media').minSize || 4} 
  maxSize={getAiPanelSizeForTab(activeTab || 'media').maxSize || 30}
  onResize={(size) => {
    const validSize = typeof size === 'number' && !isNaN(size) ? size : 22;
    setToolsPanel(validSize);
    if (activeTab === 'ai') {
      setAiPanelWidth(validSize);
    }
  }}
>
```

#### **Panel Store** (`apps/web/src/stores/panel-store.ts`)
- Lines 13-15: AI panel sizing constants
- Lines 64-70: setAiPanelWidth with validation
- Lines 80-106: getAiPanelSizeForTab logic

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


### Required Enhancements

#### 1. **Add ResizableHandle Visual Styling**
Need to add the ResizableHandle component between panels:
```typescript
// After line 324 in [project_id].tsx
<ResizableHandle className="ai-panel-resizer" />
```

#### 2. **Style the Resize Handle**
Add to global CSS or create styled component:
```css
.ai-panel-resizer {
  width: 6px;
  background: transparent;
  position: relative;
  cursor: col-resize;
}

.ai-panel-resizer::before {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 1px;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.2s;
}

.ai-panel-resizer:hover::before {
  width: 2px;
  background: rgba(59, 130, 246, 0.5);
}
```


## Summary

The AI panel resizing functionality is **partially implemented** using ResizablePanel. The core state management and dynamic sizing logic exist, but the feature needs:

1. **Visual Enhancement**: Add visible resize handle with proper styling
2. **Responsive Content**: Make AI view adapt to panel width changes
3. **User Feedback**: Add hover states and visual indicators

This is primarily a UI/UX enhancement rather than a full feature implementation.


## Implementation Checklist

### ✅ Already Completed
- [x] Panel Store AI width state properties
- [x] AI panel constraint getters (`getAiPanelConstraints`)
- [x] AI panel resize actions (`setAiPanelWidth`)
- [x] AI-specific min/max size calculation
- [x] Conditional sizing based on active tab
- [x] Persistence via zustand middleware

### 🔲 To Be Implemented

#### Phase 1: Visual Enhancements
- [ ] Add ResizableHandle component with styling
- [ ] Implement visual resize indicator
- [ ] Add hover and active states

#### Phase 2: Responsive AI Content
- [ ] Make AI view responsive to panel width
- [ ] Implement collapsed icon-only mode
- [ ] Add responsive model grid layout
- [ ] Handle text truncation in narrow mode

#### Phase 3: Polish
- [ ] Add double-click to toggle collapsed/expanded
- [ ] Implement keyboard navigation (Alt+Left/Right)
- [ ] Add smooth transition animations


## Visual Mockup (Based on Screenshot)

### Current State vs Proposed Enhancement
```
Current (Fixed Width):          Proposed (With Vertical Resizer):
┌─────────────┬──────────┐     ┌─────────────┬─┬────────┐
│   AI Panel  │  Content │     │   AI Panel  │║│Content │
│  (Fixed)    │   Area   │     │ (Resizable) │║│  Area  │
│             │          │     │             │║│        │
│ • Models    │          │     │ • Models    │║│        │
│ • Input     │          │     │ • Input     │║│        │
│ • Generate  │          │     │ • Generate  │║│        │
└─────────────┴──────────┘     └─────────────┴─┴────────┘
                                              ↑
                                    Vertical Resize Bar
```

### Resize States
1. **Collapsed (52px)**: Shows only AI icon
2. **Default (280px)**: Shows all AI features comfortably
3. **Expanded (400px)**: Maximum space for AI tools

**Note**: This feature integrates seamlessly with the existing Zustand state management, Tailwind CSS styling system, and @radix-ui ResizablePanel architecture already in use in the OpenCut project. The vertical sliding bar will match the dark theme aesthetic shown in the screenshot.