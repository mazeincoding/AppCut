# OpenCut Electron Test Script for Windows
# Builds and runs the Electron app for development testing

param(
    [switch]$SkipNextBuild,
    [switch]$DebugMode,
    [switch]$CleanBuild
)

$ErrorActionPreference = "Stop"

Write-Host "=== OpenCut Electron Test Script ===" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path ".\package.json")) {
    Write-Host "Error: Must run from OpenCut root directory" -ForegroundColor Red
    exit 1
}

# Clean build if requested
if ($CleanBuild) {
    Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
    Remove-Item -Path "apps\web\out" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "apps\web\dist" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "apps\web\.next" -Recurse -Force -ErrorAction SilentlyContinue
}

# Build Next.js unless skipped
if (-not $SkipNextBuild) {
    Write-Host "Building Next.js application..." -ForegroundColor Yellow
    Push-Location "apps\web"
    
    # Export Next.js for Electron
    $buildProcess = Start-Process -FilePath "bun" -ArgumentList "run", "export:electron" -PassThru -NoNewWindow
    $buildProcess.WaitForExit()
    
    if ($buildProcess.ExitCode -ne 0) {
        Write-Host "Next.js build failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Pop-Location
    Write-Host "Next.js build complete!" -ForegroundColor Green
} else {
    Write-Host "Skipping Next.js build (using existing)" -ForegroundColor Gray
}

# Check if out directory exists
if (-not (Test-Path "apps\web\out\index.html")) {
    Write-Host "Error: Next.js build output not found. Run without -SkipNextBuild" -ForegroundColor Red
    exit 1
}

# Set up environment for debugging
if ($DebugMode) {
    $env:ELECTRON_ENABLE_LOGGING = "1"
    $env:NODE_ENV = "development"
    Write-Host "Debug mode enabled" -ForegroundColor Magenta
}

# Run Electron app
Write-Host "Launching Electron app..." -ForegroundColor Yellow
Push-Location "apps\web"

# Launch with bunx electron
if ($DebugMode) {
    # In debug mode, run with logging script
    $electronProcess = Start-Process -FilePath "node" -ArgumentList "scripts/run-electron-with-logs.js" -PassThru -NoNewWindow
} else {
    # Normal launch
    $electronProcess = Start-Process -FilePath "bunx" -ArgumentList "electron", "electron/main-simple.js" -PassThru -NoNewWindow
}

Pop-Location

Write-Host ""
Write-Host "Electron app launched!" -ForegroundColor Green
Write-Host ""

Write-Host "App launched! Check for errors in the console." -ForegroundColor Cyan

# If in debug mode, show tips
if ($DebugMode) {
    Write-Host ""
    Write-Host "Debug Tips:" -ForegroundColor Yellow
    Write-Host "- Open DevTools with Ctrl+Shift+I" -ForegroundColor Gray
    Write-Host "- Check console for error messages" -ForegroundColor Gray
    Write-Host "- Look for 'Failed to load resource' errors" -ForegroundColor Gray
    Write-Host "- Verify React/Next.js initialization" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Quick Commands:" -ForegroundColor Yellow
Write-Host "  .\test-electron.ps1                 # Full build and run" -ForegroundColor Gray
Write-Host "  .\test-electron.ps1 -SkipNextBuild  # Skip build, just run" -ForegroundColor Gray
Write-Host "  .\test-electron.ps1 -DebugMode      # Run with debug logging" -ForegroundColor Gray
Write-Host "  .\test-electron.ps1 -CleanBuild     # Clean build from scratch" -ForegroundColor Gray