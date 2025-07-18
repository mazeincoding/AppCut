#!/bin/bash

# OpenCut Electron Development Commands
# Quick reference for Electron development

echo "🚀 OpenCut Electron Development Commands"
echo "========================================"
echo ""

# Function to show available commands
show_commands() {
    echo "Available commands:"
    echo ""
    echo "1. Quick Development (Recommended):"
    echo "   cd apps/web && npx electron electron/main-simple.js"
    echo ""
    echo "2. Development with Auto-rebuild:"
    echo "   cd apps/web && bun run electron:dev"
    echo ""
    echo "3. Manual Development Process:"
    echo "   cd apps/web"
    echo "   bun run build"
    echo "   node scripts/fix-electron-paths.js"
    echo "   npx electron electron/main-simple.js"
    echo ""
    echo "4. Using Test Scripts:"
    echo "   ./test-electron.bat"
    echo "   ./test-electron.ps1 -DebugMode"
    echo "   ./test-electron.ps1 -SkipNextBuild"
    echo ""
    echo "5. Build Commands:"
    echo "   cd apps/web && bun run electron:build"
    echo "   cd apps/web && bun run electron:dist:win"
    echo ""
}

# Check if argument is provided
case "$1" in
    "quick"|"1")
        echo "🚀 Running Quick Development..."
        cd apps/web && npx electron electron/main-simple.js
        ;;
    "dev"|"2")
        echo "🔄 Running Development with Auto-rebuild..."
        cd apps/web && bun run electron:dev
        ;;
    "manual"|"3")
        echo "🔧 Running Manual Development Process..."
        cd apps/web
        echo "Building Next.js..."
        bun run build
        echo "Fixing Electron paths..."
        node scripts/fix-electron-paths.js
        echo "Starting Electron..."
        npx electron electron/main-simple.js
        ;;
    "build"|"4")
        echo "🏗️ Building Electron..."
        cd apps/web && bun run electron:build
        ;;
    "dist"|"5")
        echo "📦 Building Windows Distribution..."
        cd apps/web && bun run electron:dist:win
        ;;
    "test"|"6")
        echo "🧪 Running Test Script..."
        ./test-electron.bat
        ;;
    "help"|"--help"|"-h"|"")
        show_commands
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_commands
        ;;
esac