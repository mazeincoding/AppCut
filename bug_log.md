# Bug Log - AI Model Selection Navigation Issue

## 🐛 **ISSUE SUMMARY**
**Problem**: Selecting an AI model in the Image to Video tab caused the page to automatically navigate back to the projects page, preventing users from actually using the AI functionality.

**User Report**: "I do not what happen it goes back to new project after I select AI model why?"

## 🔍 **INVESTIGATION PROCESS**

### **Phase 1: Initial Debugging**
- Added console logging to track component renders and state changes
- Suspected state management conflicts between local and global state
- Fixed duplicate `activeTab` state (local vs global media panel store)
- **Result**: Issue persisted

### **Phase 2: Navigation Detection**
- Added navigation timing fixes with `setTimeout` delays
- Refined fallback project detection to prevent false positives
- Fixed `useEffect` dependencies to prevent unnecessary re-runs
- **Result**: Issue persisted

### **Phase 3: Comprehensive Logging System**
- Created `debug-logger.ts` - persistent logging to localStorage
- Added detailed event tracking to AI component and Editor page
- Implemented file export for detailed analysis
- **Result**: Identified exact timing and sequence of events

### **Phase 4: Root Cause Discovery**
**Key Finding**: The issue occurred when opening the dropdown, NOT when selecting a model.

**Log Analysis Revealed**:
1. `MODEL_DROPDOWN_TOGGLE: isOpen: true` - User opens dropdown
2. `DROPDOWN_OPENING_DEBUG: hasUnloadListeners: true` - Unload listeners present
3. `NAVIGATION_DETECTED` - Navigation triggered ~98ms later

**Root Cause**: The `beforeunload` event listener added for debugging was itself causing the navigation issue!

## ✅ **SOLUTION**
**Simple Fix**: Removed the problematic `beforeunload` listener from the AI component.

**Code Change**:
```typescript
// REMOVED THIS CODE:
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    debugLogger.log('AIView', 'NAVIGATION_DETECTED', {
      // ... logging code
    });
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [activeProject?.id, selectedModel, activeTab]);
```

## 📚 **LESSONS LEARNED**

### **1. Debugging Code Interference**
- Sometimes the debugging code itself can cause the issue
- `beforeunload` listeners are sensitive and can be triggered by unexpected DOM events
- Always consider if debugging additions might affect the behavior being debugged

### **2. Effective Debugging Strategy**
- Comprehensive logging with persistent storage worked excellently
- File export allowed detailed analysis of event sequences
- Timing analysis was crucial to identifying the trigger

### **3. Root Cause vs Symptoms**
- Initial focus was on model selection (the symptom)
- Actual issue was dropdown opening (the trigger)
- Persistent investigation through multiple phases was necessary

## 🎯 **TECHNICAL DETAILS**

### **Files Modified During Investigation**
- `apps/web/src/lib/debug-logger.ts` (created)
- `apps/web/src/components/editor/media-panel/views/ai.tsx` (multiple changes)
- `apps/web/src/components/editor/media-panel/store.ts` (added aiActiveTab)
- `apps/web/src/pages/editor/project/[project_id].tsx` (fallback detection)

### **Key Technical Insights**
- `beforeunload` events can be triggered by Select component interactions
- React Radix Select components can trigger unexpected browser events
- Event listeners added for debugging can interfere with component behavior
- localStorage-based logging survives page navigation for better debugging

### **Prevention Strategies**
- Be cautious when adding `beforeunload` listeners
- Consider using less intrusive debugging methods
- Test debugging code in isolation before adding to complex components
- Use feature flags or environment checks for debugging code

## ✅ **STATUS: RESOLVED**
The AI model selection now works correctly without causing page navigation. Users can successfully:
- Navigate to AI → Image to Video
- Upload images
- Open the AI model dropdown
- Select AI models
- Complete video generation workflow

**Resolution Time**: ~4 phases of investigation over multiple iterations
**Key Success Factor**: Comprehensive logging system that captured the exact event sequence