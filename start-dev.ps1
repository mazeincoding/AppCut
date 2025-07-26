# Simple OpenCut Development Startup Script
# Minimal version with error checking

Write-Host "OpenCut Development Startup" -ForegroundColor Cyan
Write-Host "================================"

# Step 1: Clean project
Write-Host "Step 1: Cleaning project..." -ForegroundColor Yellow
& python cleanup.py
if (-not $?) {
    Write-Host "ERROR: Cleanup failed! Stopping." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}
Write-Host "SUCCESS: Cleanup completed!" -ForegroundColor Green

# Save current directory
$rootDir = Get-Location

# Step 2: Start development server
Write-Host "Step 2: Starting development server..." -ForegroundColor Yellow
Set-Location "apps/web"
Start-Process cmd -ArgumentList "/c", "title OpenCut Dev Server && bun run dev && pause"
Write-Host "SUCCESS: Dev server started!" -ForegroundColor Green

# Step 3: Wait
Write-Host "Waiting 10 seconds for dev server..." -ForegroundColor Blue
Start-Sleep 10

# Step 4: Open browser
Write-Host "Step 3: Opening browser..." -ForegroundColor Yellow
Start-Process chrome "http://localhost:3000"
Write-Host "SUCCESS: Chrome opened!" -ForegroundColor Green

# Step 5: Start Electron
Write-Host "Step 4: Starting Electron..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/c", "title OpenCut Electron && cd apps/web && bunx electron electron/main.js --port=3000 && pause"
Write-Host "SUCCESS: Electron started!" -ForegroundColor Green

Write-Host "All done!" -ForegroundColor Green

# Return to root directory before exiting
Set-Location $rootDir
Write-Host "Returned to root directory: $rootDir" -ForegroundColor Cyan

Read-Host "Press Enter to exit"