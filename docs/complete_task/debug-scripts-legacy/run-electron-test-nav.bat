@echo off
echo === Testing Electron Navigation to Projects Page ===
echo.
echo This will:
echo 1. Start Electron app
echo 2. Wait 5 seconds for app to load
echo 3. Automatically navigate to Projects page
echo.
echo Watch the console output for navigation logs...
echo.

cd /d "%~dp0"
npx electron electron/main-simple.js --test-navigation

echo.
echo Test completed. Check if navigation to Projects page worked.
pause