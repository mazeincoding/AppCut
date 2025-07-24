# Auto Project Creation Bug - Multiple Projects Created on Single Button Click

## 🐛 **PROBLEM DESCRIPTION**

### **Bug Summary**
- **Issue**: Clicking "New Project" button once creates multiple projects automatically
- **Observed**: 14 identical "New Project" entries created from single button click
- **Environment**: Electron app with React hydration issues
- **Impact**: Storage pollution, performance degradation, user confusion

### **Console Evidence**
```log
🚀 [PROJECT DEBUG] Loading all projects...
🚀 [PROJECT DEBUG] Loaded projects: Array(14)
🎨 [RENDER] Rendering project cards: 14
🎨 [RENDER] Rendering project: ff19a8d7-c87f-4f8a-bb1d-39b30ea56260 New Project
🎨 [RENDER] Rendering project: fd5ab5af-d4c3-4a24-af98-e6115c4b5f4d New Project
...12 more identical "New Project" entries
```

## 🔍 **ROOT CAUSE ANALYSIS**

### **Primary Suspects**

#### **1. Event Handler Duplication**
- **File**: `apps/web/src/pages/projects.tsx`
- **Issue**: Multiple event listeners attached to same button
- **Cause**: React hydration issues in Electron environment

#### **2. React Hydration Mismatch**
- **File**: `apps/web/src/pages/_app.tsx`, `apps/web/src/pages/_document.tsx`
- **Issue**: Server/client hydration mismatch causing duplicate handlers
- **Evidence**: Electron warnings about webSecurity and CSP

#### **3. Store Action Racing**
- **File**: `apps/web/src/stores/project-store.ts`
- **Issue**: `createNewProject` called multiple times in rapid succession
- **Missing**: Debouncing or loading state protection

#### **4. Fallback Handler Conflicts**
- **File**: `apps/web/src/pages/_document.tsx` (Line 203)
- **Issue**: Fallback JavaScript handler + React handler both firing
- **Evidence**: `project-` prefix IDs mixed with UUID format

## 📂 **RELEVANT FILES AND CODE SECTIONS**

### **Primary Files**
1. **`apps/web/src/pages/projects.tsx`**
   - Line ~76: `handleCreateProject` function
   - Line ~412: Button click handler
   - Line ~255-257: Project rendering loop

2. **`apps/web/src/stores/project-store.ts`**
   - Line ~38: `createNewProject` function
   - Line ~143: `loadAllProjects` initialization
   - No debouncing or race condition protection

3. **`apps/web/src/pages/_document.tsx`**
   - Line ~203: Fallback project creation handler
   - Line ~221: Alternative fallback mechanism
   - Potential conflict with React handlers

4. **`apps/web/src/pages/_app.tsx`**
   - Line ~22: App initialization with error boundary
   - Line ~67-72: Provider configuration
   - Hydration fix attempts

### **Code Snippets to Investigate**

#### **Button Handler (projects.tsx)**
```tsx
const handleCreateProject = async () => {
  // Missing: Loading state check
  // Missing: Debouncing
  const projectId = await createNewProject("New Project");
  router.push(`/editor/project/${projectId}`);
};
```

#### **Store Action (project-store.ts)**
```tsx
createNewProject: async (name: string) => {
  // Missing: Race condition protection
  // Missing: Duplicate prevention
  const newProject: TProject = {
    id: generateUUID(), // Multiple UUIDs being generated
    name,
    // ...
  };
  await storageService.saveProject(newProject);
};
```

#### **Fallback Handler (_document.tsx)**
```javascript
const projectId = 'project-' + Date.now();
// This runs ALONGSIDE React handler
```

## 🚨 **IMMEDIATE SYMPTOMS**

### **Performance Impact**
- 14 projects loaded unnecessarily
- Storage service overwhelmed
- UI rendering 14 identical cards
- Memory usage increased

### **User Experience**
- Confusing duplicate projects
- Slower app initialization
- Storage space wasted
- Navigation uncertainty

## ✅ **SOLUTION IMPLEMENTED**

### **Changes Made**

#### **1. Added Button Debouncing (projects.tsx)**
```tsx
const [isCreatingProject, setIsCreatingProject] = useState(false);

const handleCreateProject = async () => {
  if (isCreatingProject) {
    console.log('🚫 [PROJECT] Creation already in progress, ignoring duplicate click');
    return;
  }
  
  setIsCreatingProject(true);
  // ... project creation logic
  finally {
    setIsCreatingProject(false);
  }
};
```

#### **2. Added Store Race Condition Protection (project-store.ts)**
```tsx
createNewProject: async (name: string) => {
  const { isLoading } = get();
  if (isLoading) {
    console.log("🚫 CREATE PROJECT BLOCKED: Already creating a project");
    throw new Error("Project creation already in progress");
  }
  
  set({ isLoading: true });
  try {
    // ... project creation logic
  } finally {
    set({ isLoading: false });
  }
};
```

#### **3. Updated UI Components for Loading States**
```tsx
function CreateButton({ onClick, disabled = false }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button className="gap-2" onClick={onClick} disabled={disabled}>
      <Plus className="!size-4" />
      {disabled ? "Creating..." : "New project"}
    </Button>
  );
}

// All usages updated:
<CreateButton onClick={handleCreateProject} disabled={isCreatingProject} />
```

## ✅ **PROPOSED SOLUTIONS** (LEGACY)

### **1. Add Button Debouncing**
```tsx
const [isCreating, setIsCreating] = useState(false);

const handleCreateProject = async () => {
  if (isCreating) return; // Prevent multiple clicks
  setIsCreating(true);
  try {
    const projectId = await createNewProject("New Project");
    router.push(`/editor/project/${projectId}`);
  } finally {
    setIsCreating(false);
  }
};
```

### **2. Store Race Condition Protection**
```tsx
createNewProject: async (name: string) => {
  const { isLoading } = get();
  if (isLoading) return; // Prevent concurrent creation
  
  set({ isLoading: true });
  try {
    // Create project logic
  } finally {
    set({ isLoading: false });
  }
};
```

### **3. Remove Fallback Handler Conflicts**
- Remove or conditionally disable fallback handlers when React is working
- Add `data-react-hydrated` flag to prevent fallback execution

### **4. Add Unique Project Detection**
```tsx
// Before creating, check for recent duplicates
const recentProjects = savedProjects.filter(p => 
  p.name === name && 
  Date.now() - p.createdAt.getTime() < 5000 // 5 second window
);
if (recentProjects.length > 0) return recentProjects[0].id;
```

## 🎯 **TESTING PLAN**

### **Reproduction Steps**
1. Open Electron app
2. Navigate to Projects page
3. Click "New Project" button ONCE
4. Check console logs for duplicate creation
5. Verify only ONE project is created

### **Success Criteria**
- ✅ Single button click creates exactly ONE project
- ✅ No duplicate project entries in storage
- ✅ No race condition console errors
- ✅ Button disabled during creation process
- ✅ Clean console logs without duplication warnings

## 🔧 **IMPLEMENTATION PRIORITY**

1. **CRITICAL**: Add button debouncing (immediate fix)
2. **HIGH**: Store race condition protection  
3. **MEDIUM**: Remove fallback handler conflicts
4. **LOW**: Add duplicate detection as safety net

---

**Status**: 🔍 Analysis complete, ready for implementation
**Estimated Fix Time**: 15-30 minutes
**Risk Level**: LOW (UI-only changes, no data loss risk)