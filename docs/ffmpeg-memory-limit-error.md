# FFmpeg Memory Limit Error

## Error Summary
The video export is failing due to insufficient memory allocation for large video files in the browser environment.

## Error Details

### Memory Error
- **Error Type**: `MemoryError`
- **File Size**: 1245.8MB (current video)
- **Estimated Need**: 3737.5MB (3x the video size for processing)
- **Context**: `ExportEngine.startExport`

### Console Logs
```
FFmpegVideoRecorder: Starting recording and initializing FFmpeg...
✅ FFmpeg loaded successfully
Audio track initialization skipped - not implemented in optimized version
Export Error: {
  error: 'File too large: 1245.8MB (estimated 3737.5MB needed)', 
  stack: 'MemoryError: File too large: 1245.8MB...',
  context: 'ExportEngine.startExport', 
  timestamp: '2025-07-28T07:07:27.140Z'
}
```

## Root Cause Analysis

### Memory Requirements
FFmpeg in the browser requires approximately **3x the video file size** in memory:
- Original video: 1245.8MB
- Working memory: ~1245.8MB (decoding)
- Output buffer: ~1245.8MB (encoding)
- **Total needed**: ~3737.5MB

### Browser Memory Limitations
- **Browser heap limit**: Typically 4-8GB on modern systems
- **Available memory**: Often less due to other tabs/applications
- **WASM memory limit**: Can handle up to 8GB with proper configuration
- **Processing threshold**: Allow up to 8GB files before blocking

### Why This Happens
1. **Large video files** exceed browser memory capacity
2. **Memory-intensive processing** requires multiple copies of video data
3. **No memory streaming** - entire video loaded into memory at once
4. **Browser limitations** prevent access to system memory beyond heap

## Files Involved

### **`apps/web/src/lib/memory-monitor.ts`** (lines 179-188) - **PRIMARY SOURCE**
**Current code**: 
```javascript
const estimatedMemoryNeeded = fileSizeMB * 3; // 3x file size for processing

if (estimatedMemoryNeeded > availableMemoryMB) {
  return {
    level: 'error',
    message: `File too large: ${fileSizeMB.toFixed(1)}MB (estimated ${estimatedMemoryNeeded.toFixed(1)}MB needed)`,
    recommendation: 'Reduce file size or close other applications',
    canContinue: false,
  };
}
```
**Current issue**: Hard-coded threshold blocks files too early
**Required fix**: Increase `availableMemoryMB` threshold to allow 8GB files

### **`apps/web/src/lib/export-errors.ts`** (line 97)
**Current role**: Logs the MemoryError from memory-monitor.ts
**Issue**: Only logs the error without offering solutions or recovery
**Required fix**: Add better error messages with progressive warnings

### **`apps/web/src/lib/export-engine-optimized.ts`** (line 57)
**Current role**: Main export engine that calls memory-monitor validation
**Issue**: Relies on memory-monitor's restrictive thresholds
**Required fix**: Update to use new 8GB thresholds

### **`apps/web/src/components/export-dialog.tsx`** (line 253)
**Current role**: UI component that triggers export process and handles errors
**Issue**: Shows technical error messages from memory-monitor
**Required fix**: Add progressive warnings for large files (2GB+, 4GB+, 8GB+)

## Solution Options

### 1. **Pre-Export Validation** (Recommended)
**Implementation**: Add memory/file size checks before starting export

**Files to modify**:
- `memory-monitor.ts` (lines 179-188) - Increase memory thresholds
- `export-dialog.tsx` (line 253) - Add progressive warnings instead of blocking

**Benefits**:
- Prevents export failures
- Provides user guidance
- Maintains system stability

### 2. **Chunked Processing**
**Implementation**: Process video in smaller segments

**Files to modify**:
- `ffmpeg-video-recorder.ts` - Implement segment-based processing
- `export-engine-optimized.ts` - Add chunking logic

**Benefits**:
- Handles larger files
- Reduces memory pressure
- More complex implementation

### 3. **Quality/Resolution Reduction**
**Implementation**: Offer automatic quality reduction for large files

**Files to modify**:
- `export-dialog.tsx` - Add quality reduction options
- `export-engine-optimized.ts` - Implement resolution scaling

**Benefits**:
- Immediate solution
- User maintains control
- Reduces output quality

### 4. **Desktop App Recommendation**
**Implementation**: Suggest Electron app for large files

**Files to modify**:
- `export-dialog.tsx` - Add desktop app suggestion
- `export-errors.ts` - Include desktop alternative in error messages

**Benefits**:
- No memory limitations
- Better performance
- Requires app download

## Recommended Implementation

### **Phase 1: Immediate Fix**
1. **Update `memory-monitor.ts`** - Increase `availableMemoryMB` calculation to allow 8GB files
2. **Modify threshold logic** - Change `canContinue: false` to progressive warnings
3. **Update `export-dialog.tsx`** - Add UI warnings for large files instead of blocking

### **Phase 2: Long-term Solution**
1. **Implement chunked processing** for large files
2. **Add automatic quality reduction** options
3. **Integrate desktop app suggestions** for heavy workloads

## File Size Thresholds

### **Safe Processing** (< 2GB)
- No warnings needed
- Normal export flow

### **Warning Zone** (2GB - 4GB)
- Show memory usage warning
- Suggest quality reduction if needed
- Allow user to proceed

### **High Risk** (4GB - 8GB)
- Strong warning about memory usage
- Recommend quality reduction for stability
- Require user confirmation

### **Blocked** (> 8GB)
- Block export in browser
- Suggest desktop app or file compression
- Provide alternative solutions

## Expected User Experience

### **Before Fix**
- Export starts without warning
- Process fails with technical error
- User loses work and time
- No guidance on alternatives

### **After Fix**
- Pre-export file size validation
- Clear warnings about memory requirements
- Suggestions for quality reduction
- Option to use desktop app for large files

## Priority: High
Large video exports are a core feature that currently fails silently, leading to poor user experience and wasted processing time.