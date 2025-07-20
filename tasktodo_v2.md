# Navigation Loop Analysis & Fix Plan

## 🚨 Problem Identified - UPDATED ANALYSIS
**REVISED: NOT just navigation loop - it's a REACT FAST REFRESH / ERROR BOUNDARY LOOP!**

## Screenshots Analysis:

### Screenshot 1 (Original):
```
GET /editor/project/79872552-adf5-43e5-8e5d-1be0a63acebd 200 in 232ms
GET /editor/project/79872552-adf5-43e5-8e5d-1be0a63acebd 200 in 210ms
GET /editor/project/79872552-adf5-43e5-8e5d-1be0a63acebd 200 in 212ms
```

### Screenshot 2 (After Fix Attempt):
```
⚠️ Fast Refresh had to perform a full reload
🔄 ElectronErrorBoundary component loaded
📦 All providers and error boundaries configured
GET /editor/project/0fe9e3fc-bd15-4535-a1a3-3850ab63f79c 200 in various times
```

## 🧠 REVISED Root Cause Analysis

### Navigation fix FAILED - Real issues are:

1. **Fast Refresh Full Reload Loop** - Something triggering React to constantly reload
2. **ElectronErrorBoundary activating** - JavaScript errors in Electron environment  
3. **Component crash/recovery cycle** - Error → Boundary → Reload → Error again

## 🧠 Root Cause Theories

### 1. **Editor Page useEffect Navigation Loop** (Most Likely)
**File**: `apps/web/src/pages/editor/project/[project_id].tsx`

**Suspected Pattern**:
```typescript
useEffect(() => {
  if (!project || !isInitialized) {
    // This might trigger infinite navigation
    router.push('/projects');
    // or
    router.replace(`/editor/project/${projectId}`);
  }
}, [project, isInitialized, router, projectId]); // Dependencies causing re-trigger
```

**Why This Happens**:
- Storage provider still initializing → `isInitialized` false
- Project not loaded yet → `project` is null
- useEffect triggers navigation
- Page reloads, same conditions true → loop

### 2. **Storage Provider Race Condition**
**Files**: 
- `apps/web/src/components/storage-provider.tsx`
- `apps/web/src/stores/project-store.ts`

**Theory**:
```typescript
// Storage provider still loading
const { isInitialized, isLoading } = useStorage();

// Editor checks this too early
if (!isInitialized) {
  // Redirects or reloads
}
```

### 3. **Project Loading Failure Loop**
**File**: `apps/web/src/stores/project-store.ts`

**Pattern**:
```typescript
// Project fails to load
loadProject(id) → null
// Editor detects missing project
// Triggers navigation back to projects
// But URL still has project ID
// Loads editor again → loop
```

### 4. **Electron-Specific Navigation Issues**
**Files**:
- `apps/web/src/components/url-validation-provider.tsx`
- `apps/web/electron/main-dev.js`

**Theory**:
- URL validation middleware conflicts with Next.js router
- File protocol navigation behaves differently
- Router.push/replace triggers unexpected behavior in Electron

### 5. **Authentication/Permission Check Loop**
**Potential Pattern**:
```typescript
useEffect(() => {
  if (!canAccessProject(projectId)) {
    router.push('/projects');
  }
}, []);
```

## 🎯 Investigation Priority

### HIGH PRIORITY - Check These Files First:

#### 1. Editor Page Component
**File**: `apps/web/src/pages/editor/project/[project_id].tsx`
**Look for**:
- `useEffect` with navigation calls
- Conditional redirects based on project state
- Dependencies that might cause re-triggers
- `router.push()` or `router.replace()` calls

#### 2. Project Store
**File**: `apps/web/src/stores/project-store.ts`
**Look for**:
- `loadProject` function
- Project state initialization
- Error handling that might trigger navigation

#### 3. Storage Provider Integration
**File**: `apps/web/src/components/storage-provider.tsx`
**Look for**:
- Initialization timing
- How it affects project loading

### MEDIUM PRIORITY:

#### 4. URL Validation Provider
**File**: `apps/web/src/components/url-validation-provider.tsx`
**Look for**:
- Router patching conflicts
- URL rewriting that might cause loops

#### 5. Project Store Hook Usage
**Files**: Any component using `useProjectStore`
**Look for**:
- State dependencies causing re-navigation

## 🔍 Debugging Strategy

### Step 1: Add Temporary Debug Logs
Add these TEMPORARY logs to identify the loop trigger:

```typescript
// In editor page component
useEffect(() => {
  console.log('🔍 EDITOR EFFECT:', { 
    project: !!project, 
    isInitialized, 
    projectId,
    timestamp: Date.now()
  });
  
  if (/* navigation condition */) {
    console.log('🚨 NAVIGATION TRIGGERED:', reason);
    // navigation call
  }
}, [dependencies]);
```

### Step 2: Check Component Mount/Unmount
```typescript
useEffect(() => {
  console.log('🟢 Editor mounted for project:', projectId);
  return () => {
    console.log('🔴 Editor unmounted for project:', projectId);
  };
}, []);
```

### Step 3: Trace Navigation Calls
```typescript
// Wrap router calls temporarily
const originalPush = router.push;
router.push = (...args) => {
  console.log('🔄 ROUTER PUSH:', args, new Error().stack);
  return originalPush.apply(router, args);
};
```

## 🛠️ Likely Fix Strategies

### Strategy 1: Fix Dependencies
```typescript
// BEFORE (causing loop)
useEffect(() => {
  if (!project) {
    router.push('/projects');
  }
}, [project, router]); // router changing causes re-trigger

// AFTER (stable dependencies)
useEffect(() => {
  if (!project && isInitialized && !isLoading) {
    router.push('/projects');
  }
}, [project, isInitialized, isLoading]); // stable dependencies
```

### Strategy 2: Add Navigation Guards
```typescript
const [hasNavigated, setHasNavigated] = useState(false);

useEffect(() => {
  if (!project && isInitialized && !hasNavigated) {
    setHasNavigated(true);
    router.push('/projects');
  }
}, [project, isInitialized, hasNavigated]);
```

### Strategy 3: Use Router Events
```typescript
useEffect(() => {
  const handleRouteChange = (url) => {
    console.log('Route changed to:', url);
  };
  
  router.events.on('routeChangeStart', handleRouteChange);
  return () => router.events.off('routeChangeStart', handleRouteChange);
}, []);
```

### Strategy 4: Electron-Specific Fix
```typescript
// Check if we're in Electron and handle differently
const isElectron = typeof window !== 'undefined' && window.electronAPI;

if (isElectron) {
  // Use different navigation strategy
  window.location.href = '/projects';
} else {
  router.push('/projects');
}
```

## 📋 Action Plan

### Phase 1: Identify the Culprit (30 minutes)
1. [ ] Add debug logs to editor page component
2. [ ] Add navigation tracing
3. [ ] Run app and check console for loop pattern
4. [ ] Identify which useEffect is triggering

### Phase 2: Implement Fix (15 minutes)
1. [ ] Apply appropriate fix strategy
2. [ ] Test navigation flow
3. [ ] Remove debug logs

### Phase 3: Verify (10 minutes)
1. [ ] Test project creation → editor navigation
2. [ ] Test direct editor URL access
3. [ ] Test browser back/forward
4. [ ] Test Electron-specific behavior

## 🎯 Expected Outcome

After fixing:
- Navigation to editor should work smoothly
- No repeated GET requests in dev tools
- Stable project loading in Electron
- Clean navigation without loops

---

# 🚨 UPDATED DEBUGGING STRATEGY - FAST REFRESH / ERROR BOUNDARY FOCUS

## 🎯 NEW Investigation Priorities

### 1. **ElectronErrorBoundary Investigation** (HIGHEST PRIORITY)
**File**: `apps/web/src/components/electron-error-boundary.tsx` or similar
**Look for**:
- What errors are being caught
- How it handles recovery
- If it's causing reload loops

**Debug Code to Add**:
```typescript
// In error boundary componentDidCatch or error handler
console.log('🚨 ERROR BOUNDARY TRIGGERED:', {
  error: error.message,
  errorInfo: errorInfo,
  stack: error.stack,
  timestamp: Date.now(),
  location: window.location.href
});

// Before any reload/recovery
console.log('🔄 ERROR BOUNDARY RECOVERY ATTEMPT:', {
  action: 'reload',
  timestamp: Date.now()
});
```

### 2. **Fast Refresh Root Cause** (HIGH PRIORITY)
**Files to Check**:
- `apps/web/src/pages/editor/project/[project_id].tsx`
- `apps/web/src/stores/editor-store.ts`
- `apps/web/src/stores/project-store.ts`
- `apps/web/src/components/editor/`

**What Causes Fast Refresh Full Reload**:
- Invalid hook usage
- Changing component types
- Syntax errors in components
- State mutations
- Context provider issues

**Debug Code to Add**:
```typescript
// At top of editor component
console.log('🔄 EDITOR COMPONENT RENDER:', {
  projectId,
  activeProject: activeProject?.id,
  timestamp: Date.now(),
  renderCount: ++window.renderCount || 1
});

// In component body before return
console.log('🔍 EDITOR STATE CHECK:', {
  hasActiveProject: !!activeProject,
  projectIdMatch: activeProject?.id === projectId,
  isLoading: get().isLoading,
  isInitialized: get().isInitialized
});
```

### 3. **Electron-Specific Error Detection** (HIGH PRIORITY)
**Files**:
- `apps/web/electron/main-dev.js`
- `apps/web/electron/preload-simplified.js`
- `apps/web/src/lib/electron-detection.ts`

**Debug Code to Add**:
```typescript
// In main electron process
console.log('🔧 ELECTRON MAIN: Page load detected');

// In preload script
window.electronDebug = {
  logError: (error) => {
    console.log('🚨 ELECTRON ERROR:', error);
  },
  logReload: () => {
    console.log('🔄 ELECTRON RELOAD TRIGGERED');
  }
};

// In React app
useEffect(() => {
  const handleError = (event) => {
    console.log('🚨 WINDOW ERROR:', event.error);
    if (window.electronDebug) {
      window.electronDebug.logError(event.error);
    }
  };
  
  window.addEventListener('error', handleError);
  return () => window.removeEventListener('error', handleError);
}, []);
```

### 4. **Storage/State Corruption Detection** (MEDIUM PRIORITY)
**Files**:
- `apps/web/src/lib/storage/storage-service.ts`
- `apps/web/src/stores/project-store.ts`

**Debug Code to Add**:
```typescript
// In storage operations
const originalSaveProject = storageService.saveProject;
storageService.saveProject = async function(project) {
  console.log('💾 STORAGE SAVE ATTEMPT:', {
    projectId: project.id,
    timestamp: Date.now()
  });
  
  try {
    const result = await originalSaveProject.call(this, project);
    console.log('✅ STORAGE SAVE SUCCESS:', project.id);
    return result;
  } catch (error) {
    console.error('❌ STORAGE SAVE FAILED:', error);
    throw error;
  }
};

// In project store
loadProject: async (id: string) => {
  console.log('📥 LOAD PROJECT START:', id);
  try {
    // existing code
    console.log('✅ LOAD PROJECT SUCCESS:', id);
  } catch (error) {
    console.error('❌ LOAD PROJECT FAILED:', { id, error });
    throw error;
  }
}
```

### 5. **React Hook Violations** (MEDIUM PRIORITY)
**Files**: All components in `apps/web/src/components/editor/`

**Check for**:
- Hooks called conditionally
- Hooks called in loops
- Hooks called in callbacks
- State mutations

**Debug Code to Add**:
```typescript
// React Strict Mode violation detector
const originalUseEffect = React.useEffect;
React.useEffect = function(fn, deps) {
  console.log('🪝 useEffect called:', {
    depsLength: deps?.length,
    location: new Error().stack.split('\n')[2]
  });
  return originalUseEffect(fn, deps);
};
```

## 🔧 Specific Files to Add Debug Code

### File 1: `apps/web/src/pages/editor/project/[project_id].tsx`
```typescript
// Add at very top after imports
let renderCount = 0;

// Add inside component
useEffect(() => {
  renderCount++;
  console.log('🔄 EDITOR MOUNT/UPDATE:', {
    renderCount,
    projectId,
    activeProjectId: activeProject?.id,
    timestamp: Date.now()
  });
  
  return () => {
    console.log('🔄 EDITOR CLEANUP:', {
      renderCount,
      projectId,
      timestamp: Date.now()
    });
  };
}, []);

// Replace existing useEffect with debug version
useEffect(() => {
  console.log('🎯 PROJECT INIT EFFECT:', {
    projectId,
    hasActiveProject: !!activeProject,
    activeProjectId: activeProject?.id,
    needsLoad: projectId && (!activeProject || activeProject.id !== projectId)
  });

  const initializeProject = async () => {
    // existing code with added logging
  };
}, [projectId, activeProject, loadProject, createNewProject, router]);
```

### File 2: `apps/web/src/stores/project-store.ts`
```typescript
// Add to createNewProject
createNewProject: async (name: string) => {
  console.log("🚀 CREATE PROJECT START:", { name, timestamp: Date.now() });
  try {
    // existing code
    console.log("✅ CREATE PROJECT SUCCESS:", newProject.id);
    return newProject.id;
  } catch (error) {
    console.error("❌ CREATE PROJECT FAILED:", error);
    throw error;
  }
}
```

### File 3: Check for Error Boundary
**Find**: `apps/web/src/components/*error-boundary*` or similar
**Add**:
```typescript
componentDidCatch(error, errorInfo) {
  console.log('🚨 ERROR BOUNDARY CATCH:', {
    error: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    timestamp: Date.now()
  });
  
  // existing error handling
}
```

## 📋 REVISED Action Plan

### Phase 1: Add Debug Logging (15 minutes)
1. [ ] Add render count logging to editor component
2. [ ] Add error boundary logging
3. [ ] Add storage operation logging
4. [ ] Add window error listeners

### Phase 2: Run and Analyze (10 minutes)
1. [ ] Start app and reproduce issue
2. [ ] Capture console output during loop
3. [ ] Identify which component/operation is failing
4. [ ] Look for error patterns

### Phase 3: Target the Real Issue (varies)
1. [ ] Fix the actual error causing crashes
2. [ ] Address Fast Refresh violations if any
3. [ ] Fix Electron-specific issues
4. [ ] Remove debug code

## 📝 Updated Notes

- **NOT a navigation issue** - navigation fix didn't work
- **IS a component crash/error recovery loop**
- **Fast Refresh warnings indicate code issues**
- **ElectronErrorBoundary suggests Electron-specific problems**
- **Focus on errors, not navigation logic**