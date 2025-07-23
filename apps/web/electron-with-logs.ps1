# PowerShell script to run Electron and save logs to markdown file

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$logFile = "electron-logs-$timestamp.md"

Write-Host "🚀 Starting Electron with logging to $logFile" -ForegroundColor Green

# Create markdown header
@"
# Electron App Logs
**Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Command**: ``bunx electron electron/main-simple.js``

## Console Output

``````console
"@ | Out-File -FilePath $logFile -Encoding UTF8

# Run Electron and capture output
try {
    # Start the process and capture output
    $process = Start-Process -FilePath "bunx" -ArgumentList "electron electron/main-simple.js" -PassThru -RedirectStandardOutput "temp-stdout.txt" -RedirectStandardError "temp-stderr.txt" -NoNewWindow
    
    Write-Host "Press Ctrl+C to stop logging and close Electron..." -ForegroundColor Yellow
    
    # Monitor output files
    $lastStdoutSize = 0
    $lastStderrSize = 0
    
    while (!$process.HasExited) {
        Start-Sleep -Milliseconds 500
        
        # Check stdout
        if (Test-Path "temp-stdout.txt") {
            $currentSize = (Get-Item "temp-stdout.txt").Length
            if ($currentSize -gt $lastStdoutSize) {
                $newContent = Get-Content "temp-stdout.txt" -Tail 50
                $newContent | Add-Content -Path $logFile
                $newContent | Write-Host
                $lastStdoutSize = $currentSize
            }
        }
        
        # Check stderr
        if (Test-Path "temp-stderr.txt") {
            $currentSize = (Get-Item "temp-stderr.txt").Length
            if ($currentSize -gt $lastStderrSize) {
                $newContent = Get-Content "temp-stderr.txt" -Tail 50
                $newContent | Add-Content -Path $logFile
                $newContent | Write-Host -ForegroundColor Red
                $lastStderrSize = $currentSize
            }
        }
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    $_ | Add-Content -Path $logFile
} finally {
    # Close the markdown code block
    @"
``````

## Summary
**End Time**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Log saved to**: ``$logFile``
"@ | Add-Content -Path $logFile
    
    # Cleanup temp files
    Remove-Item "temp-stdout.txt" -ErrorAction SilentlyContinue
    Remove-Item "temp-stderr.txt" -ErrorAction SilentlyContinue
    
    Write-Host "`n✅ Logs saved to $logFile" -ForegroundColor Green
}