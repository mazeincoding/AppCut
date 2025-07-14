# Video Export Implementation Tasks

## Overview
Breaking down the video export feature into small, focused tasks. Each task should take less than 3 minutes to complete.

## Phase 1: Export Dialog UI Components (30 min total)

### 1.1 Create Export Dialog Component File (3 min) ✅
- [x] Create `/apps/web/src/components/export-dialog.tsx`
- [x] Add basic React component structure
- [x] Import Dialog components from `@/components/ui/dialog`

### 1.2 Add Dialog Trigger Integration (3 min) ✅
- [x] Update `editor-header.tsx` to import ExportDialog
- [x] Replace console.log with dialog open trigger
- [x] Add state for dialog open/close

### 1.3 Create Export Settings Type (3 min) ✅
- [x] Create `/apps/web/src/types/export.ts`
- [x] Define ExportFormat enum (MP4, WEBM, MOV)
- [x] Define ExportQuality enum (1080p, 720p, 480p)
- [x] Define ExportSettings interface

### 1.4 Add Format Selection UI (3 min) ✅
- [x] Add RadioGroup for format selection in export dialog
- [x] Create format options with labels
- [x] Wire up to local state

### 1.5 Add Quality Selection UI (3 min) ✅
- [x] Add RadioGroup for quality selection
- [x] Create quality preset options
- [x] Wire up to local state

### 1.6 Add Resolution Display (3 min) ✅
- [x] Calculate resolution based on quality selection
- [x] Display resolution info (e.g., "1920x1080")
- [x] Show estimated file size placeholder

### 1.7 Add Export Button and Cancel (3 min) ✅
- [x] Add DialogFooter with action buttons
- [x] Style Export button as primary action
- [x] Add loading state preparation

### 1.8 Add Filename Input (3 min) ✅
- [x] Add Input component for filename
- [x] Set default filename with timestamp
- [x] Add basic validation

### 1.9 Create Export Progress Component (3 min) ✅
- [x] Create progress bar component
- [x] Add percentage display
- [x] Add estimated time remaining placeholder

### 1.10 Add Dialog Close Handlers (3 min) ✅
- [x] Implement cancel button handler
- [x] Add ESC key handling
- [x] Prevent close during export

## Phase 2: Export State Management (15 min total)

### 2.1 Create Export Store File (3 min) ✅
- [x] Create `/apps/web/src/stores/export-store.ts`
- [x] Set up basic Zustand store structure
- [x] Add TypeScript types

### 2.2 Add Export State Properties (3 min) ✅
- [x] Add isExporting boolean
- [x] Add exportProgress number (0-100)
- [x] Add exportSettings state
- [x] Add error state

### 2.3 Add Export Actions (3 min) ✅
- [x] Create startExport action
- [x] Create updateProgress action
- [x] Create completeExport action
- [x] Create cancelExport action

### 2.4 Connect Dialog to Store (3 min) ✅
- [x] Import useExportStore in export dialog
- [x] Connect settings to store
- [x] Connect progress to UI

### 2.5 Add Export Status Messages (3 min) ✅
- [x] Create status message state
- [x] Add status update action
- [x] Display current export step

## Phase 3: Canvas Setup (15 min total)

### 3.1 Create Canvas Export Component (3 min) ✅
- [x] Create `/apps/web/src/components/export-canvas.tsx`
- [x] Add hidden canvas element
- [x] Set up refs

### 3.2 Add Canvas Initialization (3 min) ✅
- [x] Set canvas dimensions based on export quality
- [x] Get 2D context
- [x] Add error handling

### 3.3 Create Canvas Render Manager (3 min) ✅
- [x] Create `/apps/web/src/lib/canvas-renderer.ts`
- [x] Add CanvasRenderer class structure
- [x] Define render method signatures

### 3.4 Add Clear Frame Method (3 min) ✅
- [x] Implement clearFrame method
- [x] Handle background color/transparency
- [x] Test with solid color

### 3.5 Add Draw Image Method (3 min) ✅
- [x] Implement drawImage for video frames
- [x] Handle aspect ratio preservation
- [x] Add position calculations

## Phase 4: Frame Rendering Pipeline (21 min total)

### 4.1 Create Frame Capture Service (3 min) ✅
- [x] Create `/apps/web/src/lib/frame-capture.ts`
- [x] Add FrameCaptureService class
- [x] Define capture method structure

### 4.2 Add Timeline Frame Iterator (3 min) ✅
- [x] Create method to iterate through timeline frames
- [x] Calculate frame timestamps
- [x] Handle FPS conversion

### 4.3 Add Video Frame Extraction (3 min) ✅
- [x] Create method to extract frame at timestamp
- [x] Use video.currentTime seek
- [x] Handle seek completion

### 4.4 Add Image Element Renderer (3 min) ✅
- [x] Implement image drawing to canvas
- [x] Handle positioning from timeline
- [x] Apply transformations

### 4.5 Add Text Element Renderer (3 min) ✅
- [x] Implement text drawing to canvas
- [x] Apply font styles
- [x] Handle text positioning

### 4.6 Add Background Blur Effect (3 min) ✅
- [x] Implement blur filter for background
- [x] Use CSS filters on canvas
- [x] Handle blur radius

### 4.7 Add Element Layer Sorting (3 min) ✅
- [x] Sort elements by z-index/layer
- [x] Implement proper render order
- [x] Handle track layering

## Phase 5: Video Recording (18 min total)

### 5.1 Create MediaRecorder Setup (3 min) ✅
- [x] Initialize MediaRecorder with canvas stream
- [x] Set up video codec options
- [x] Handle browser compatibility

### 5.2 Add Recording Controls (3 min) ✅
- [x] Implement start recording method
- [x] Implement pause/resume methods
- [x] Implement stop recording method

### 5.3 Add Frame Capture Loop (3 min) ✅
- [x] Create requestAnimationFrame loop
- [x] Render frame to canvas
- [x] Handle timing synchronization

### 5.4 Add Blob Collection (3 min) ✅
- [x] Collect recorded chunks
- [x] Handle dataavailable event
- [x] Store in array

### 5.5 Add Blob to File Conversion (3 min) ✅
- [x] Combine blob chunks
- [x] Create final video file
- [x] Set proper MIME type

### 5.6 Add Download Trigger (3 min) ✅
- [x] Create download link
- [x] Trigger automatic download
- [x] Clean up resources

## Phase 6: Audio Handling (15 min total)

### 6.1 Create Audio Mixer Service (3 min)
- [ ] Create `/apps/web/src/lib/audio-mixer.ts`
- [ ] Add AudioMixer class structure
- [ ] Define mixing methods

### 6.2 Add Audio Track Collection (3 min)
- [ ] Collect all audio elements from timeline
- [ ] Get audio sources and timestamps
- [ ] Handle multiple tracks

### 6.3 Add Web Audio Context Setup (3 min)
- [ ] Create AudioContext
- [ ] Set up destination node
- [ ] Handle browser prefixes

### 6.4 Add Audio Synchronization (3 min)
- [ ] Sync audio with video timeline
- [ ] Handle start/end times
- [ ] Apply volume levels

### 6.5 Add Audio Export Integration (3 min)
- [ ] Connect audio to MediaRecorder
- [ ] Mix audio with video stream
- [ ] Test audio/video sync

## Phase 7: Progress Tracking (12 min total)

### 7.1 Add Frame Counter (3 min)
- [ ] Track current frame number
- [ ] Calculate total frames
- [ ] Update progress percentage

### 7.2 Add Time Estimation (3 min)
- [ ] Calculate elapsed time
- [ ] Estimate remaining time
- [ ] Format time display

### 7.3 Add Progress Events (3 min)
- [ ] Emit progress events
- [ ] Update UI in real-time
- [ ] Handle progress callbacks

### 7.4 Add Cancel Functionality (3 min)
- [ ] Implement export cancellation
- [ ] Clean up resources
- [ ] Reset UI state

## Phase 8: Error Handling (12 min total)

### 8.1 Add Try-Catch Blocks (3 min)
- [ ] Wrap export process in try-catch
- [ ] Handle specific error types
- [ ] Log errors appropriately

### 8.2 Add User Error Messages (3 min)
- [ ] Create error message component
- [ ] Display user-friendly errors
- [ ] Add retry option

### 8.3 Add Resource Cleanup (3 min)
- [ ] Clean up canvas resources
- [ ] Dispose of video elements
- [ ] Clear temporary data

### 8.4 Add Memory Management (3 min)
- [ ] Monitor memory usage
- [ ] Add garbage collection hints
- [ ] Handle large video exports

## Phase 9: Testing & Polish (15 min total)

### 9.1 Test Export with Simple Timeline (3 min)
- [ ] Create basic test timeline
- [ ] Export single video clip
- [ ] Verify output

### 9.2 Test Multi-Track Export (3 min)
- [ ] Test with multiple video tracks
- [ ] Test with overlapping elements
- [ ] Verify layer ordering

### 9.3 Test Text Overlay Export (3 min)
- [ ] Add text elements to timeline
- [ ] Export with text overlays
- [ ] Check text rendering quality

### 9.4 Test Different Formats (3 min)
- [ ] Test MP4 export
- [ ] Test WebM export
- [ ] Test quality presets

### 9.5 Add Export Analytics (3 min)
- [ ] Track export success/failure
- [ ] Log export settings used
- [ ] Monitor performance metrics

## Phase 10: Documentation (9 min total)

### 10.1 Add Code Comments (3 min)
- [ ] Document complex functions
- [ ] Add JSDoc comments
- [ ] Explain algorithm choices

### 10.2 Update README (3 min)
- [ ] Document export feature
- [ ] Add usage instructions
- [ ] List supported formats

### 10.3 Create Export Examples (3 min)
- [ ] Add example export code
- [ ] Show different use cases
- [ ] Include troubleshooting

## Total Estimated Time: ~3 hours (60 tasks × 3 min)

## Notes
- Each task is designed to be atomic and completable in under 3 minutes
- Tasks can be parallelized where dependencies allow
- Consider creating branches for each phase
- Test frequently between phases
- Use existing UI components and patterns from the codebase