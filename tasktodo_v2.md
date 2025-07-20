# Navigation Loop Analysis & Fix Plan

## 🚨 Problem Identified
**NOT a console.log render loop - it's a NAVIGATION LOOP!**

Screenshot shows repeated GET requests to the same editor route:
```
GET /editor/project/79872552-adf5-43e5-8e5d-1be0a63acebd 200 in 232ms
GET /editor/project/79872552-adf5-43e5-8e5d-1be0a63acebd 200 in 210ms
GET /editor/project/79872552-adf5-43e5-8e5d-1be0a63acebd 200 in 212ms
```

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

## 📝 Notes

- This is NOT a React render issue
- This is NOT caused by console.logs
- This IS a navigation/routing logic issue
- Focus on useEffect dependencies and navigation triggers
- Electron file:// protocol might behave differently than HTTP