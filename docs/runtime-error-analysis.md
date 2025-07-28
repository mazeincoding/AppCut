# Runtime Error Analysis - Current Issues

## Overview
Multiple runtime issues are occurring in the development environment, ranging from React component warnings to missing file metadata and performance monitoring alerts.

## 1. React Ref Warning - High Priority

### Issue
```
Warning: Function components cannot be given refs. Attempts to access this ref will fail. Did you mean to use React.forwardRef()?
Check the render method of `Primitive.button.SlotClone`.
```

### Location
- **Component Stack**: TimelineToolbar → TooltipProvider → Radix UI Select components
- **Root Cause**: Radix UI components are trying to pass refs to function components that don't support them
- **Affected Components**: 
  - `@radix-ui/react-select`
  - `@radix-ui/react-tooltip`
  - Timeline toolbar components

### Impact
- **Functional**: Low (components still work)
- **Development**: High (console noise, potential future issues)
- **User Experience**: None visible

### Technical Details
The error originates from the timeline toolbar where Radix UI Select components are nested within TooltipProvider. The Select component is trying to forward refs through multiple layers of wrapper components.

## 2. Performance API Manifest Detection

### Issue
```
🚫 [PERFORMANCE API] Detected JSON resource load attempt:
Resource: http://localhost:3000/manifest.json
Type: resource
Entry: PerformanceResourceTiming {...}
```

### Analysis
- **Resource**: `/manifest.json` - Progressive Web App manifest file
- **Type**: Legitimate resource, not problematic
- **Cause**: Performance monitoring filter needs expansion
- **Current Filter Gap**: Manifest files not excluded from monitoring

### Technical Details
- **File**: `apps/web/src/pages/_document.tsx` lines 142-164
- **Issue**: Legitimate PWA manifest file triggering false positive
- **Solution Needed**: Add `manifest.json` to legitimate file filter

## 3. Media File Metadata Missing

### Issue
```
Invalid file for thumbnail generation: file or MIME type is missing 
{fileName: '299e89c4-00b8-4862-bf33-efc1cd00c023', fileType: '', fileSize: 6821683}
```

### Location
- **File**: `apps/web/src/lib/ffmpeg-utils.ts:733`
- **Function**: `generateEnhancedThumbnails`
- **Trigger**: Media store attempting thumbnail generation

### Root Cause Analysis
1. **Missing File Type**: The media file has no MIME type (`fileType: ''`)
2. **Storage Issue**: File metadata not properly preserved during storage/retrieval
3. **IndexedDB Problem**: File type information lost in IndexedDB storage

### Technical Chain
```
MediaStore.generateEnhancedThumbnails() →
FFmpegUtils.generateEnhancedThumbnails() →
Validation fails: no MIME type
```

### Impact
- **Thumbnails**: Not generated for affected files
- **User Experience**: Missing video previews in timeline
- **Functionality**: Video playback may still work, but preview generation fails

## 4. Development Environment Noise

### Additional Console Output
- React DevTools installation prompts (multiple instances)
- HMR (Hot Module Replacement) connection messages
- Content script loading messages

### Impact
- Development workflow disruption
- Important error messages buried in console noise
- Debugging efficiency reduced

## Issue Priorities

### High Priority
1. **Media file metadata preservation** - Affects core functionality
2. **React ref warning** - Potential future compatibility issues

### Medium Priority 
3. **Performance API false positive** - Development experience
4. **Console noise reduction** - Developer productivity

### Low Priority
5. **Development environment messages** - Informational only

## Recommended Action Plan

### Immediate (High Priority)

#### 1. Fix Media File Metadata - Detailed Plan

**Problem**: Media files losing MIME type during storage/retrieval, preventing thumbnail generation

**Investigation Steps**:
1. **IndexedDB Adapter Analysis** (`apps/web/src/lib/storage/indexeddb-adapter.ts`)
   - Check `storeFile()` method - verify File object metadata preservation
   - Check `getFile()` method - verify MIME type retrieval
   - Verify Blob reconstruction includes proper type parameter

2. **Media Store Investigation** (`apps/web/src/stores/media-store.ts`)
   - Trace `addMediaFiles()` flow - ensure File objects retain metadata
   - Check `loadMediaForProject()` - verify file type restoration
   - Review `generateEnhancedThumbnails()` call chain

3. **Storage Service Check** (`apps/web/src/lib/storage/storage-service.ts`)
   - Verify `storeMediaFile()` preserves File.type property
   - Check `getMediaFile()` returns proper MIME type
   - Ensure metadata persistence in storage interface

**Root Cause Hypothesis**:
- IndexedDB storing File as Blob without preserving MIME type
- File reconstruction not including original type parameter
- Metadata loss during browser storage/retrieval cycle

**Fix Strategy**:
1. **Store metadata separately**: Store MIME type as separate field alongside Blob
2. **Enhanced File reconstruction**: Reconstruct File objects with explicit type
3. **Validation layer**: Add type validation before storage operations

**Code Changes Required**:
```typescript
// In IndexedDB adapter
storeFile(file: File): Promise<string> {
  // Store both blob and metadata
  const metadata = {
    name: file.name,
    type: file.type, // Explicitly preserve
    size: file.size,
    lastModified: file.lastModified
  };
  // Store blob + metadata separately
}

getFile(id: string): Promise<File> {
  // Reconstruct File with explicit type
  return new File([blob], metadata.name, {
    type: metadata.type, // Explicitly restore
    lastModified: metadata.lastModified
  });
}
```

#### 2. Resolve React Ref Warning - Detailed Plan

**Problem**: Radix UI components receiving refs on function components in timeline toolbar

**Investigation Steps**:
1. **Component Tree Analysis**
   - Map exact component hierarchy: TimelineToolbar → TooltipProvider → Select
   - Identify which specific Radix components are causing ref issues
   - Check component prop passing patterns

2. **Timeline Toolbar Audit** (`apps/web/src/components/editor/timeline-toolbar.tsx`)
   - Review Select component usage within TooltipProvider
   - Check for unnecessary ref forwarding
   - Identify Button components wrapped in Tooltip

3. **Radix UI Integration Review**
   - Check Select component implementation
   - Review TooltipProvider usage patterns
   - Verify proper component composition

**Root Cause Analysis**:
- Select components nested inside TooltipProvider causing ref conflicts
- Primitive components receiving refs they can't handle
- Wrapper components not properly forwarding refs

**Fix Strategy**:
1. **Component Restructuring**: Separate tooltip and select functionality
2. **Ref Forwarding**: Implement proper forwardRef where needed
3. **Composition Pattern**: Use proper Radix UI composition patterns

**Code Changes Required**:
```typescript
// Option 1: Separate tooltip and select
<div className="flex gap-2">
  <Tooltip>
    <TooltipTrigger asChild>
      <Button>Action</Button>
    </TooltipTrigger>
  </Tooltip>
  <Select>
    <SelectTrigger>...</SelectTrigger>
  </Select>
</div>

// Option 2: Use forwardRef wrapper
const SelectWithTooltip = React.forwardRef<
  React.ElementRef<typeof SelectTrigger>,
  React.ComponentPropsWithoutRef<typeof SelectTrigger>
>(({ children, ...props }, ref) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Select>
        <SelectTrigger ref={ref} {...props}>
          {children}
        </SelectTrigger>
      </Select>
    </TooltipTrigger>
  </Tooltip>
));
```

**Testing Plan**:
1. **Console Verification**: Ensure ref warnings disappear
2. **Functionality Test**: Verify tooltips and selects work correctly
3. **Component Integrity**: Test all timeline toolbar interactions

### Short Term (Medium Priority)
3. **Update Performance API filter**: Add manifest.json exception
4. **Audit debug logging**: Ensure consistent disable-by-default pattern

### Long Term (Low Priority)
5. **Development environment cleanup**: Reduce non-essential console output

## Technical Investigation Needed

### Media Metadata Issue
- Check IndexedDB adapter file type preservation
- Verify media store file handling
- Test file upload/storage pipeline

### React Ref Warning
- Audit timeline toolbar component structure
- Review Radix UI component usage patterns
- Consider forwardRef implementation where needed

### Performance Monitoring
- Expand legitimate file filter
- Consider conditional monitoring (debug mode only)
- Add configuration for monitoring sensitivity