# Remove Test Media Panel Button

## Overview
This document outlines the removal of the "📁 Test Media Panel" button from the OpenCut application. This is a test/development button that downloads a sample video (Big Buck Bunny) to test media panel functionality.

## Exact Location
- **File**: `apps/web/src/components/editor/media-panel/views/ai.tsx`
- **Button Location**: Lines 956-973
- **Function Definition**: Lines 97-179 (`handleTestDownloadAndMedia`)

## Button Details
- **Text**: "📁 Test Media Panel"
- **Type**: Secondary button with full width
- **onClick Handler**: `handleTestDownloadAndMedia`
- **Purpose**: Tests video download and media panel integration using a sample video

## What the Test Function Does
The `handleTestDownloadAndMedia` function:
1. Downloads a sample video from Google's CDN (Big Buck Bunny)
2. Creates a File object from the downloaded video
3. Adds it to the media panel with "TEST:" prefix
4. Logs success/failure with debugLogger
5. Updates the generation history

## Code to Remove

### 1. Button Element (Lines 956-973)
```typescript
<Button 
  onClick={handleTestDownloadAndMedia}
  disabled={selectedModels.length === 0 || isGenerating}
  className="w-full"
  size="lg"
  variant="secondary"
>
  {isGenerating ? (
    <>
      <Loader2 className="mr-2 size-4 animate-spin" />
      Testing...
    </>
  ) : (
    <>
      📁 Test Media Panel
    </>
  )}
</Button>
```

### 2. Function Definition (Lines 97-179)
The entire `handleTestDownloadAndMedia` async function

### 3. Related Code
- Debug log: `TEST_DOWNLOAD_AND_MEDIA_SUCCESS` (Line 156)
- No other references found in the codebase

## Impact Analysis
- ✅ **No external dependencies**: Function is only called by this button
- ✅ **No shared state**: Uses existing state variables (isGenerating, error, etc.)
- ✅ **No imports to remove**: All imports are used by other functions
- ⚠️ **Layout consideration**: Removing button may affect spacing in the button group

## Step-by-Step Removal Instructions

### Step 1: Remove the Button (Lines 956-973)
Delete the entire `<Button>` component and its wrapping div if it becomes empty.

### Step 2: Remove the Function (Lines 97-179)
Delete the entire `handleTestDownloadAndMedia` function definition.

### Step 3: Clean Up
- No imports need to be removed (all are used elsewhere)
- No type definitions need to be removed
- The `space-y-2` class on the parent div will maintain proper spacing

### Step 4: Verify
Run these commands:
```bash
# Type check
npm run type-check

# Build
npm run build

# Test in development
npm run dev
```

## Post-Removal Checklist
- [ ] Button removed from UI
- [ ] Function definition removed
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] AI panel layout unchanged
- [ ] Generate Video button still works
- [ ] Media panel accepts real video uploads
- [ ] No console errors in browser

## Summary
This is a **safe removal** with minimal impact:
- Test function is isolated and not used elsewhere
- No production functionality depends on it
- Layout will remain intact due to parent container styling
- All other AI video generation features will continue working normally