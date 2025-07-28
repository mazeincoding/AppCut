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

### **`apps/web/src/lib/memory-monitor.ts`** (lines 164-188) - **PRIMARY SOURCE**
**Function**: `checkFileSafety(fileSizeBytes: number)`
**Current logic**: 
```javascript
const fileSizeMB = fileSizeBytes / 1024 / 1024;
const availableMemoryMB = memInfo.availableMemory / 1024 / 1024;
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

**Current issue**: Uses browser's `jsHeapSizeLimit` which is typically 2-4GB, blocking large files
**Required fix**: Override the available memory calculation to allow up to 8GB files

### **`apps/web/src/lib/export-errors.ts`** (line 97)
**Current role**: Logs the MemoryError from memory-monitor.ts
**Issue**: Only logs the error without offering solutions or recovery
**Required fix**: Add better error messages with progressive warnings

### **`apps/web/src/lib/export-engine-optimized.ts`** (lines 735-744)
**Function**: Memory validation before export starts
**Current logic**:
```javascript
const warning = memoryMonitor.checkFileSafety(estimatedBytes);

if (warning && warning.level === 'error') {
  throw new MemoryError(
    warning.message,
    {
      estimatedBytes,
      level: warning.level
    }
  );
}
```
**Current issue**: Directly throws MemoryError when memory-monitor returns 'error' level
**Required fix**: No changes needed - will work once memory-monitor thresholds are updated

### **`apps/web/src/components/export-dialog.tsx`** (lines 215-217)
**Function**: Export error handling
**Current logic**:
```javascript
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  updateProgress({ isExporting: false, status: `Error: ${errorMessage}` });
}
```
**Current issue**: Shows raw MemoryError message to users
**Required fix**: Add user-friendly handling for memory-related errors

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
1. **Update `memory-monitor.ts` checkFileSafety()** (lines 164-188)
   - Override `availableMemoryMB` calculation to allow up to 8GB files
   - Change 8GB+ threshold from `canContinue: false` to blocking only above 8GB
   - Keep progressive warnings at 2GB, 4GB levels

2. **Update `export-dialog.tsx` error handling** (lines 215-217)
   - Add specific handling for MemoryError types
   - Show user-friendly messages instead of raw error text
   - Provide guidance for memory-related issues

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