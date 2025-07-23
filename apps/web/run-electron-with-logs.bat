@echo off
setlocal enabledelayedexpansion

:: Get timestamp for log filename
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set timestamp=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%
set logfile=electron-logs-%timestamp%.md

echo Starting Electron with logging to %logfile%...

:: Create markdown header
echo # Electron App Logs > "%logfile%"
echo. >> "%logfile%"
echo **Date**: %date% %time% >> "%logfile%"
echo **Command**: `bunx electron electron/main-simple.js` >> "%logfile%"
echo. >> "%logfile%"
echo ## Console Output >> "%logfile%"
echo. >> "%logfile%"
echo ```console >> "%logfile%"

:: Run Electron and capture output
bunx electron electron/main-simple.js 2>&1 | powershell -Command "& {$input | Tee-Object -FilePath '%logfile%' -Append | Write-Host}"

:: Close markdown code block
echo ``` >> "%logfile%"
echo. >> "%logfile%"
echo ## Summary >> "%logfile%"
echo **End Time**: %date% %time% >> "%logfile%"
echo **Log saved to**: `%logfile%` >> "%logfile%"

echo.
echo Logs saved to %logfile%
pause