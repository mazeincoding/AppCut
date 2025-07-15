#!/bin/bash

# OpenCut Video Export Test Suite
# Comprehensive testing for video export functionality

echo "🎬 OpenCut Video Export Test Suite"
echo "=================================="

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT_DIR="$SCRIPT_DIR/input"
OUTPUT_DIR="$SCRIPT_DIR/output"
SCRIPTS_DIR="$SCRIPT_DIR/scripts"
DOCS_DIR="$SCRIPT_DIR/docs"

OPENCUT_URL="http://localhost:3000"
TEST_VIDEO="$INPUT_DIR/generated_4a2ba290.mp4"

echo "📁 Test structure:"
echo "   Input:   $INPUT_DIR"
echo "   Output:  $OUTPUT_DIR"
echo "   Scripts: $SCRIPTS_DIR"
echo "   Docs:    $DOCS_DIR"

# Check prerequisites
check_prerequisites() {
    echo ""
    echo "🔍 Checking prerequisites..."
    
    # Check if test video exists
    if [ ! -f "$TEST_VIDEO" ]; then
        echo "❌ Test video not found: $TEST_VIDEO"
        exit 1
    fi
    echo "✅ Test video found: $(basename "$TEST_VIDEO")"
    
    # Check if OpenCut is running
    if ! curl -s "$OPENCUT_URL" > /dev/null; then
        echo "❌ OpenCut is not running at $OPENCUT_URL"
        echo "   Please start it with: cd apps/web && bun run dev"
        exit 1
    fi
    echo "✅ OpenCut is running at $OPENCUT_URL"
    
    # Check for required tools
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is required but not installed"
        exit 1
    fi
    echo "✅ Node.js is available"
    
    # Check for Chrome
    if command -v google-chrome &> /dev/null || command -v chromium &> /dev/null; then
        echo "✅ Chrome/Chromium is available"
    else
        echo "⚠️  Chrome not found - manual browser testing required"
    fi
}

# Display menu
show_menu() {
    echo ""
    echo "📋 Available test options:"
    echo "1. Quick video info check"
    echo "2. Manual testing guide"
    echo "3. Browser automation test"
    echo "4. Playwright E2E test"
    echo "5. Run all tests"
    echo "6. View test results"
    echo "7. Clean output directory"
    echo "8. Exit"
    echo ""
}

# Video info check
run_video_check() {
    echo ""
    echo "📹 Running video info check..."
    cd "$SCRIPTS_DIR"
    node check-video.js
}

# Manual testing
run_manual_test() {
    echo ""
    echo "📖 Opening manual test instructions..."
    if command -v code &> /dev/null; then
        code "$DOCS_DIR/MANUAL_TEST_INSTRUCTIONS.md"
    else
        cat "$DOCS_DIR/MANUAL_TEST_INSTRUCTIONS.md"
    fi
    
    echo ""
    echo "🌐 Opening OpenCut in browser..."
    cd "$SCRIPTS_DIR"
    ./quick-test.sh
}

# Browser automation
run_browser_test() {
    echo ""
    echo "🤖 Running browser automation test..."
    cd "$SCRIPTS_DIR"
    
    # Check if puppeteer is installed
    if ! npm list puppeteer &> /dev/null; then
        echo "📦 Installing Puppeteer..."
        npm install puppeteer
    fi
    
    node puppeteer-test.js
}

# Playwright E2E
run_playwright_test() {
    echo ""
    echo "🎭 Running Playwright E2E test..."
    cd "$SCRIPTS_DIR"
    
    # Check if playwright is installed
    if ! npx playwright --version &> /dev/null; then
        echo "📦 Installing Playwright..."
        npm install -D @playwright/test
        npx playwright install
    fi
    
    npx playwright test test-video-export.spec.js
}

# Run all tests
run_all_tests() {
    echo ""
    echo "🚀 Running all tests..."
    
    run_video_check
    echo ""
    echo "⏸️  Manual test section - press Enter to continue to automation tests..."
    read -r
    
    run_browser_test
    run_playwright_test
    
    echo ""
    echo "✅ All automated tests completed!"
}

# View results
view_results() {
    echo ""
    echo "📊 Test results in $OUTPUT_DIR:"
    
    if [ -d "$OUTPUT_DIR" ] && [ "$(ls -A "$OUTPUT_DIR" 2>/dev/null)" ]; then
        ls -la "$OUTPUT_DIR"
        
        echo ""
        echo "📹 Video files:"
        find "$OUTPUT_DIR" -name "*.mp4" -exec ls -lh {} \;
        
        echo ""
        echo "📄 Log files:"
        find "$OUTPUT_DIR" -name "*.log" -exec basename {} \;
    else
        echo "No test results found. Run some tests first!"
    fi
}

# Clean output
clean_output() {
    echo ""
    echo "🧹 Cleaning output directory..."
    rm -rf "$OUTPUT_DIR"/*
    echo "✅ Output directory cleaned"
}

# Main execution
main() {
    check_prerequisites
    
    while true; do
        show_menu
        read -p "Enter your choice (1-8): " choice
        
        case $choice in
            1) run_video_check ;;
            2) run_manual_test ;;
            3) run_browser_test ;;
            4) run_playwright_test ;;
            5) run_all_tests ;;
            6) view_results ;;
            7) clean_output ;;
            8) echo "👋 Goodbye!"; exit 0 ;;
            *) echo "❌ Invalid choice. Please enter 1-8." ;;
        esac
        
        echo ""
        echo "Press Enter to continue..."
        read -r
    done
}

# Run main function
main