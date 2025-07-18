#!/bin/bash

# OpenCut Electron Development - Simple Commands
# Copy and paste these commands for development

echo "📋 Copy these commands for Electron development:"
echo ""

echo "# Quick Development (Recommended):"
echo "cd apps/web && npx electron electron/main-simple.js"
echo ""

echo "# Development with Auto-rebuild:"
echo "cd apps/web && bun run electron:dev"
echo ""

echo "# Manual Build Process:"
echo "cd apps/web"
echo "bun run build"
echo "node scripts/fix-electron-paths.js"
echo "npx electron electron/main-simple.js"
echo ""

echo "# Test Scripts:"
echo "./test-electron.bat"
echo "./test-electron.ps1 -DebugMode"
echo ""

echo "# Build for Distribution:"
echo "cd apps/web && bun run electron:dist:win"