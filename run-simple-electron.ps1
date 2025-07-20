# Simple Electron with Dev Server
# No path fixing needed!

Write-Host "🚀 OpenCut - Simple Electron Mode" -ForegroundColor Cyan
Write-Host ""

# Start Next.js dev server in background
Write-Host "📦 Starting Next.js dev server..." -ForegroundColor Yellow
$nextProcess = Start-Process -FilePath "bun" -ArgumentList "run", "dev" -PassThru -NoNewWindow

Write-Host "⏳ Waiting for dev server to start..." -ForegroundColor Gray
Start-Sleep -Seconds 8

# Start Electron
Write-Host "🖥️  Starting Electron app..." -ForegroundColor Green
$electronProcess = Start-Process -FilePath "bun" -ArgumentList "run", "electron:simple" -PassThru -NoNewWindow -WorkingDirectory "apps/web"

Write-Host ""
Write-Host "✅ Both processes started!" -ForegroundColor Green
Write-Host "📱 Electron app should open automatically" -ForegroundColor Cyan
Write-Host "🌐 Dev server: http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop both processes..." -ForegroundColor Yellow

# Wait for user to stop
try {
    while ($true) {
        Start-Sleep -Seconds 1
        if ($electronProcess.HasExited) {
            Write-Host "Electron closed by user" -ForegroundColor Yellow
            break
        }
    }
} finally {
    Write-Host "🛑 Stopping processes..." -ForegroundColor Red
    
    # Kill both processes
    if (-not $nextProcess.HasExited) {
        $nextProcess.Kill()
        Write-Host "✅ Next.js dev server stopped" -ForegroundColor Green
    }
    
    if (-not $electronProcess.HasExited) {
        $electronProcess.Kill()
        Write-Host "✅ Electron app stopped" -ForegroundColor Green
    }
    
    Write-Host "👋 Done!" -ForegroundColor Cyan
}