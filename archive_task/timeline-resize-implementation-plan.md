# Timeline Panel Resize Implementation Plan

## Overview
Implement resizable timeline panel with vertical drag handle to allow users to adjust the height of the timeline area, similar to how they can adjust the width between media panel and preview panel.

## Current Structure Analysis

### File: `apps/web/src/pages/editor/project/[project_id].tsx`

**Current Layout Structure:**
```tsx
<div className="h-full flex flex-col bg-background">
  <EditorHeader />
  
  {/* Main content area with horizontal panels */}
  <div className="flex-1 overflow-hidden">
    <ResizablePanelGroup direction="horizontal">
      {/* Media Panel */}
      <ResizablePanel defaultSize={toolsPanel} minSize={15} maxSize={35}>
        <div>
          <MediaPanel />
        </div>
      </ResizablePanel>
      
      <ResizableHandle withHandle />
      
      {/* Preview Panel */}
      <ResizablePanel defaultSize={mainContent}>
        <div>
          <PreviewPanel />
        </div>
      </ResizablePanel>
      
      <ResizableHandle withHandle />
      
      {/* Properties Panel */}
      <ResizablePanel defaultSize={propertiesPanel} minSize={15} maxSize={35}>
        <div>
          <PropertiesPanel />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
  
  {/* Timeline panel - CURRENTLY FIXED HEIGHT */}
  <div className="p-4 pt-2">
    <div className="rounded-xl overflow-hidden">
      <Timeline />
    </div>
  </div>
</div>
```

## Implementation Plan

### Step 1: Restructure Layout with Vertical ResizablePanelGroup

**Modify:** `apps/web/src/pages/editor/project/[project_id].tsx`

Replace the outer flex-col structure with a vertical ResizablePanelGroup:

```tsx
<div className="h-full bg-background">
  <EditorHeader />
  
  <ResizablePanelGroup direction="vertical" className="flex-1">
    {/* Main content area (existing horizontal panels) */}
    <ResizablePanel defaultSize={mainContentHeight} minSize={60} maxSize={85}>
      <div className="h-full overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Media Panel */}
          <ResizablePanel defaultSize={toolsPanel} minSize={15} maxSize={35}>
            <div 
              className="h-full rounded-xl overflow-hidden"
              style={{
                borderTop: '2px solid #ff6b6b',
                borderRight: '2px solid #4ecdc4', 
                borderBottom: '2px solid #45b7d1',
                borderLeft: '2px solid #96ceb4'
              }}
            >
              <MediaPanel />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Preview Panel */}
          <ResizablePanel defaultSize={mainContent}>
            <div 
              className="h-full rounded-xl overflow-hidden"
              style={{
                borderTop: '2px solid #ff6b6b',
                borderRight: '2px solid #4ecdc4', 
                borderBottom: '2px solid #45b7d1',
                borderLeft: '2px solid #96ceb4'
              }}
            >
              <PreviewPanel />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Properties Panel */}
          <ResizablePanel defaultSize={propertiesPanel} minSize={15} maxSize={35}>
            <div 
              className="h-full rounded-xl overflow-hidden"
              style={{
                borderTop: '2px solid #ff6b6b',
                borderRight: '2px solid #4ecdc4', 
                borderBottom: '2px solid #45b7d1',
                borderLeft: '2px solid #96ceb4'
              }}
            >
              {isDialogOpen ? <ExportDialog /> : <PropertiesPanel />}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </ResizablePanel>
    
    {/* Vertical resize handle */}
    <ResizableHandle withHandle />
    
    {/* Timeline panel - NOW RESIZABLE */}
    <ResizablePanel 
      defaultSize={timelineHeight} 
      minSize={15} 
      maxSize={40}
      onResize={(size) => setTimelineHeight(size)}
    >
      <div className="p-4 pt-2 h-full">
        <div 
          className="h-full rounded-xl overflow-hidden"
          style={{
            borderTop: '2px solid #ff6b6b',
            borderRight: '2px solid #4ecdc4', 
            borderBottom: '2px solid #45b7d1',
            borderLeft: '2px solid #96ceb4'
          }}
        >
          <Timeline />
        </div>
      </div>
    </ResizablePanel>
  </ResizablePanelGroup>
</div>
```

### Step 2: Update Panel Store

**Modify:** `apps/web/src/stores/panel-store.ts`

Add timeline height state:

```tsx
interface PanelStore {
  // ... existing properties
  mainContentHeight: number;
  setMainContentHeight: (size: number) => void;
  timelineHeight: number;
  setTimelineHeight: (size: number) => void;
}

export const usePanelStore = create<PanelStore>((set) => ({
  // ... existing state
  mainContentHeight: 75, // Default 75% for main content area
  setMainContentHeight: (size) => set({ mainContentHeight: size }),
  timelineHeight: 25, // Default 25% for timeline
  setTimelineHeight: (size) => set({ timelineHeight: size }),
}));
```

### Step 3: Import Required Dependencies

**In:** `apps/web/src/pages/editor/project/[project_id].tsx`

Ensure imports include:
```tsx
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "../../../components/ui/resizable";
```

Update store import:
```tsx
const {
  toolsPanel,
  setToolsPanel,
  mainContent,  
  setMainContent,
  propertiesPanel,
  setPropertiesPanel,
  mainContentHeight,     // Add this
  setMainContentHeight,  // Add this
  timelineHeight,        // Add this
  setTimelineHeight,     // Add this
} = usePanelStore();
```

### Step 4: Adjust Timeline Component Styling

**Modify:** `apps/web/src/components/editor/timeline.tsx`

Ensure Timeline component handles dynamic height properly:

```tsx
// The Timeline component should adapt to its container height
// Remove any fixed height constraints and use h-full classes
```

## File Paths and Code Changes

### 1. Main Layout File
**Path:** `apps/web/src/pages/editor/project/[project_id].tsx`
- Lines ~280-350: Complete restructure of layout
- Add vertical ResizablePanelGroup wrapper
- Convert timeline from fixed to resizable panel

### 2. Panel Store File  
**Path:** `apps/web/src/stores/panel-store.ts`
- Add `timelineHeight` state property
- Add `setTimelineHeight` setter function
- Set default value to 25%

### 3. Timeline Component (if needed)
**Path:** `apps/web/src/components/editor/timeline.tsx` 
- Ensure responsive height handling
- Remove fixed height constraints
- Use h-full classes for container adaptation

## Expected Behavior

1. **Vertical Drag Handle:** Appears between main content area and timeline panel
2. **Timeline Resizing:** Users can drag to adjust timeline height (15-40% of screen)
3. **State Persistence:** Timeline height preference is stored in panel store
4. **Responsive Layout:** All panels adapt to new dimensions smoothly
5. **Minimum/Maximum Constraints:** Prevent timeline from becoming too small or large

## Technical Considerations

- **Nested ResizablePanelGroups:** Vertical outer group contains horizontal inner group
- **Height Calculations:** Ensure proper height distribution between panels
- **Border Styling:** Maintain colorful borders on all panels
- **Performance:** Smooth resizing without layout thrashing
- **State Management:** Panel sizes stored in Zustand store for persistence

## Testing Checklist

- [ ] Vertical drag handle appears and functions
- [ ] Timeline height adjusts smoothly
- [ ] Minimum/maximum size constraints work
- [ ] Horizontal panel resizing still works
- [ ] Timeline content scales properly
- [ ] Panel state persists across sessions
- [ ] No layout breaking or overflow issues