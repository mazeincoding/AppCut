@echo off
echo Starting OpenCut Electron App...
echo This will reset window position to ensure it's visible on screen

cd /d "%~dp0\..\..\.."
npx electron electron/main.js --reset-window

pause