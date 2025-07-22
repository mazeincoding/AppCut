# AI Model Selection Auto-Refresh Issue

## Problem Description
When user navigates to AI tab → switches to "Image to Video" tab → tries to select an AI model from the dropdown, the interface auto-refreshes and resets, preventing model selection.

## ✅ **ROOT CAUSE FOUND AND FIXED**

### **🎯 ACTUAL ROOT CAUSE: StorageProvider useEffect Dependency**

**Issue**: The `useEffect` in `StorageProvider` had `loadAllProjects` in its dependency array, causing it to re-run when the Zustand store function reference changed during dropdown interactions.

**Evidence from Debug Logs**:
```
[2025-07-21T11:22:20.629Z] ProjectStore - LOAD_ALL_PROJECTS_START: {}
[2025-07-21T11:22:20.674Z] EditorPage - RENDERING_LOADING_SCREEN: { "projectId": "", "hasActiveProject": false }
[2025-07-21T11:22:20.682Z] EditorPage - PROJECT_INIT_EFFECT: { "projectId": "", "hasActiveProject": false }
```

**Sequence Analysis**:
1. **User clicks AI model dropdown**
2. **Zustand store function reference changes** during dropdown interaction
3. **StorageProvider useEffect re-runs** due to `loadAllProjects` dependency
4. **`LOAD_ALL_PROJECTS_START` is triggered**
5. **Component re-mounts** with empty project state
6. **Fresh project load cycle begins**

**Technical Explanation**: 
- Zustand store function references can change during component interactions
- The `useEffect` in `StorageProvider` was tracking `loadAllProjects` as a dependency
- When dropdown interactions caused store updates, the function reference changed
- This triggered the storage initialization effect to re-run
- The re-initialization cleared the active project state, causing component re-mount

**Solution Applied**: Removed `loadAllProjects` from the useEffect dependency array in `StorageProvider`

---

## ❌ INCORRECT FIX ATTEMPTS

### ~~1. Missing `type="button"` Theory~~ 
**Status: DISPROVEN by logs**
- **Theory**: SelectTrigger treated as form submit button causing page refresh
- **Fix Applied**: Added `type="button"` to SelectTrigger and other buttons
- **Result**: Fix did not resolve the issue
- **Evidence**: User confirmed "this fix does not help"

### ~~2. TypeScript Compilation Errors Theory~~
**Status: HELPFUL BUT NOT ROOT CAUSE**
- **Theory**: TypeScript errors in export-dialog.tsx causing runtime errors and page refreshes
- **Fix Applied**: Fixed all TypeScript compilation errors in export dialog and related components
- **Result**: Eliminated potential runtime errors but didn't resolve dropdown issue
- **Evidence**: Logs still showed beforeunload pattern after TypeScript fixes

## 🔍 ACTUAL ANALYSIS FROM DEBUG LOGS

### **Log Evidence from buglogV3.md**

**Sequence of Events:**
1. **10:41:52.750Z** - `MODEL_DROPDOWN_TOGGLE: { "isOpen": true }`
2. **10:41:52.825Z** - `NAVIGATION_DETECTED` - Shows same URL (not navigation to projects)
3. **10:43:28.172Z** - `EditorPage - PROJECT_INIT_EFFECT` - **Component re-mounting fresh**

**Key Findings:**
- **No navigation to `/projects`** - Logs contain zero instances of navigation to projects page
- **Same-URL router events** - All `ROUTE_CHANGE_START` events show same URL to same URL
- **Component re-initialization** - Fresh `PROJECT_INIT_EFFECT` indicates page refresh/reload
- **Time gap pattern** - Significant gaps between navigation detection and re-initialization

### **Real Issue Pattern**
The logs show that clicking the model dropdown triggers some kind of **page refresh/reload**, not navigation to projects. The component is mounting fresh after the dropdown interaction, but staying on the same editor URL.

## 📊 DEBUGGING STATUS

### ✅ **Comprehensive Logging Active**
- Router events monitoring with call stack tracking
- Project store state change logging  
- Window/document event monitoring
- AI component lifecycle tracking

### 🔍 **What We Know**
- Issue is **NOT** navigation to projects page
- Issue **IS** some kind of page refresh/reload
- Dropdown opening triggers the refresh cycle
- Component re-mounts fresh after refresh

### ❓ **What We Need to Investigate**
1. **What triggers the page refresh?** - Not form submission as originally thought
2. **Is it a JavaScript error** causing the page to reload?
3. **Is it a React error boundary** triggering a reset?
4. **Is it browser navigation** being triggered by some other mechanism?

## 🎯 NEXT DEBUGGING STEPS

1. **Check browser dev tools** during dropdown click for:
   - JavaScript errors in console
   - Network tab for any unexpected requests
   - Performance tab for reload events

2. **Add error boundary logging** to catch React errors that might cause reloads

3. **Monitor `window.location` changes** more closely to detect what's changing the URL

4. **Check for any `window.location.reload()`** calls in the codebase

## 📁 Files for Investigation

- `apps/web/src/components/editor/media-panel/views/ai.tsx:655-670` - SelectTrigger implementation
- `apps/web/src/components/ui/select.tsx` - shadcn Select component  
- Browser dev tools console during reproduction
- Any error boundaries in the component tree

---

**Status**: Issue persists, root cause still unknown. The `type="button"` fix was based on incorrect analysis.