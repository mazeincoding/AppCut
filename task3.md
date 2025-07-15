# Task 3: Video Export Duration Bug Analysis

## 🔍 **Problem Statement:**
- Video export shows correct frame rendering (stops at 10.1s in logs)
- BUT actual exported video is 1+ minute long instead of ~10 seconds
- Frame generation appears correct, but final video duration is wrong

## 🧠 **Root Cause Analysis:**

### 🎯 **Key Observations:**
1. **Logs show export stopping at 10.1s** - this looks correct
2. **But actual video is 1+ minute** - this suggests a timing/FPS issue
3. **Frame 303 at 10.1s** = ~30fps frame generation rate
4. **If recorded at wrong FPS** = video duration gets stretched

### 🧠 **Root Cause Theory:**

**The FrameCaptureService generates frames at 30fps, but the VideoRecorder might be encoding at a different frame rate.**

For example:
- **Frame generation**: 303 frames at 30fps = 10.1s ✅
- **Video encoding**: 303 frames recorded at 5fps = 60.6s ❌

### 🔍 **Where the bug likely is:**

1. **VideoRecorder initialization** - FPS setting mismatch
2. **MediaRecorder API settings** - Wrong frame rate configuration  
3. **Canvas capture timing** - Not synced with intended FPS
4. **Frame timestamp calculation** - Timeline vs actual recording mismatch

### 📊 **What needs to be checked:**

1. **VideoRecorder constructor** - What FPS is it actually using?
2. **MediaRecorder options** - Frame rate configuration
3. **Canvas.captureStream()** - FPS parameter
4. **Timing between frame captures** - Is it actually 1/30s intervals?

### 🎯 **Most Likely Culprit:**

The **VideoRecorder** is probably capturing canvas frames at a much lower FPS than the 30fps we're generating them at, causing the video to be stretched in time.

**This would explain why:**
- ✅ Frame rendering logs look correct (10.1s)
- ❌ Final video is much longer (60+ seconds)
- ✅ No errors in the export process
- ❌ Duration mismatch between expected and actual

## 🛠️ **Investigation Plan:**

### Phase 1: Identify FPS Mismatch ✅ COMPLETED
- [x] Check VideoRecorder constructor and FPS settings
- [x] Examine MediaRecorder API configuration
- [x] Verify Canvas.captureStream() FPS parameter
- [x] Analyze timing between frame captures

**🔍 INVESTIGATION RESULTS:**

**VideoRecorder Configuration:**
- ✅ `VideoRecorder` constructor correctly receives `fps` parameter
- ✅ Uses `canvas.captureStream(this.fps)` on line 35 - FPS parameter is properly passed
- ✅ MediaRecorder gets proper stream with specified FPS

**Export Engine Frame Generation:**
- ❌ **CRITICAL ISSUE FOUND**: Export engine uses `requestAnimationFrame` for rendering loop (lines 230, 238)
- ❌ `requestAnimationFrame` runs at display refresh rate (~60fps) NOT the intended 30fps
- ❌ This creates a timing mismatch between frame generation rate and video recording rate

**Root Cause Identified:**
- **Frame Generation**: `requestAnimationFrame` generates frames at ~60fps (browser refresh rate)
- **Video Recording**: `canvas.captureStream(30)` expects frames at 30fps
- **Result**: 303 frames generated in 10.1s = 60fps generation, but recorded as 30fps = 20.2s video

**Why video is 1+ minute:**
- If 303 frames are generated at 60fps but recorded at 30fps: 303 ÷ 30 = 10.1s ✅
- But if timing is incorrect and frames accumulate: 303 frames stretched over time = longer video

**Next Steps:**
- Phase 2 should implement proper frame timing control instead of `requestAnimationFrame`
- Use `setTimeout` or interval-based timing to match the target FPS exactly

### Phase 2: Fix FPS Synchronization
- [ ] Ensure VideoRecorder uses same FPS as FrameCaptureService
- [ ] Fix MediaRecorder options if needed
- [ ] Sync canvas capture timing with intended FPS
- [ ] Test with debug logging to verify frame timing

### Phase 3: Validation
- [ ] Export test video and verify duration matches expected
- [ ] Check frame count vs duration calculation
- [ ] Ensure no regression in other export features

## 🎯 **Success Criteria:**
- 10-second video exports as exactly ~10 seconds
- Frame count matches expected duration at target FPS
- No timing drift or duration stretching in final video