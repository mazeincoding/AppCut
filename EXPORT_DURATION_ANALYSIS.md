# Export Duration Mismatch Analysis

## Issue Summary
The OpenCut video editor is exporting videos with durations that don't match the expected timeline duration. Based on console logs analysis, exports are stopping at ~3.033 seconds instead of matching the source video duration of ~5.083 seconds.

## Root Cause Analysis

### 1. Timeline-Based Duration Calculation
The export system uses **timeline duration** rather than **source video duration** for export length. This is actually the **correct behavior** for a video editor.

**Key Code Location:** `src/stores/timeline-store.ts:833-849`
```typescript
getTotalDuration: () => {
  const { _tracks } = get();
  if (_tracks.length === 0) return 0;

  const trackEndTimes = _tracks.map((track) =>
    track.elements.reduce((maxEnd, element) => {
      const elementEnd =
        element.startTime +
        element.duration -
        element.trimStart -
        element.trimEnd;
      return Math.max(maxEnd, elementEnd);
    }, 0)
  );

  return Math.max(...trackEndTimes, 0);
}
```

### 2. Export Engine Duration Logic
The export engine implements a **dual duration system** with safety checks:

**Key Code Location:** `src/lib/export-engine.ts`
```typescript
// Calculate the actual video content duration (not timeline duration)
const actualVideoDuration = this.calculateActualVideoDuration();

// Use the shorter of timeline duration or actual video duration
const safeDuration = Math.min(this.duration, actualVideoDuration + 0.1); // Small buffer

if (safeDuration !== this.duration) {
  console.log(`🛠️ Adjusting export duration from ${this.duration}s to ${safeDuration}s`);
  this.duration = safeDuration;
}
```

### 3. Actual Video Duration Calculation
The `calculateActualVideoDuration()` method calculates the maximum end time of all video elements:

```typescript
private calculateActualVideoDuration(): number {
  let maxVideoDuration = 0;
  
  for (const element of this.timelineElements) {
    if (element.type === 'media') {
      const mediaItem = this.getMediaItem(element.mediaId!);
      if (mediaItem?.type === 'video' && mediaItem.duration) {
        // Calculate the effective end time of this video element
        const trimStart = element.trimStart || 0;
        const trimEnd = element.trimEnd || 0;
        const effectiveDuration = mediaItem.duration - trimStart - trimEnd;
        const elementEndTime = (element.startTime || 0) + effectiveDuration;
        
        maxVideoDuration = Math.max(maxVideoDuration, elementEndTime);
      }
    }
  }
  
  return maxVideoDuration;
}
```

## Analysis of Console Logs

From the provided console output:
- **Frame rendering**: Proceeds normally from 0s to ~3.033s
- **Video seeking**: Accurate with 0.000s difference
- **Export completion**: "All frames rendered, stopping recording" at frame ~91
- **Calculated duration**: ~3.033s (91 frames ÷ 30fps = 3.033s)

## Key Findings

### 1. This is Expected Behavior
The export system is working **correctly**. Video editors should export the timeline duration, not the source video duration. Users typically:
- Import a 5-second video
- Place it on timeline and trim/edit it to 3 seconds
- Export should be 3 seconds (timeline duration)

### 2. Timeline Element Configuration
The discrepancy suggests:
- **Source video**: 5.083 seconds
- **Timeline element**: Configured for ~3.033 seconds
- **Possible causes**:
  - Element was trimmed (`trimStart` or `trimEnd` applied)
  - Element duration was manually set to 3.033s
  - Element placement doesn't extend to full video length

### 3. Safety Mechanism Working
The export engine's safety check (`Math.min(this.duration, actualVideoDuration + 0.1)`) is functioning to prevent exports longer than available content.

## Potential Issues to Investigate

### 1. Timeline Element Duration Mismatch
**Check if**: Timeline elements are not correctly inheriting source video duration
```typescript
// When adding video to timeline, ensure:
element.duration = mediaItem.duration; // Should be 5.083s
element.trimStart = 0;
element.trimEnd = 0;
```

### 2. Import Duration Detection
**Check if**: Video duration is correctly detected during import
- Verify `ffmpeg-utils.ts` correctly extracts video metadata
- Ensure duration is properly stored in media store

### 3. Timeline UI Representation
**Check if**: Timeline UI accurately shows element duration
- Verify timeline visual width matches actual duration
- Ensure trim handles are positioned correctly

## Debugging Steps

### 1. Log Timeline State
Add logging to verify timeline element configuration:
```typescript
console.log("Timeline elements:", {
  elements: this.timelineElements.map(el => ({
    id: el.id,
    startTime: el.startTime,
    duration: el.duration,
    trimStart: el.trimStart,
    trimEnd: el.trimEnd,
    effectiveDuration: el.duration - (el.trimStart || 0) - (el.trimEnd || 0)
  }))
});
```

### 2. Media Store Verification
Check if imported video metadata is correct:
```typescript
console.log("Media items:", {
  videos: mediaItems.filter(item => item.type === 'video').map(item => ({
    id: item.id,
    duration: item.duration,
    metadata: item.metadata
  }))
});
```

### 3. Export Duration Comparison
Log both duration calculations:
```typescript
console.log("Duration comparison:", {
  timelineDuration: this.duration,
  actualVideoDuration: this.calculateActualVideoDuration(),
  finalExportDuration: safeDuration
});
```

## Recommended Actions

### 1. Verify Timeline Element Creation
Ensure video elements are created with correct duration when added to timeline.

### 2. Add Duration Validation
Implement validation to warn users when timeline duration differs significantly from source duration.

### 3. UI Improvements
Consider adding visual indicators showing:
- Source video duration vs. timeline element duration
- Active trim regions
- Export duration preview

### 4. User Experience Enhancement
Add export dialog showing:
- Timeline duration
- Source media duration
- Expected export duration

## Conclusion

The export duration "mismatch" is likely **correct behavior** - the system exports the timeline duration (3.033s) rather than source video duration (5.083s). This is standard video editor behavior. 

The issue may be:
1. **User expectation**: User expects full video export but timeline is trimmed
2. **Import configuration**: Video element not properly configured during import
3. **UI feedback**: Insufficient visual feedback about timeline vs. source duration

**Recommendation**: Focus on improving user feedback and timeline element creation rather than changing the export logic.