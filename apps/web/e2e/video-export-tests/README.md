# OpenCut Video Export Test Suite

Comprehensive testing framework for OpenCut's video export functionality.

## 📁 Directory Structure

```
test_video_export/
├── README.md           # This file
├── run_tests.sh        # Main test runner
├── input/              # Test input files
│   └── generated_4a2ba290.mp4  # Test video file
├── output/             # Test output files
│   └── test-results/   # Generated test results
├── scripts/            # Test scripts
│   ├── check-video.js          # Video file validator
│   ├── quick-test.sh           # Quick manual test
│   ├── puppeteer-test.js       # Browser automation
│   ├── test-video-export.js    # Test generator
│   └── test-video-export.spec.js  # Playwright E2E
└── docs/               # Documentation
    └── MANUAL_TEST_INSTRUCTIONS.md  # Manual testing guide
```

## 🚀 Quick Start

1. **Make sure OpenCut is running:**
   ```bash
   cd ../../apps/web
   bun run dev
   ```

2. **Run the test suite:**
   ```bash
   cd test_video_export
   chmod +x run_tests.sh
   ./run_tests.sh
   ```

3. **Choose a test option from the menu**

## 🧪 Test Types

### 1. Quick Video Check
- Validates test video file
- Shows file information
- Checks compatibility

### 2. Manual Testing
- Step-by-step instructions
- Browser-based testing
- Human verification

### 3. Browser Automation
- Puppeteer-based automation
- Automated UI interaction
- Console log monitoring

### 4. Playwright E2E
- End-to-end testing
- Full export workflow
- Automated verification

## 📊 Expected Results

### ✅ Success Indicators
- Video uploads successfully
- Timeline shows video element
- Export completes without errors
- Console shows: `✅ Preloaded video drawn to canvas`
- Downloaded video plays correctly
- No placeholder rectangles in output

### ❌ Failure Indicators
- Console shows: `📦 Drew placeholder rectangle`
- Export errors or timeouts
- Empty or corrupted output files
- Video not preloaded messages

## 🔍 Debugging

### Common Issues
1. **Gray frames in export:**
   - Check video preloading logs
   - Verify readyState values
   - Check seeking accuracy

2. **Paused/stuck frames:**
   - Monitor seeking timestamps
   - Check frame timing logs
   - Verify video progression

3. **Export failures:**
   - Check browser console
   - Verify video format support
   - Monitor memory usage

### Log Analysis
Look for these patterns in console:
```
✅ Video preloaded: readyState=4
🎬 Using preloaded video
🎯 Seeking video to X.XXs
✅ Video seeked to X.XXs, diff: 0.XXXs
✅ Preloaded video drawn to canvas
```

## 📝 Test Video Info

- **File:** generated_4a2ba290.mp4
- **Size:** ~0.52 MB
- **Format:** MP4
- **Source:** /home/zdhpe/veo3-video-generation/output/videos/
- **Purpose:** Test video export frame accuracy

## 🛠️ Development

### Adding New Tests
1. Create test script in `scripts/`
2. Add to menu in `run_tests.sh`
3. Document in this README

### Modifying Test Video
1. Replace file in `input/`
2. Update paths in scripts
3. Update video info in README

## 📞 Support

If tests fail:
1. Check OpenCut is running
2. Verify video file exists
3. Check browser console logs
4. Review manual test instructions
5. Check for JavaScript errors

## 🎯 Test Objectives

1. **Verify video frame rendering** (not placeholders)
2. **Confirm frame timing accuracy** (no stuck frames)
3. **Validate export completion** (successful file generation)
4. **Test browser compatibility** (Chrome/Chromium)
5. **Monitor performance** (memory usage, speed)