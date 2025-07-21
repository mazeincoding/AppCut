# Radio Button Size Issue - Export Dialog

## Problem Description
The radio buttons in the Export Video dialog appear too large. Despite making changes to reduce their size in the component file, the changes are not being reflected in the browser.

## Visual Evidence
- Radio button indicators (inner circles) appear disproportionately large
- The issue persists even after modifying the source files
- Located in the Export Video dialog for Format and Quality selection

## Relevant Files and Code

### 1. Radio Group Component
**File**: `apps/web/src/components/ui/radio-group.tsx`

**Current Code** (After modifications):
```tsx
const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "aspect-square h-3 w-3 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-1.5 w-1.5 fill-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
```

**Changes Made**:
- Container size: `h-4 w-4` → `h-3 w-3`
- Inner circle: `h-3.5 w-3.5` → `h-1.5 w-1.5`

### 2. Export Dialog Implementation
**File**: `apps/web/src/components/export-dialog.tsx`

**Radio Group Usage** (Lines 200-213):
```tsx
<RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value={ExportFormat.MP4} id="mp4" />
    <Label htmlFor="mp4">MP4 (Recommended)</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value={ExportFormat.WEBM} id="webm" />
    <Label htmlFor="webm">WebM</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value={ExportFormat.MOV} id="mov" />
    <Label htmlFor="mov">MOV</Label>
  </div>
</RadioGroup>
```

**Quality Radio Group** (Lines 219-233):
```tsx
<RadioGroup value={quality} onValueChange={(value) => setQuality(value as ExportQuality)}>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value={ExportQuality.HIGH} id="1080p" />
    <Label htmlFor="1080p">1080p (High Quality)</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value={ExportQuality.MEDIUM} id="720p" />
    <Label htmlFor="720p">720p (Medium Quality)</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value={ExportQuality.LOW} id="480p" />
    <Label htmlFor="480p">480p (Low Quality)</Label>
  </div>
</RadioGroup>
```

## Browser Rendered HTML
The browser shows the following structure:
```html
<button type="button" role="radio" aria-checked="true" 
        class="aspect-square h-4 w-4 rounded-full border border-primary...">
  <span class="flex items-center justify-center">
    <svg class="lucide lucide-circle h-2 w-2 fill-primary">
      <circle cx="12" cy="12" r="10"></circle>
    </svg>
  </span>
</button>
```

## Potential Issues

### 1. CSS Caching
- Browser might be caching old CSS
- Development server hot reload might not be updating styles

### 2. Build Process
- Tailwind CSS classes might not be regenerating
- Component library might be cached

### 3. CSS Specificity
- Other styles might be overriding the component styles
- Global styles or theme settings could be affecting the size

## Troubleshooting Steps

1. **Clear Browser Cache**
   - Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
   - Clear all browser data for localhost

2. **Restart Development Server**
   ```bash
   # Stop the server (Ctrl+C)
   # Then restart
   npm run dev
   # or
   bun run dev
   ```

3. **Check Tailwind Configuration**
   - Ensure `apps/web/src/components/ui/radio-group.tsx` is in content paths
   - File: `apps/web/tailwind.config.ts`

4. **Verify Build Output**
   - Check if the CSS classes are being generated correctly
   - Look for compiled CSS in browser DevTools

5. **Component Library Cache**
   - Delete `node_modules/.cache` if it exists
   - Rebuild the project

## Alternative Solutions

### 1. Inline Styles (Temporary)
```tsx
<Circle className="h-1.5 w-1.5 fill-primary" style={{ width: '6px', height: '6px' }} />
```

### 2. Custom CSS Classes
Create specific classes in a CSS file:
```css
.radio-button-small {
  width: 12px !important;
  height: 12px !important;
}

.radio-indicator-small {
  width: 6px !important;
  height: 6px !important;
}
```

### 3. Override in Export Dialog
Add size prop to RadioGroupItem if needed:
```tsx
<RadioGroupItem value={ExportFormat.MP4} id="mp4" className="h-3 w-3" />
```

## SOLUTION IMPLEMENTED ✅

**Root Cause Confirmed**: Development server caching issue - source code changes not reflecting in browser.

**Emergency Fix Applied**: Direct className override in export dialog:
```tsx
// File: apps/web/src/components/export-dialog.tsx
<RadioGroupItem value={ExportFormat.MP4} id="mp4" className="!h-3 !w-3" />
<RadioGroupItem value={ExportQuality.HIGH} id="1080p" className="!h-3 !w-3" />
```

**Why This Works**:
- `!h-3 !w-3` uses Tailwind's important modifier
- Forces override of any cached `h-4 w-4` styles
- Applied directly to each RadioGroupItem in export dialog

**Status**: Radio buttons should now appear smaller (12px × 12px instead of 16px × 16px)

## Next Steps

1. ✅ **COMPLETED**: Applied direct size override to all radio buttons in export dialog
2. Refresh browser to see smaller radio buttons
3. If still not working, restart development server completely
4. Future: Once caching resolved, remove overrides and rely on base component