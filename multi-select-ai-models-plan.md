# Multi-Select AI Models Feature Plan

## Overview
Implement functionality to allow users to select multiple AI models simultaneously for video generation, giving them the option to generate videos with different models in parallel or compare results.

## Current Implementation Analysis

### Current State
- **File**: `apps/web/src/components/editor/media-panel/views/ai.tsx`
- **Current Selection**: Single model selection using `selectedModel` state
- **UI Component**: Standard Select dropdown with single value
- **Generation**: One model per generation request

### Current Code Structure
```tsx
const [selectedModel, setSelectedModel] = useState<string>("");

<Select 
  value={selectedModel}
  onValueChange={setSelectedModel}
>
  <SelectContent>
    {AI_MODELS.map((model) => (
      <SelectItem value={model.id}>
        {model.name} - USD {model.price}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

## Implementation Options

### Option 1: Multi-Select Dropdown with Checkboxes
**Pros**: 
- Familiar UI pattern
- Clear visual indication of selected models
- Compact space usage

**Cons**:
- More complex dropdown implementation
- May be cluttered with many models

### Option 2: Separate Multi-Select Component (Recommended)
**Pros**:
- Clean separation of concerns
- Better user experience
- Easier to implement
- Can show selected models clearly

**Cons**:
- Requires more UI space

## Recommended Implementation Plan

### Step 1: Update State Management
**File**: `apps/web/src/components/editor/media-panel/views/ai.tsx`

```tsx
// Replace single model state
const [selectedModel, setSelectedModel] = useState<string>("");

// With multi-model state
const [selectedModels, setSelectedModels] = useState<string[]>([]);

// Helper functions
const toggleModel = (modelId: string) => {
  setSelectedModels(prev => 
    prev.includes(modelId) 
      ? prev.filter(id => id !== modelId)
      : [...prev, modelId]
  );
};

const isModelSelected = (modelId: string) => selectedModels.includes(modelId);
```

### Step 2: Create Multi-Select UI Component

#### Option A: Checkbox List
```tsx
<div className="space-y-2">
  <Label className="text-sm font-medium">Select AI Models</Label>
  <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
    {AI_MODELS.map((model) => (
      <div key={model.id} className="flex items-center space-x-3 p-2 hover:bg-accent rounded">
        <input
          type="checkbox"
          id={`model-${model.id}`}
          checked={isModelSelected(model.id)}
          onChange={() => toggleModel(model.id)}
          className="w-4 h-4"
        />
        <label 
          htmlFor={`model-${model.id}`} 
          className="flex-1 cursor-pointer"
        >
          <div className="flex justify-between items-center">
            <span className="font-medium text-sm">{model.name}</span>
            <span className="text-xs text-muted-foreground">
              USD {model.price} • {model.resolution}
            </span>
          </div>
        </label>
      </div>
    ))}
  </div>
</div>
```

#### Option B: Toggle Buttons Grid
```tsx
<div className="space-y-2">
  <Label className="text-sm font-medium">Select AI Models</Label>
  <div className="grid grid-cols-2 gap-2">
    {AI_MODELS.map((model) => (
      <Button
        key={model.id}
        variant={isModelSelected(model.id) ? "default" : "outline"}
        size="sm"
        onClick={() => toggleModel(model.id)}
        className="flex flex-col items-start p-3 h-auto"
      >
        <div className="flex items-center gap-2 mb-1">
          {isModelSelected(model.id) && <CheckIcon className="w-4 h-4" />}
          <span className="font-medium text-xs">{model.name}</span>
        </div>
        <span className="text-xs opacity-70">
          USD {model.price} • {model.resolution}
        </span>
      </Button>
    ))}
  </div>
</div>
```

### Step 3: Update Generation Logic

```tsx
const handleGenerate = async () => {
  if (selectedModels.length === 0) return;
  
  setIsGenerating(true);
  setError(null);
  
  try {
    // Option A: Sequential generation
    const generations = [];
    for (const modelId of selectedModels) {
      const response = await generateVideo({
        prompt: prompt.trim(),
        model: modelId,
        resolution: "1080p",
        duration: 5
      });
      generations.push({ modelId, response });
    }
    
    // Option B: Parallel generation
    const generationPromises = selectedModels.map(modelId => 
      generateVideo({
        prompt: prompt.trim(),
        model: modelId,
        resolution: "1080p",
        duration: 5
      }).then(response => ({ modelId, response }))
    );
    
    const generations = await Promise.all(generationPromises);
    
    // Handle multiple results
    setGeneratedVideos(generations);
    
  } catch (error) {
    setError(handleApiError(error));
  } finally {
    setIsGenerating(false);
  }
};
```

### Step 4: Update UI for Multiple Results

```tsx
// Add new state for multiple videos
const [generatedVideos, setGeneratedVideos] = useState<Array<{
  modelId: string;
  video: GeneratedVideo;
}>>([]);

// Results display component
const MultiModelResults = () => (
  <div className="space-y-3">
    <h4 className="font-medium text-sm">Generated Videos</h4>
    {generatedVideos.map(({ modelId, video }) => {
      const model = AI_MODELS.find(m => m.id === modelId);
      return (
        <div key={modelId} className="border rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium text-sm">{model?.name}</span>
            <span className="text-xs text-muted-foreground">
              USD {model?.price}
            </span>
          </div>
          <video 
            src={video.videoUrl} 
            className="w-full h-24 object-cover rounded"
            controls
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <Download className="w-3 h-3 mr-1" />
              Download
            </Button>
            <Button size="sm" variant="outline">
              Add to Timeline
            </Button>
          </div>
        </div>
      );
    })}
  </div>
);
```

### Step 5: Cost Calculation Update

```tsx
const totalCost = selectedModels.reduce((total, modelId) => {
  const model = AI_MODELS.find(m => m.id === modelId);
  return total + (model ? parseFloat(model.price) : 0);
}, 0);

// Display total cost
{selectedModels.length > 0 && (
  <div className="mt-2 text-center">
    <span className="text-xs text-muted-foreground">
      Total Cost: USD {totalCost.toFixed(2)} ({selectedModels.length} models)
    </span>
  </div>
)}
```

## Technical Considerations

### Performance
- **Parallel Generation**: May hit rate limits or overwhelm the API
- **Sequential Generation**: Slower but more reliable
- **Progress Tracking**: Need to track progress for multiple concurrent generations

### User Experience
- **Clear Selection State**: Visual indication of selected models
- **Cost Transparency**: Show total cost for multiple models
- **Result Organization**: Clear labeling of which video came from which model
- **Quick Actions**: Easy way to select/deselect all models

### Error Handling
- **Partial Failures**: Some models succeed, others fail
- **Rate Limiting**: Handle API rate limits gracefully
- **Model Availability**: Handle cases where certain models are unavailable

## Implementation Priority

1. **High Priority**
   - Multi-select UI component (checkbox list)
   - State management updates
   - Basic multiple model selection

2. **Medium Priority**
   - Sequential generation logic
   - Cost calculation updates
   - Multiple results display

3. **Low Priority**
   - Parallel generation
   - Advanced result comparison
   - Bulk actions (select all, clear all)

## Files to Modify

1. **`apps/web/src/components/editor/media-panel/views/ai.tsx`**
   - Main component with multi-select logic
   - State management updates
   - UI component changes

2. **`apps/web/src/lib/ai-video-client.ts`** (if exists)
   - Update generation functions for multiple models
   - Add batch generation capabilities

3. **`apps/web/src/types/ai.ts`** (create if needed)
   - Type definitions for multi-model generation
   - Result interfaces

## Testing Checklist

- [ ] Multi-model selection works correctly
- [ ] Cost calculation is accurate
- [ ] Generation works with multiple models
- [ ] Error handling for partial failures
- [ ] Results display correctly for each model
- [ ] Performance acceptable with multiple concurrent generations
- [ ] UI responsive with many selected models

## Future Enhancements

- **Model Comparison**: Side-by-side comparison of generated videos
- **Preset Selections**: Save common model combinations
- **Smart Recommendations**: Suggest model combinations based on prompt
- **Batch Export**: Export all generated videos at once
- **Quality Metrics**: Compare quality/cost ratios across models