# Task Todo - Fix Electron Dev Mode Issues

## Current Problem
Electron dev mode is still running Next.js in export/static mode instead of normal dev server mode, causing module loading errors and missing files.

## Root Cause Analysis
1. **Environment Variable Persistence**: `NEXT_PUBLIC_ELECTRON=true` is still being detected by Next.js despite attempts to clear it
2. **Process Inheritance**: Child processes inherit environment variables from parent PowerShell session
3. **Next.js Config**: The `next.config.ts` file switches to export mode when it detects the Electron environment variable
4. **Static vs Dev Mode**: Export mode generates static files, but dev mode serves from memory with hot reload
5. **CRITICAL DISCOVERY**: Both `.next` AND `out` directories exist, indicating mixed mode confusion
6. **Middleware Conflict**: Export mode disables middleware, causing missing required error components
7. **Process Working Directory**: `$startInfo.WorkingDirectory` uses incorrect path concatenation

## Required Fixes

### Task 1: Environment Variable Complete Removal
**Files:** `electron-dev.ps1`, PowerShell session environment
- [ ] Clear `NEXT_PUBLIC_ELECTRON` from all scopes (Process, User, Machine, Session)
- [ ] Restart PowerShell session to ensure clean environment
- [ ] Verify variable is completely removed before starting Next.js
**Code locations:**
- `electron-dev.ps1:64-67` - Environment variable clearing logic
- PowerShell command: `Remove-Item Env:NEXT_PUBLIC_ELECTRON -ErrorAction SilentlyContinue`

### Task 2: Process Isolation
**Files:** `electron-dev.ps1`
- [ ] Start Next.js process with completely isolated environment
- [ ] Use ProcessStartInfo with custom environment variables
- [ ] Ensure no inheritance of problematic variables
- [ ] **CRITICAL**: Fix working directory path (currently broken)
**Code locations:**
- `electron-dev.ps1:72-90` - ProcessStartInfo configuration
- `electron-dev.ps1:82-87` - Environment variables clearing loop
- `electron-dev.ps1:75` - **BUG**: `(Get-Location).Path + "\apps\web"` creates wrong path
- Need to fix: `$startInfo.EnvironmentVariables.Clear()` and rebuild clean env
- **Fix working directory**: Should be `Join-Path (Get-Location) "apps\web"`

### Task 3: Next.js Config Safety
**Files:** `apps/web/next.config.ts`
- [ ] Add debug logging to `next.config.ts` to show which mode is being used
- [ ] Consider alternative detection method that doesn't rely on environment variables
- [ ] Ensure dev mode is truly running (check for `.next` vs `out` directory)
**Code locations:**
- `apps/web/next.config.ts:3` - `const isElectron = process.env.NEXT_PUBLIC_ELECTRON === "true";`
- `apps/web/next.config.ts:11` - `output: isElectron ? "export" : "standalone",`
- `apps/web/next.config.ts:16` - `distDir: isElectron ? "out" : ".next",`
- Add debug: `console.log('🔧 Next.js mode:', isElectron ? 'EXPORT' : 'DEV', 'env var:', process.env.NEXT_PUBLIC_ELECTRON);`

### Task 4: Script Improvement
**Files:** `electron-dev.ps1`, `archive_task/debug/temp-next-output.txt`, `archive_task/debug/temp-next-error.txt`
- [ ] Add verification step to check if Next.js is running in correct mode
- [ ] Parse Next.js output to confirm dev server (not export) is running
- [ ] Add fallback to kill all Node.js/Next.js processes if needed
**Code locations:**
- `electron-dev.ps1:110-129` - Output parsing logic for port detection
- `archive_task/debug/temp-next-error.txt:3` - Shows "output: export" error
- `archive_task/debug/temp-next-output.txt:2` - Shows actual port (3004)
- Add check for: Look for "export" keyword in error output as failure indicator

### Task 5: Clean Build Directories
**Files:** `apps/web/.next/`, `apps/web/out/`
- [ ] **CRITICAL**: Remove conflicting `out` directory that's causing mode confusion
- [ ] Ensure only `.next` directory exists for dev mode
- [ ] Add cleanup step to script before starting Next.js
**Code locations:**
- `apps/web/out/` - Should NOT exist in dev mode (currently exists)
- `apps/web/.next/` - Should exist in dev mode (currently exists - good)
- Add to `electron-dev.ps1`: `Remove-Item "apps/web/out" -Recurse -Force -ErrorAction SilentlyContinue`

### Task 6: Alternative Approach  
**Files:** `apps/web/package.json`, `apps/web/next.config.ts`
- [ ] Create completely separate npm script that guarantees no Electron mode
- [ ] Use different config file or conditional logic in next.config.ts
- [ ] Consider using Next.js standalone dev command with explicit flags
**Code locations:**
- `apps/web/package.json:8` - `"dev": "next dev"` - Current dev script
- Add new script: `"dev:clean": "cross-env NEXT_PUBLIC_ELECTRON= next dev"`
- `apps/web/next.config.ts:3` - Modify detection logic to be more explicit
- Alternative: Use command-line flag instead of environment variable

## Expected Outcome
- Next.js runs in normal dev mode (creates `.next` directory, not `out`)
- No module loading errors or ENOENT errors
- Electron connects to localhost dev server successfully
- Hot reload and all dev features work properly

## Debug Commands
**Files to check:** `apps/web/.next/`, `apps/web/out/`, `archive_task/debug/temp-next-error.txt`
```bash
# Check current environment
echo $env:NEXT_PUBLIC_ELECTRON

# Verify Next.js mode
ls apps/web/.next  # Should exist in dev mode
ls apps/web/out    # Should NOT exist in dev mode

# Check Next.js output for "export" mentions
Get-Content "archive_task/debug/temp-next-error.txt"  # Should NOT contain "output: export"
Get-Content "archive_task/debug/temp-next-output.txt" # Should show normal dev server output

# Check if middleware is working
# Should see "Local: http://localhost:3000" without middleware errors
```

## Priority: HIGH
This is blocking basic Electron development workflow.