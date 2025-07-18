@echo off
REM Quick test script for Windows Electron development

echo === OpenCut Electron Quick Test ===
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo Error: Must run from OpenCut root directory
    exit /b 1
)

REM Build Next.js
echo Building Next.js...
cd apps\web
call bun run build
if errorlevel 1 (
    echo Next.js build failed!
    cd ..\..
    exit /b 1
)

REM Fix paths
echo Fixing Electron paths...
call bun run fix-electron-paths

REM Build Electron
echo Building Electron...
call bun run dist:win
if errorlevel 1 (
    echo Electron build failed!
    cd ..\..
    exit /b 1
)

cd ..\..

REM Launch app
echo.
echo Launching Electron app...
start "" "apps\web\dist\win-unpacked\OpenCut Desktop.exe"

echo.
echo App launched! Press any key to exit...
pause > nul