@echo off
echo Installing Playwright if not already installed...
call bun install @playwright/test

echo Installing Playwright browsers...
call bunx playwright install

echo Running image adjustment tests...
call bunx playwright test image-adjustment.spec.ts

echo Test run complete!
pause