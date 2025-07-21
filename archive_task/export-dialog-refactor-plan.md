# Export Dialog Refactor Plan

## Current Issues
- Persistent JSX syntax error: "Unexpected token `div`. Expected jsx identifier"
- The error occurs at the return statement despite seemingly correct syntax
- Likely caused by:
  1. Missing imports
  2. Unclosed functions/brackets somewhere in the file
  3. Undefined variables being referenced
  4. TypeScript compilation issues

## Root Cause Analysis
The error suggests the JSX parser cannot properly parse the `<div>` element, which typically means:
- There's a syntax error before the return statement
- Missing function closing bracket
- Import/export issues
- Variable scope problems

## Refactor Strategy

### Phase 1: Clean Slate Approach
1. **Backup current functionality** - Document all the features currently in the component
2. **Create minimal working version** - Start with basic panel structure
3. **Add features incrementally** - Add one feature at a time, testing compilation

### Phase 2: Component Structure
```
ExportDialog Component:
├── Imports (clean, minimal)
├── Types & Interfaces
├── Component Function
│   ├── State Management (hooks)
│   ├── Helper Functions (pure functions)
│   ├── Event Handlers
│   ├── Computed Values
│   └── JSX Return
└── Export
```

### Phase 3: Features to Implement
1. **Basic Panel Structure**
   - Right-side sliding panel
   - Header with title and close button
   - Scrollable content area
   - Footer with action buttons

2. **Export Settings**
   - Format selection (MP4, WebM, MOV)
   - Quality selection (High, Medium, Low)
   - Filename input with validation
   - Resolution display

3. **Progress & Status**
   - Export progress bar
   - Status messages
   - Error handling
   - Memory warnings

4. **Advanced Features**
   - Duration analysis
   - Memory usage estimates
   - Export canvas integration

### Phase 4: Implementation Steps
1. Create minimal component with just panel structure
2. Add basic form controls (format, quality, filename)
3. Add export functionality
4. Add progress tracking
5. Add advanced features and validations

## Key Principles
- **Incremental Development**: Add one feature at a time
- **Test After Each Change**: Ensure compilation after each addition
- **Clean Separation**: Separate logic from presentation
- **Type Safety**: Proper TypeScript types throughout
- **Error Handling**: Graceful error handling and user feedback

## Expected Outcome
A clean, maintainable export dialog component that:
- Slides in from the right side
- Has proper TypeScript types
- Compiles without errors
- Provides excellent UX for video export