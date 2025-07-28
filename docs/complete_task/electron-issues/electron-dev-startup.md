# Electron Development Startup Guide

## 🚀 One-Click Startup

### Automated Scripts
Choose your preferred method:

**Windows Batch File:**
```cmd
# Double-click or run in terminal
start-dev.bat
```

**PowerShell Script:**
```powershell
# Run in PowerShell
.\start-dev.ps1
```

Both scripts automatically:
1. ✅ Clean project with `python cleanup.py`
2. ✅ Start dev server in new terminal
3. ✅ Wait 10 seconds for server readiness
4. ✅ Open browser to http://localhost:3000
5. ✅ Start Electron app in new terminal

## Manual Process (if needed)

### Step 1: Clean Project
```bash
python cleanup.py
```

### Step 2: Start Development Server
```bash
cd apps/web
bun run dev
```

### Step 3: Wait for Dev Server
- Wait for "Ready" message
- Dev server runs on http://localhost:3000

### Step 4: Start Electron (New Terminal)
```bash
cd apps/web
bunx electron electron/main.js --port=3000
```

### Step 5: Test in Browser (Optional)
- Open http://localhost:3000 in Chrome/browser
- Verify web version works before Electron

## Expected Results
- ✅ Clean project (no cache conflicts)
- ✅ Dev server running on port 3000
- ✅ Electron app connects to dev server
- ✅ Both web and desktop versions work

## Troubleshooting
- If Electron shows blank screen: Check dev server is ready first
- If port conflicts: Verify dev server is on 3000
- If build errors: Run cleanup.py again