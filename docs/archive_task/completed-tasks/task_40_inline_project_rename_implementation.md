# Inline Project Rename Implementation Guide

## Current State Analysis

The project rename functionality **already exists** but is **not accessible** from the current compact card layout. Here's what's already implemented:

### ✅ **Existing Infrastructure:**

1. **RenameProjectDialog Component** (`apps/web/src/components/rename-project-dialog.tsx`)
   - Complete dialog with input field and validation
   - Enter key support for quick renaming
   - Cancel/confirm buttons
   - Auto-focuses and pre-fills current name

2. **Project Store Function** (`apps/web/src/stores/project-store.ts` lines 226-260)
   - `renameProject(id: string, name: string)` function
   - Updates storage, refreshes project list
   - Updates active project if currently open
   - Error handling with toast notifications

3. **Handler Function** (`apps/web/src/pages/projects.tsx`)
   - `handleRenameProject` function already exists
   - State management for dialog (`isRenameDialogOpen`)

## Problem: Missing Trigger

The **only missing piece** is a way to trigger the rename dialog from the current compact cards. The original design had this in a dropdown menu, but we simplified the cards.

## Implementation Options

### Option 1: Add Edit Icon to Card (Minimal Code - **Recommended**)

**Code Changes Required:** ~10 lines

Add a small edit icon next to the project name:

```tsx
// In project card, replace the h3 title:
<div className="flex items-center justify-between">
  <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
    {project.name}
  </h3>
  <button
    onClick={(e) => {
      e.stopPropagation();
      setIsRenameDialogOpen(true);
    }}
    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded"
    title="Rename project"
  >
    <Pencil className="h-3 w-3 text-gray-400" />
  </button>
</div>
```

**Files to modify:**
1. `apps/web/src/pages/projects.tsx` - Add edit button (10 lines)
2. Import `Pencil` icon from lucide-react (1 line)

**Total:** ~11 lines of code

---

### Option 2: Double-Click to Rename (Inline Editing)

**Code Changes Required:** ~30 lines

Make the project name directly editable:

```tsx
const [isEditing, setIsEditing] = useState(false);
const [editName, setEditName] = useState(project.name);

// Replace h3 with:
{isEditing ? (
  <input
    value={editName}
    onChange={(e) => setEditName(e.target.value)}
    onBlur={() => handleSaveRename()}
    onKeyDown={(e) => {
      if (e.key === 'Enter') handleSaveRename();
      if (e.key === 'Escape') handleCancelRename();
    }}
    className="font-semibold text-gray-900 text-sm bg-transparent border-b border-blue-500 outline-none"
    autoFocus
  />
) : (
  <h3 
    className="font-semibold text-gray-900 text-sm line-clamp-1 cursor-pointer"
    onDoubleClick={() => setIsEditing(true)}
  >
    {project.name}
  </h3>
)}
```

**Files to modify:**
1. `apps/web/src/pages/projects.tsx` - Add inline editing logic (~30 lines)

**Total:** ~30 lines of code

---

### Option 3: Right-Click Context Menu

**Code Changes Required:** ~40 lines

Add context menu on right-click:

```tsx
const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);

// Add to card:
onContextMenu={(e) => {
  e.preventDefault();
  setContextMenu({x: e.clientX, y: e.clientY});
}}

// Add context menu component
{contextMenu && (
  <div 
    className="fixed bg-white border shadow-lg rounded-md py-1 z-50"
    style={{left: contextMenu.x, top: contextMenu.y}}
  >
    <button onClick={() => setIsRenameDialogOpen(true)}>Rename</button>
    <button onClick={() => handleDelete()}>Delete</button>
  </div>
)}
```

**Files to modify:**
1. `apps/web/src/pages/projects.tsx` - Add context menu logic (~40 lines)

**Total:** ~40 lines of code

---

### Option 4: Restore Dropdown Menu

**Code Changes Required:** ~60 lines

Add back the three-dots menu button to each card:

```tsx
// Add dropdown button to card header
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="opacity-0 group-hover:opacity-100 p-1">
      <MoreHorizontal className="h-4 w-4" />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => setIsRenameDialogOpen(true)}>
      Rename
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleDuplicate()}>
      Duplicate  
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)}>
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Files to modify:**
1. `apps/web/src/pages/projects.tsx` - Add dropdown menu (~60 lines)
2. Add imports for dropdown components (~5 lines)

**Total:** ~65 lines of code

---

## Recommendation: Option 1 (Edit Icon)

**Why this is the best choice:**

✅ **Minimal Code:** Only 11 lines to add
✅ **Clean UI:** Small edit icon, appears on hover
✅ **Familiar UX:** Standard pattern users expect
✅ **Uses Existing:** Leverages all existing rename infrastructure
✅ **Quick Implementation:** 5 minutes to implement

## Implementation Steps for Option 1

### Step 1: Add Import (1 line)
```tsx
import { Pencil } from "lucide-react";
```

### Step 2: Modify Project Name Section (10 lines)
Replace the current `h3` element at line 265-267 with the flex container and edit button.

### Step 3: Test
- Hover over cards to see edit icon
- Click edit icon to open rename dialog
- Rename and verify it saves properly

## Files That DON'T Need Changes

✅ **Storage Layer:** Already handles rename correctly
✅ **Rename Dialog:** Already exists and works perfectly  
✅ **Project Store:** Already has full rename functionality
✅ **Error Handling:** Already has toast notifications
✅ **State Management:** Already has all necessary state

## Summary

To add inline project renaming to the current page:
- **Minimal approach:** 11 lines of code (edit icon)
- **All infrastructure exists:** Just need a trigger button
- **5-minute implementation:** Very quick to add
- **No breaking changes:** Maintains current clean design

The rename functionality is already robust and complete - we just need to expose it in the UI!