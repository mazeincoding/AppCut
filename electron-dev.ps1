# Simple Electron with Dev Server - No path fixing needed!

Write-Host "OpenCut - Simple Electron Mode" -ForegroundColor Cyan
Write-Host ""

# Check if port 3000 is available
$port = 3000
try {
    $connection = Test-NetConnection -ComputerName "localhost" -Port $port -WarningAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "Port $port is already in use. Trying to connect to existing server..." -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
} catch {
    # Port is available
}

# Ensure debug directory exists
$debugDir = "archive_task/debug"
if (-not (Test-Path $debugDir)) {
    New-Item -ItemType Directory -Path $debugDir -Force | Out-Null
}

# Start Next.js dev server in background (navigate to apps/web first)
Write-Host "Starting Next.js dev server..." -ForegroundColor Yellow
Push-Location "apps/web"

$tempOutputFile = "../../$debugDir/temp-next-output.txt"
$tempErrorFile = "../../$debugDir/temp-next-error.txt"

$nextProcess = Start-Process -FilePath "bun" -ArgumentList "run", "dev" -PassThru -NoNewWindow -RedirectStandardOutput $tempOutputFile -RedirectStandardError $tempErrorFile

Write-Host "Waiting for dev server to start..." -ForegroundColor Gray

# Wait for server to be ready (check for up to 30 seconds)
$maxWait = 30
$waited = 0
$serverReady = $false

while ($waited -lt $maxWait -and -not $serverReady) {
    Start-Sleep -Seconds 1
    $waited++
    
    # Check if server is responding
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $serverReady = $true
            Write-Host "Dev server ready on http://localhost:$port" -ForegroundColor Green
        }
    } catch {
        # Server not ready yet
    }
    
    if ($waited % 5 -eq 0) {
        Write-Host "   Still waiting... ($waited/$maxWait seconds)" -ForegroundColor Gray
    }
}

if (-not $serverReady) {
    Write-Host "Dev server didn't respond in time, but starting Electron anyway..." -ForegroundColor Yellow
}

# Start Electron
Write-Host "Starting Electron app..." -ForegroundColor Green
$electronProcess = Start-Process -FilePath "bun" -ArgumentList "run", "electron:simple" -PassThru -NoNewWindow

Write-Host ""
Write-Host "Both processes started!" -ForegroundColor Green
Write-Host "Electron app should open automatically" -ForegroundColor Cyan
Write-Host "Dev server: http://localhost:$port" -ForegroundColor Gray
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
    Write-Host "Stopping processes..." -ForegroundColor Red
    
    # Kill both processes
    if ($nextProcess -and -not $nextProcess.HasExited) {
        $nextProcess.Kill()
        Write-Host "Next.js dev server stopped" -ForegroundColor Green
    }
    
    if ($electronProcess -and -not $electronProcess.HasExited) {
        $electronProcess.Kill()
        Write-Host "Electron app stopped" -ForegroundColor Green
    }
    
    # Clean up temp files from debug directory
    Remove-Item $tempOutputFile -ErrorAction SilentlyContinue
    Remove-Item $tempErrorFile -ErrorAction SilentlyContinue
    
    # Return to original directory
    Pop-Location -ErrorAction SilentlyContinue
    
    Write-Host "Done!" -ForegroundColor Cyan
}