# TabBar Icon Spacing Plan

## Target File
`apps/web/src/components/editor/media-panel/tabbar.tsx`

## Specific Change Location
**Line 107-111**: The icon rendering section

## Current Code Structure
```tsx
<tab.icon className={cn(
  "transition-all duration-200",
  showLabels ? "!size-[1.5rem]" : "!size-[1.2rem]",
  activeTab !== tabKey && "group-hover:text-blue-500"
)} />
```

## Proposed Change
Add an empty line before the `<tab.icon` element:

```tsx

<tab.icon className={cn(
  "transition-all duration-200",
  showLabels ? "!size-[1.5rem]" : "!size-[1.2rem]",
  activeTab !== tabKey && "group-hover:text-blue-500"
)} />
```

## Additional Icon Locations in Same File

### ScrollButton Icon (Line 146)
Current:
```tsx
<Icon className="!size-4 text-foreground" />
```

Proposed:
```tsx

<Icon className="!size-4 text-foreground" />
```

## Impact
- Affects the media panel tab icons (AI, Media, Adjustment, Audio, Text, Text2Image, Stickers, Effects, Transition)
- Also affects the scroll navigation chevron icons
- Total changes: 2 locations in the file

## Benefits
- Improved code readability
- Better visual separation in code structure
- Consistent spacing pattern for icon elements