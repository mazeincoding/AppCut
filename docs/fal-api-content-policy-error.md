# FAL API Content Policy Violation Error

## Error Summary
The FAL API is rejecting image edit requests with a 422 status code due to content policy violations.

## Error Details

### HTTP Status
- **Status Code**: 422 (Unprocessable Entity)
- **Error Type**: `content_policy_violation`
- **Documentation**: https://docs.fal.ai/errors#content_policy_violation

### Error Message
```
The content could not be processed because it contained material flagged by a content checker.
```

### Console Logs
```
edit-image:1 Failed to load resource: the server responded with a status of 422 ()
FAL API Error: {detail: Array(1)}
Edit failed: Error: API error: 422 - [{"loc":["body","prompt"],"msg":"The content could not be processed because it contained material flagged by a content checker.","type":"content_policy_violation","url":"https://docs.fal.ai/errors#content_policy_violation","input":{"prompt":"wear bikini","image_url":"data:image/png;base64,..."}}]
```

## Root Cause Analysis

### Flagged Content
The error was triggered by the prompt: **"wear bikini"**

### Why This Was Flagged
FAL API's content policy appears to:
1. **Block clothing-related prompts** that could generate inappropriate content
2. **Flag body/appearance modifications** that might be sensitive
3. **Apply strict content filtering** to prevent misuse

### Content Policy Scope
Based on this error, FAL API likely restricts:
- Clothing modifications or removal
- Body-related edits
- Potentially suggestive content
- Content that could be used inappropriately

## Technical Details

### Error Location
- **File**: `apps/web/src/lib/image-edit-client.ts:193`
- **Function**: `editImage()`
- **Component**: `apps/web/src/components/editor/media-panel/views/adjustment.tsx:219`

### Request Structure
```javascript
{
  prompt: "wear bikini",
  image_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABYAAAAMACAIAAAASU1SbAAAgAElEQVR4nKy9..."
}
```

## Solution: Better Error Handling (Non-Breaking)

### **Improved Error Handling** (Recommended)
- Catch 422 content policy errors specifically
- Show user-friendly messages instead of technical errors
- Prevent system crashes and maintain functionality
- Keep existing workflow intact

## Files to Modify

### **`apps/web/src/lib/image-edit-client.ts`** (lines 191-197)
**Current error handling:**
```javascript
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));
  console.error('FAL API Error:', errorData);
  const errorMessage = errorData.detail 
    ? (typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail))
    : errorData.message || response.statusText;
  throw new Error(`API error: ${response.status} - ${errorMessage}`);
}
```

**Current issue**: 
- All HTTP errors throw generic technical messages
- No special handling for content policy violations (422 errors)
- Raw JSON errors exposed to users

**Required fix**: 
- Check for `response.status === 422` specifically
- Parse `errorData.detail` array for `content_policy_violation` type
- Throw user-friendly messages for content policy errors
- Keep technical error handling for other error types

### **`apps/web/src/components/editor/media-panel/views/adjustment.tsx`** (lines 218-223)  
**Current error handling:**
```javascript
} catch (error) {
  console.error('Edit failed:', error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  setError(`Edit failed: ${errorMessage}`);
  setProcessingState({ isProcessing: false });
}
```

**Current issue**: 
- Directly displays technical error messages from API
- No differentiation between error types
- `setError()` shows raw API errors to users

**Required fix**:
- Check error message for content policy indicators
- Show user-friendly toast notifications using existing `toast` import (line 37)
- Provide actionable guidance for content policy violations
- Maintain existing error state management

## Implementation Approach

### **Error Handling Strategy**
1. **In `image-edit-client.ts`**: 
   - Check `response.status === 422`
   - Parse `errorData.detail` array for `type: "content_policy_violation"`
   - Throw simplified error message for content policy violations

2. **In `adjustment.tsx`**: 
   - Check caught error messages for content policy indicators
   - Use existing `toast.error()` for user notifications instead of `setError()`
   - Provide actionable guidance without breaking the UI flow

### **Error Message Transformation**
- **Current**: `API error: 422 - [{"loc":["body","prompt"],"msg":"The content could not be processed because it contained material flagged by a content checker.","type":"content_policy_violation"...`
- **Improved**: `"Content policy violation: Please use appropriate language for image descriptions"`

### **Specific Error Structure (from console logs)**
The API returns a 422 with this structure:
```javascript
{
  detail: [{
    loc: ["body", "prompt"],
    msg: "The content could not be processed because it contained material flagged by a content checker.",
    type: "content_policy_violation",
    url: "https://docs.fal.ai/errors#content_policy_violation",
    input: { prompt: "wear bikini", image_url: "data:image/png;base64,..." }
  }]
}
```

## Expected Behavior After Fix

### **Before (Broken)**
- Console errors crash the editing flow
- Users see technical error messages
- No guidance on how to proceed
- System becomes unusable

### **After (Fixed)**  
- Content policy errors handled gracefully
- Clear, actionable error messages
- Users can retry with different prompts
- System remains stable and functional

## Priority: High
This is a system stability issue that breaks core functionality. The fix should focus on preventing crashes and maintaining usability rather than complex content filtering.