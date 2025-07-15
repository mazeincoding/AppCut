# 🎬 OpenCut Video Export Test Suite - Quick Start

## 🚀 Run Tests Now

```bash
cd /home/zdhpe/opencut/OpenCut/test_video_export
./run_tests.sh
```

## 📁 What's Inside

```
test_video_export/
├── 🎯 run_tests.sh              # Main test runner (START HERE!)
├── 📖 README.md                 # Detailed documentation
├── 📋 USAGE.md                  # This quick start guide
├── 📹 input/
│   └── generated_4a2ba290.mp4   # Your test video (0.52MB MP4)
├── 📊 output/                   # Test results go here
├── 🛠️ scripts/                  # All test scripts
│   ├── check-video.js           # Video file checker
│   ├── quick-test.sh            # Manual test guide
│   ├── puppeteer-test.js        # Browser automation
│   └── test-video-export.spec.js # E2E tests
└── 📚 docs/
    └── MANUAL_TEST_INSTRUCTIONS.md # Step-by-step manual guide
```

## ⚡ Quick Test Options

### 1. 🎮 Interactive Menu (Recommended)
```bash
./run_tests.sh
```
Choose from menu options 1-8

### 2. 📹 Just Check Video
```bash
cd scripts
node check-video.js
```

### 3. 🌐 Manual Browser Test
```bash
cd scripts
./quick-test.sh
```

### 4. 🔍 Debug Export Issues (NEW)
```bash
cd scripts
node debug-export.js <console-log-file>
```
Analyzes console logs to identify duration and white frame issues

## 🎯 Test Goals

✅ **Verify video frames are rendered** (not gray placeholders)  
✅ **Confirm smooth frame progression** (no stuck/paused frames)  
✅ **Validate export completion** (successful file download)  
✅ **Monitor console for success patterns**

## 📊 Success Indicators

Look for these in browser console:
```
✅ Video preloaded: readyState=4
🎬 Using preloaded video
🎯 Seeking video to X.XXs
✅ Video seeked to X.XXs, diff: 0.001s
✅ Preloaded video drawn to canvas
✅ Export completed successfully!
```

## ❌ Failure Indicators

Watch out for these:
```
❌ 📦 Drew placeholder rectangle
❌ Video not preloaded or not ready
❌ Fallback video creation failed
❌ Export failed/timed out
```

## 🔧 Prerequisites

1. **OpenCut running**: `cd ../../apps/web && bun run dev`
2. **Chrome browser**: For testing
3. **Node.js**: For test scripts

## 🆘 Quick Help

- **Can't find video?** Check `input/generated_4a2ba290.mp4` exists
- **OpenCut not running?** Start with `cd apps/web && bun run dev`
- **Gray frames in export?** Check console for preloading errors
- **Stuck frames?** Look for seeking accuracy logs

## 🎬 Ready to Test?

```bash
# 1. Start here:
./run_tests.sh

# 2. Choose option 1 (video check) first
# 3. Then try option 2 (manual test)
# 4. Upload the test video and export
# 5. Check console logs for success patterns
```

**Your test video is ready at:** `input/generated_4a2ba290.mp4` (0.52MB MP4) ✅