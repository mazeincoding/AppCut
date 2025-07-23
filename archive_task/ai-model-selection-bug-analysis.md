# AI Model Selection Bug Analysis

## Bug Summary
AI model selection in the media panel is not persisting across sessions and page refreshes, causing poor user experience.

## Key Findings from buglog_v2.md

### Main Issue: Model Selection Not Persisting
- Every `AIView` render shows `"selectedModel": ""` 
- Model dropdown opens successfully but selection isn't being saved
- Issue occurs consistently across multiple project sessions

### Performance Issues
- Frequent unnecessary re-renders (rapid renderCount changes)
- `NAVIGATION_DETECTED` events firing on same page without actual navigation
- Multiple render cycles triggered after image selection

### Specific Log Evidence
```
[2025-07-21T10:41:52.750Z] AIView - MODEL_DROPDOWN_TOGGLE: {
  "isOpen": true,
  "activeTab": "image",
  "selectedModel": "",  // <- Always empty
  "currentProjectId": "e7644ea6-5b89-421b-be35-e9b9db68a653"
}
```

## Root Cause Analysis

### Primary Issues
1. **State Persistence**: Selected model not saved to localStorage or store
2. **State Initialization**: Store not properly loading saved model on component mount
3. **State Updates**: Model selection might not be updating the store correctly

### Files to Investigate
- `apps/web/src/components/editor/media-panel/views/ai.tsx` - AI model selection UI
- `apps/web/src/components/editor/media-panel/store.ts` - State management for model selection
- Check for localStorage persistence logic
- Verify store initialization on component mount

## Next Steps
1. Examine AI view component for model selection handlers
2. Review media panel store for persistence logic
3. Add proper localStorage save/load for selected model
4. Optimize render cycles to reduce unnecessary re-renders
5. Fix navigation detection false positives

## Expected Behavior
- User selects AI model from dropdown
- Selection persists across page refreshes and sessions
- Model selection loads correctly when returning to project
- Minimal re-renders during normal interaction