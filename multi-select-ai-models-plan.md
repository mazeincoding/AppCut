# Multi-Select AI Models Feature Plan

## Overview
Implement functionality to allow users to select multiple AI models simultaneously for video generation, giving them the option to generate videos with different models in parallel or compare results.

## Current Implementation Analysis

### Current State
- **File**: `apps/web/src/components/editor/media-panel/views/ai.tsx`
- **Current Selection**: Single model selection using `selectedModel` state (line 47)
- **UI Component**: Select dropdown with monospace font, clean white text on transparent background with blue hover effects
- **Generation**: Single model per generation request with history tracking
- **Models Available**: 6 AI models (Veo3, Veo3 Fast, Veo2, Hailuo, Kling v1.5, Kling v2.1)
- **Tabs**: Text-to-Video and Image-to-Video with transparent styling and hover effects

### Current Code Structure
```tsx
// State management (line 47)
const [selectedModel, setSelectedModel] = useState<string>("");

// Current dropdown implementation (lines 563-633)
<Select 
  value={selectedModel}
  onValueChange={setSelectedModel}
>
  <SelectContent className="bg-background border border-border/50 shadow-lg rounded-lg min-w-[280px] font-mono">
    {AI_MODELS.map((model, index) => (
      <Fragment key={model.id}>
        <SelectItem value={model.id} className="px-3 py-2 rounded-md hover:bg-accent/50">
          <div className="flex items-center justify-between w-full px-2">
            <span className="font-medium text-sm">{model.name}</span>
            <span className="text-xs text-muted-foreground">
              USD {model.price} • {model.resolution}
            </span>
          </div>
        </SelectItem>
        {index < AI_MODELS.length - 1 && <div className="mx-2 h-px bg-border my-1" />}
      </Fragment>
    ))}
  </SelectContent>
</Select>
```

## Implementation Approach: Toggle Buttons Grid

**Pros**:
- Clean visual selection interface
- Easy to see multiple selected models at once
- Intuitive toggle interaction
- Fits well with existing UI style
- Shows model information clearly

**Cons**:
- Requires more vertical space than dropdown

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

### Step 2: Create Toggle Buttons Grid UI Component

Replace the current Select dropdown with a toggle buttons grid that allows multiple selection:

```tsx
import { Check } from "lucide-react";

// Replace the current Select component with:
<div className="space-y-2">
  <Label htmlFor="models" className="text-sm font-medium text-foreground">
    AI Models
  </Label>
  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
    {AI_MODELS.map((model) => (
      <Button
        key={model.id}
        type="button"
        variant="outline"
        size="sm"
        onClick={() => toggleModel(model.id)}
        className={`
          flex items-center justify-between p-3 h-auto text-left font-mono
          transition-all duration-200 border-border/50 
          ${isModelSelected(model.id) 
            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' 
            : 'bg-transparent hover:bg-accent/50 hover:border-border'
          }
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`
            w-4 h-4 rounded border flex items-center justify-center
            ${isModelSelected(model.id) 
              ? 'bg-blue-500 border-blue-500' 
              : 'border-border bg-transparent'
            }
          `}>
            {isModelSelected(model.id) && (
              <Check className="w-3 h-3 text-white" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-sm">{model.name}</span>
            <span className="text-xs text-muted-foreground">
              {model.description}
            </span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground font-normal ml-6">
          USD {model.price} • {model.resolution}
        </span>
      </Button>
    ))}
  </div>
  
  {/* Quick Actions */}
  <div className="flex gap-2 pt-2">
    <Button
      type="button"
      size="xs"
      variant="text"
      onClick={() => setSelectedModels(AI_MODELS.map(m => m.id))}
      className="text-xs"
    >
      Select All
    </Button>
    <Button
      type="button"
      size="xs"
      variant="text"
      onClick={() => setSelectedModels([])}
      className="text-xs"
    >
      Clear All
    </Button>
  </div>
</div>
```

### Step 3: Update Generation Logic

Update the existing `handleGenerate` function to support multiple models:

```tsx
const handleGenerate = async () => {
  // Update validation to check for selectedModels instead of selectedModel
  if (activeTab === "text") {
    if (!prompt.trim() || selectedModels.length === 0) return;
  } else {
    if (!selectedImage || selectedModels.length === 0) return;
  }
  
  setIsGenerating(true);
  setError(null);
  setJobId(null);
  
  // Reset any existing generated videos
  setGeneratedVideos([]);
  
  try {
    const generations = [];
    
    // Sequential generation (recommended to avoid rate limits)
    for (let i = 0; i < selectedModels.length; i++) {
      const modelId = selectedModels[i];
      setStatusMessage(`Generating with ${AI_MODELS.find(m => m.id === modelId)?.name} (${i + 1}/${selectedModels.length})`);
      
      let response;
      
      if (activeTab === "text") {
        response = await generateVideo({
          prompt: prompt.trim(),
          model: modelId,
          resolution: "1080p",
          duration: 5
        });
      } else {
        response = await generateVideoFromImage({
          image: selectedImage!,
          model: modelId,
          prompt: prompt.trim() || undefined,
          resolution: "1080p",
          duration: 5
        });
      }
      
      if (response.status === "completed" && response.video_url) {
        const newVideo = {
          jobId: response.job_id,
          videoUrl: response.video_url,
          videoPath: response.video_url,
          fileSize: undefined,
          duration: 5,
          prompt: prompt.trim(),
          model: modelId
        };
        
        generations.push({ modelId, video: newVideo });
        
        // Add each video to history as it's generated
        addToHistory(newVideo);
        
        // Automatically add to media store
        if (activeProject) {
          try {
            const videoResponse = await fetch(newVideo.videoUrl);
            const blob = await videoResponse.blob();
            const modelName = AI_MODELS.find(m => m.id === modelId)?.name || modelId;
            const file = new File([blob], `ai-${modelName.toLowerCase()}-${newVideo.jobId.substring(0, 8)}.mp4`, {
              type: 'video/mp4',
            });
            
            await addMediaItem(activeProject.id, {
              name: `AI (${modelName}): ${newVideo.prompt.substring(0, 20)}...`,
              type: "video",
              file: file,
              url: newVideo.videoUrl,
              duration: newVideo.duration || 5,
              width: 1920,
              height: 1080,
            });
          } catch (addError) {
            console.error('Failed to add video to media store:', addError);
          }
        }
      }
    }
    
    setGeneratedVideos(generations);
    setStatusMessage(`Generated ${generations.length} videos successfully!`);
    
  } catch (error) {
    setError(handleApiError(error));
    debugLogger.log('AIView', 'MULTI_GENERATION_FAILED', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
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

### Step 5: Update Validation and Cost Display

Update the existing validation logic and cost display:

```tsx
// Update the canGenerate function (around line 415)
const canGenerate = (() => {
  if (isGenerating || selectedModels.length === 0) return false;
  if (activeTab === "text") {
    return prompt.trim().length > 0;
  } else {
    return selectedImage !== null;
  }
})();

// Update cost calculation
const totalCost = selectedModels.reduce((total, modelId) => {
  const model = AI_MODELS.find(m => m.id === modelId);
  return total + (model ? parseFloat(model.price) : 0);
}, 0);

// Replace the existing cost display section (around line 715) with:
{selectedModels.length > 0 && !generatedVideos.length && (
  <div className="mt-2 text-center">
    <span className="text-xs text-muted-foreground">
      Total Cost: USD {totalCost.toFixed(2)} • {selectedModels.length} model{selectedModels.length > 1 ? 's' : ''}
    </span>
  </div>
)}

// Update validation message (around line 724)
{!canGenerate && !isGenerating && generatedVideos.length === 0 && (
  <div className="mt-2 text-center">
    <span className="text-xs text-muted-foreground">
      {selectedModels.length === 0 ? "Select at least one AI model" : 
       activeTab === "text" ? "Enter a video description" : 
       "Upload an image"}
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
   - State management updates (selectedModel → selectedModels array)
   - Toggle buttons grid UI component 
   - Basic multiple model selection with checkboxes
   - Update validation logic for multiple models

2. **Medium Priority**
   - Sequential generation logic with progress tracking
   - Cost calculation and display updates
   - Multiple results display component
   - Quick actions (Select All, Clear All buttons)

3. **Low Priority**
   - Advanced result comparison interface
   - Export all generated videos functionality
   - Model performance analytics

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