# Timeline Snapping System - Testing Scenarios

## Overview
This document outlines comprehensive testing scenarios for the newly implemented timeline snapping system. All features are enabled through feature flags and can be safely disabled if issues arise.

## Feature Flag Status
```typescript
const featureFlags = {
  enableSnapping: true,           // ✅ Core snapping logic
  enableSnapVisualization: true,  // ✅ Visual snap indicators
  enableToolSelection: true,      // ✅ Enhanced toolbar
  enableTimeDisplay: true,        // ✅ Playhead time display
};
```

## Test Scenarios

### 1. Basic Element Snapping
**Objective**: Verify elements snap to other elements during drag operations

**Steps**:
1. Add two video clips to the timeline with some space between them
2. Drag the second clip towards the first clip
3. Observe snapping behavior when clips get close to each other

**Expected Results**:
- Elements should snap when within ~10 pixels of each other
- Visual indicator (accent ring/shadow) should appear on snapping element
- Snapped position should be frame-accurate
- No overlap should occur

### 2. Playhead Snapping
**Objective**: Test element snapping to playhead position

**Steps**:
1. Position playhead at 5-second mark
2. Drag an element near the playhead
3. Observe snapping behavior

**Expected Results**:
- Element should snap to playhead position when close
- "Snap to Playhead" context menu option should work
- Visual feedback should indicate snapping

### 3. Grid Snapping
**Objective**: Verify elements snap to frame boundaries

**Steps**:
1. Set project FPS to 30fps
2. Drag element to various positions
3. Check if element positions align to frame boundaries

**Expected Results**:
- All element positions should be multiples of 1/30 seconds
- Frame-accurate positioning maintained
- No sub-frame positioning allowed

### 4. Enhanced Toolbar Testing
**Objective**: Test new toolbar features

**Steps**:
1. Check toolbar displays tool selection (Select, Cut, Text)
2. Toggle snapping on/off using toolbar control
3. Verify visual feedback for active states

**Expected Results**:
- Tool selection buttons appear and function
- Snapping toggle affects drag behavior
- Active states visually indicated

### 5. Time Display Testing
**Objective**: Verify playhead time display functionality

**Steps**:
1. Move playhead to various positions
2. Check time display accuracy
3. Test different zoom levels

**Expected Results**:
- Time displays in HH:MM:SS.FF format
- Updates in real-time with playhead movement
- Remains visible and properly positioned

### 6. Performance Testing
**Objective**: Ensure snapping doesn't degrade performance

**Steps**:
1. Create timeline with 20+ elements
2. Drag elements while monitoring performance
3. Test at different zoom levels

**Expected Results**:
- Smooth drag operations (60fps)
- No noticeable lag during snapping
- Memory usage remains stable

### 7. Fallback Testing
**Objective**: Verify safe fallback behavior

**Steps**:
1. Disable feature flags one by one
2. Test timeline functionality with flags disabled
3. Verify no breaking changes

**Expected Results**:
- Original timeline behavior preserved when flags disabled
- No errors or crashes
- Graceful degradation of enhanced features

## Manual Testing Checklist

### Core Functionality
- [ ] Elements can be dragged normally
- [ ] Snapping works for element-to-element
- [ ] Snapping works for element-to-playhead  
- [ ] Grid snapping maintains frame accuracy
- [ ] Context menu "Snap to Playhead" works
- [ ] Timeline toolbar shows enhanced tools
- [ ] Playhead displays time when enabled

### Visual Feedback
- [ ] Snapping elements show accent ring/shadow
- [ ] Snap indicators appear on tracks
- [ ] Time display follows playhead correctly
- [ ] Active tool states visually indicated
- [ ] No visual glitches or artifacts

### Edge Cases
- [ ] Snapping works at timeline edges (0 seconds)
- [ ] Snapping disabled when feature flags off
- [ ] Multiple elements don't cause conflicts
- [ ] Zoom level changes don't break snapping
- [ ] Track switching preserves snapping behavior

### Performance
- [ ] Dragging remains smooth with many elements
- [ ] No memory leaks during extended use
- [ ] Snapping calculations don't block UI
- [ ] Bundle size impact minimal (<5KB)

## Known Limitations
1. Canvas thumbnail generation may timeout - FFmpeg fallback implemented
2. Snapping strength is fixed - could be made configurable
3. Visual indicators use approximate positioning - could be more precise
4. No keyboard shortcuts for snapping toggle yet

## Rollback Plan
If critical issues are discovered, disable features by setting:
```typescript
const featureFlags = {
  enableSnapping: false,
  enableSnapVisualization: false, 
  enableToolSelection: false,
  enableTimeDisplay: false,
};
```

This will restore original timeline behavior without any code changes.