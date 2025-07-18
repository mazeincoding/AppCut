# OpenCut Electron Test Script for Windows
# Accelerates development iteration by automating build and test process

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
    $buildProcess = Start-Process -FilePath "bun" -ArgumentList "run", "build" -PassThru -NoNewWindow
    $buildProcess.WaitForExit()
    
    if ($buildProcess.ExitCode -ne 0) {
        Write-Host "Next.js build failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    # Fix paths for Electron
    Write-Host "Fixing paths for Electron..." -ForegroundColor Yellow
    & bun run fix-electron-paths
    
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

# Build Electron app
Write-Host "Building Electron app..." -ForegroundColor Yellow
Push-Location "apps\web"

# Run electron-builder
$electronBuildProcess = Start-Process -FilePath "bun" -ArgumentList "run", "dist:win" -PassThru -NoNewWindow
$electronBuildProcess.WaitForExit()

if ($electronBuildProcess.ExitCode -ne 0) {
    Write-Host "Electron build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

# Find the built executable
$exePath = Get-ChildItem -Path "apps\web\dist\win-unpacked" -Filter "*.exe" | Select-Object -First 1

if (-not $exePath) {
    Write-Host "Error: Could not find built Electron executable" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Build complete! Launching Electron app..." -ForegroundColor Green
Write-Host "Executable: $($exePath.FullName)" -ForegroundColor Gray
Write-Host ""

# Launch the app
if ($DebugMode) {
    # In debug mode, launch with console visible
    Start-Process -FilePath $exePath.FullName -NoNewWindow
} else {
    # Normal launch
    Start-Process -FilePath $exePath.FullName
}

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
Write-Host "  .\test-electron.ps1              # Full build and test" -ForegroundColor Gray
Write-Host "  .\test-electron.ps1 -SkipNextBuild  # Skip Next.js build" -ForegroundColor Gray
Write-Host "  .\test-electron.ps1 -DebugMode   # Enable debug logging" -ForegroundColor Gray
Write-Host "  .\test-electron.ps1 -CleanBuild  # Clean build from scratch" -ForegroundColor Gray