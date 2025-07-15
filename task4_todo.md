# Task4 Implementation Todo - Quick Tasks (3 min each)

## Phase 1: Setup & Dependencies
- [x] Install @ffmpeg/ffmpeg and @ffmpeg/util packages
- [x] Update package.json with new dependencies
- [x] Create backup of existing video-recorder.ts
- [x] Create backup of existing export-engine.ts

## Phase 2: VideoRecorder Class (FFmpeg-based)
- [ ] Create new file: video-recorder-ffmpeg.ts
- [ ] Add FFmpeg import statements
- [ ] Create VideoRecorder class structure
- [ ] Add constructor with settings/fps parameters
- [ ] Implement load() method for FFmpeg initialization
- [ ] Implement addFrame() method to store frame data
- [ ] Implement start() method to initialize recording
- [ ] Implement stop() method to encode video
- [ ] Add cleanup() method for resource cleanup

## Phase 3: ExportEngine Updates
- [ ] Update export-engine.ts imports
- [ ] Modify constructor to use new VideoRecorder
- [ ] Update startExport() method flow
- [ ] Create renderAndEncode() method
- [ ] Update renderSingleFrame() for sequential rendering
- [ ] Remove MediaRecorder-related code
- [ ] Update progress reporting

## Phase 4: Integration & Testing
- [ ] Update any import statements referencing old VideoRecorder
- [ ] Test basic video export with simple project
- [ ] Verify video duration is correct
- [ ] Test with video elements
- [ ] Test with mixed media (video + images)
- [ ] Verify progress reporting works

## Phase 5: Cleanup & Optimization
- [ ] Remove old video-recorder.ts file
- [ ] Rename video-recorder-ffmpeg.ts to video-recorder.ts
- [ ] Update all import references
- [ ] Add error handling for FFmpeg loading failures
- [ ] Add memory usage optimization
- [ ] Test final implementation

## Quick Implementation Notes
- Each task should take < 3 minutes
- Focus on minimal viable changes first
- Test incrementally after each phase
- Keep backups of working versions
- Use console.log for debugging during development
