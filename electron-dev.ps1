# Simple Electron with Dev Server - No path fixing needed!

Write-Host "OpenCut - Simple Electron Mode" -ForegroundColor Cyan
Write-Host ""

# Check if port 3000 is available and kill processes using it
$port = 3000
Write-Host "Checking port $port..." -ForegroundColor Gray

try {
    $connection = Test-NetConnection -ComputerName "localhost" -Port $port -WarningAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "Port $port is in use. Finding and killing processes..." -ForegroundColor Yellow
        
        # Find processes using port 3000
        $processes = netstat -ano | findstr ":${port} "
        if ($processes) {
            Write-Host "Found processes using port ${port}:" -ForegroundColor Red
            $processes | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
            
            # Extract PIDs and kill them
            $pids = $processes | ForEach-Object {
                if ($_ -match '\s+(\d+)$') {
                    $matches[1]
                }
            } | Sort-Object -Unique
            
            foreach ($pid in $pids) {
                try {
                    Write-Host "Killing process PID $pid..." -ForegroundColor Yellow
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Host "✅ Killed PID $pid" -ForegroundColor Green
                } catch {
                    Write-Host "⚠️ Could not kill PID $pid" -ForegroundColor Yellow
                }
            }
            
            # Wait a moment for processes to close
            Start-Sleep -Seconds 2
            Write-Host "Port ${port} should now be available" -ForegroundColor Green
        }
    } else {
        Write-Host "Port $port is available" -ForegroundColor Green
    }
} catch {
    Write-Host "Port $port appears to be available" -ForegroundColor Green
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

# Start Next.js in normal dev mode (not Electron export mode)
# Clear all Electron environment variables completely
Remove-Item Env:NEXT_PUBLIC_ELECTRON -ErrorAction SilentlyContinue
[System.Environment]::SetEnvironmentVariable("NEXT_PUBLIC_ELECTRON", $null, "Process")
[System.Environment]::SetEnvironmentVariable("NEXT_PUBLIC_ELECTRON", $null, "User")
[System.Environment]::SetEnvironmentVariable("NEXT_PUBLIC_ELECTRON", $null, "Machine")

Write-Host "Cleared NEXT_PUBLIC_ELECTRON environment variable" -ForegroundColor Gray

# Start with completely clean environment
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = "bun"
$startInfo.Arguments = "run dev"
$startInfo.WorkingDirectory = (Get-Location).Path + "\apps\web"
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true

# Explicitly ensure no ELECTRON environment variables
$startInfo.EnvironmentVariables.Clear()
foreach ($env in [System.Environment]::GetEnvironmentVariables()) {
    if ($env.Key -ne "NEXT_PUBLIC_ELECTRON") {
        $startInfo.EnvironmentVariables.Add($env.Key, $env.Value)
    }
}

Write-Host "Starting Next.js with clean environment (no export mode)..." -ForegroundColor Cyan
$nextProcess = [System.Diagnostics.Process]::Start($startInfo)

# Set up output redirection for the running process
$outputTask = $nextProcess.StandardOutput.ReadToEndAsync()
$errorTask = $nextProcess.StandardError.ReadToEndAsync()

Write-Host "Waiting for dev server to start..." -ForegroundColor Gray

# Wait for server to be ready and detect actual port
$maxWait = 30
$waited = 0
$serverReady = $false
$actualPort = $port
$detectedPort = $false

while ($waited -lt $maxWait -and -not $serverReady) {
    Start-Sleep -Seconds 1
    $waited++
    
    # Check for completed output and parse it
    if ($outputTask.IsCompleted -and -not $detectedPort) {
        $output = $outputTask.Result
        if ($output -match "Local:\s+http://localhost:(\d+)") {
            $actualPort = $matches[1]
            $detectedPort = $true
            Write-Host "Detected Next.js server on port $actualPort" -ForegroundColor Cyan
            # Write to file for debugging
            $output | Out-File -FilePath $tempOutputFile -Encoding UTF8
        }
    }
    
    # Also check stderr for any issues
    if ($errorTask.IsCompleted) {
        $errors = $errorTask.Result
        if ($errors) {
            Write-Host "Next.js errors detected:" -ForegroundColor Red
            Write-Host $errors -ForegroundColor Gray
            $errors | Out-File -FilePath $tempErrorFile -Encoding UTF8
        }
    }
    
    # Check if server is responding on actual port
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$actualPort" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $serverReady = $true
            Write-Host "Dev server ready on http://localhost:$actualPort" -ForegroundColor Green
        }
    } catch {
        # Server not ready yet, also try original port
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$port" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $actualPort = $port
                $serverReady = $true
                Write-Host "Dev server ready on http://localhost:$actualPort" -ForegroundColor Green
            }
        } catch {
            # Neither port ready yet
        }
    }
    
    if ($waited % 5 -eq 0) {
        Write-Host "   Still waiting... ($waited/$maxWait seconds)" -ForegroundColor Gray
    }
}

if (-not $serverReady) {
    Write-Host "Dev server didn't respond in time, but starting Electron anyway..." -ForegroundColor Yellow
}

# Start Electron with detected port
Write-Host "Starting Electron app on port $actualPort..." -ForegroundColor Green
Push-Location "apps/web"
$electronProcess = Start-Process -FilePath "bunx" -ArgumentList "electron", "electron/main-dev.js", "--port=$actualPort" -PassThru -NoNewWindow
Pop-Location

Write-Host ""
Write-Host "Both processes started!" -ForegroundColor Green
Write-Host "Electron app should open automatically" -ForegroundColor Cyan
Write-Host "Dev server: http://localhost:$actualPort" -ForegroundColor Gray
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