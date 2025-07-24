# Floating Action Panel Implementation Plan

## Overview
Implement a reusable floating action panel component system for OpenCut that provides quick access to actions and note-taking functionality. The panel will support three styles:
1. **Menu Style**: Dropdown menu with multiple action items
2. **Toolbar Style**: Compact 3-button floating toolbar with clean design
3. **Selection Style**: Simple checkbox + label for model/option selection

## Component Structure

### 1. Core Components to Create
- **FloatingActionPanelRoot**: Context provider managing panel state
- **FloatingActionPanelTrigger**: Button to open/switch panel modes
- **FloatingActionPanelContent**: Container for panel content
- **FloatingActionPanelButton**: Styled action button
- **FloatingActionPanelForm**: Form wrapper for note submission
- **FloatingActionPanelTextarea**: Styled textarea for notes
- **FloatingActionPanelToolbar**: Compact 3-button toolbar variant
- **FloatingActionPanelCheckbox**: Checkbox component for selections
- **FloatingActionPanelOption**: Container for checkbox + label pairs

### 2. Key Features
- **Multiple Display Modes**: 
  - Menu mode: Dropdown with multiple actions
  - Note mode: Form with textarea
  - Toolbar mode: Compact 3-button layout
  - Selection mode: Checkbox + label for options
- **Floating Positioning**: Panel appears above triggers
- **Clean Design**: Light background with subtle borders
- **Icon Support**: Small icons with proper spacing
- **Keyboard Navigation**: Support for keyboard shortcuts
- **Animation**: Smooth transitions when opening/closing
- **Accessibility**: Proper ARIA attributes and focus management

## Implementation Steps

### Step 1: Create Base Component File
Create `/apps/web/src/components/ui/floating-action-panel.tsx`

### Step 2: Build Core Components
1. **Context Setup**
   - Create context for managing panel state
   - Track current mode, open/closed state
   - Provide mode switching functions

2. **Root Component**
   - Render provider with state management
   - Handle click outside to close
   - Manage keyboard events (Escape to close)

3. **Trigger Component**
   - Button that opens panel in specific mode
   - Visual indicator for active state
   - Support for custom styling

4. **Content Component**
   - Floating container using Radix UI Popover or similar
   - Position above triggers
   - Render children based on current mode

5. **Action Components**
   - FloatingActionPanelButton: Consistent button styling
   - Support for icons and text
   - Hover/focus states

6. **Form Components**
   - FloatingActionPanelForm: Handle form submission
   - FloatingActionPanelTextarea: Styled textarea with focus trap

7. **Toolbar Component**
   - FloatingActionPanelToolbar: Container for 3-button layout
   - Horizontal flex layout with gap
   - Fixed height (40px) buttons
   - Light background with border
   - Auto-positioning above content

8. **Selection Components**
   - FloatingActionPanelCheckbox: Styled checkbox (16x16px)
   - FloatingActionPanelOption: Flex container for checkbox + label
   - Support for multiple selections
   - Clean spacing (12px gap between checkbox and label)

### Step 3: Styling

#### Menu/Form Style
- Use Tailwind classes for consistent theming
- Dark mode support
- Smooth animations with Framer Motion or CSS transitions
- Responsive design considerations

#### Toolbar Style (3-Button Design)
- Light background: `bg-gray-50` (rgb(248, 249, 250))
- Border: `border border-gray-200` (rgb(233, 236, 239))
- Button styling:
  - Height: 40px
  - Border radius: 6px
  - Font size: 14px
  - Padding: 16px horizontal
  - Icon size: 14px with 12px right margin
  - Hover states with subtle background change
- Compact layout with minimal spacing between buttons

#### Selection Style (Checkbox + Label)
- Container: `flex items-center space-x-3 p-3 border rounded-lg`
- Checkbox styling:
  - Size: 16x16px (`h-4 w-4`)
  - Rounded corners: `rounded-sm`
  - Border and shadow for depth
  - Checked state with primary color fill
- Label styling:
  - Font size: 14px (`text-sm`)
  - Font weight: medium
  - Clean typography
- Minimal design focused on clarity

### Step 4: Integration Points
1. **Editor Integration**
   - Add to editor header for quick actions
   - Timeline actions (add clip, effects, etc.)
   - Project management actions

2. **Project Page Integration**
   - Project actions (export, share, settings)
   - Quick notes for project documentation

### Step 5: Testing
- Unit tests for state management
- Component interaction tests
- Accessibility testing
- Keyboard navigation tests

## Usage Examples

### Menu Style
```tsx
<FloatingActionPanelRoot>
  {({ mode }) => (
    <>
      <FloatingActionPanelTrigger mode="actions">
        Quick Actions
      </FloatingActionPanelTrigger>
      
      <FloatingActionPanelContent>
        {mode === "actions" ? (
          <div>
            <FloatingActionPanelButton onClick={handleNewClip}>
              Add Clip
            </FloatingActionPanelButton>
          </div>
        ) : (
          <FloatingActionPanelForm onSubmit={handleNote}>
            <FloatingActionPanelTextarea />
          </FloatingActionPanelForm>
        )}
      </FloatingActionPanelContent>
    </>
  )}
</FloatingActionPanelRoot>
```

### Toolbar Style (3 Buttons)
```tsx
<FloatingActionPanelToolbar>
  <FloatingActionPanelButton 
    icon={<Trash2 className="h-3.5 w-3.5" />}
    onClick={handleDeleteAll}
  >
    Delete All
  </FloatingActionPanelButton>
  
  <FloatingActionPanelButton 
    icon={<Copy className="h-3.5 w-3.5" />}
    onClick={handleDuplicate}
  >
    Duplicate
  </FloatingActionPanelButton>
  
  <FloatingActionPanelButton 
    icon={<Download className="h-3.5 w-3.5" />}
    onClick={handleExport}
  >
    Export
  </FloatingActionPanelButton>
</FloatingActionPanelToolbar>
```

### Selection Style (Checkbox + Model Name)
```tsx
<FloatingActionPanelContent>
  <FloatingActionPanelOption>
    <FloatingActionPanelCheckbox 
      id="model-gpt4"
      checked={selectedModel === 'gpt4'}
      onCheckedChange={() => setSelectedModel('gpt4')}
    />
    <label htmlFor="model-gpt4" className="text-sm font-medium">
      GPT-4
    </label>
  </FloatingActionPanelOption>
  
  <FloatingActionPanelOption>
    <FloatingActionPanelCheckbox 
      id="model-claude"
      checked={selectedModel === 'claude'}
      onCheckedChange={() => setSelectedModel('claude')}
    />
    <label htmlFor="model-claude" className="text-sm font-medium">
      Claude 3
    </label>
  </FloatingActionPanelOption>
</FloatingActionPanelContent>
```

## Dependencies
- Radix UI Popover (for positioning)
- Framer Motion (optional, for animations)
- Existing UI components from shadcn/ui

## Next Steps
1. Review existing UI patterns in OpenCut
2. Check for similar components to reuse
3. Implement base component structure
4. Add to specific pages/features