#!/bin/bash

# Quick Video Export Test
# Tests OpenCut with the specific video file

echo "🎬 Quick OpenCut Video Export Test"
echo "=================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIDEO_PATH="$SCRIPT_DIR/../input/generated_4a2ba290.mp4"
OPENCUT_URL="http://localhost:3000"

# Check if video exists
if [ ! -f "$VIDEO_PATH" ]; then
    echo "❌ Test video not found: $VIDEO_PATH"
    exit 1
fi

echo "✅ Test video found: $(basename "$VIDEO_PATH")"
echo "   Size: $(du -h "$VIDEO_PATH" | cut -f1)"

# Check if OpenCut is running
echo ""
echo "🌐 Checking if OpenCut is running..."
if curl -s "$OPENCUT_URL" > /dev/null; then
    echo "✅ OpenCut is running at $OPENCUT_URL"
else
    echo "❌ OpenCut is not running at $OPENCUT_URL"
    echo "   Please start it with: cd apps/web && bun run dev"
    exit 1
fi

echo ""
echo "📋 Manual Test Steps:"
echo "1. Open Chrome and go to: $OPENCUT_URL"
echo "2. Navigate to the editor"
echo "3. Upload video: $VIDEO_PATH"
echo "4. Add video to timeline"
echo "5. Click Export > Start Export"
echo "6. Monitor console for these success indicators:"
echo "   ✅ 📹 Video preloaded messages"
echo "   ✅ 🎬 Using preloaded video"
echo "   ✅ 🎯 Video seeking messages"
echo "   ✅ ✅ Preloaded video drawn to canvas"
echo "   ✅ ✅ Export completed successfully!"
echo ""
echo "🔍 Watch for failures:"
echo "   ❌ 📦 Drew placeholder rectangle (means frames are empty)"
echo "   ❌ Video not preloaded or not ready"
echo "   ❌ Fallback video creation failed"
echo ""
echo "🚀 Opening Chrome..."

# Open Chrome with the URL
if command -v google-chrome &> /dev/null; then
    google-chrome "$OPENCUT_URL" 2>/dev/null &
elif command -v chromium &> /dev/null; then
    chromium "$OPENCUT_URL" 2>/dev/null &
elif command -v chrome &> /dev/null; then
    chrome "$OPENCUT_URL" 2>/dev/null &
else
    echo "⚠️  Chrome not found, please manually open: $OPENCUT_URL"
fi

echo "✅ Test setup complete!"
echo "🎯 Follow the manual steps above to test video export"