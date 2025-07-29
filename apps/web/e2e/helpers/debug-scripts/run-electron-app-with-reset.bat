@echo off
echo Starting OpenCut Electron App...
echo This will reset window position to ensure it's visible on screen

cd /d "C:\Users\zdhpe\Desktop\New folder\OpenCut\apps\web"
npx electron electron/main.js --reset-window

pause