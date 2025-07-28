# Text-to-Image Implementation Plan

## Overview

The Text2Image tab will integrate with Fal AI API to generate images from text prompts. Generated images will appear in the media panel and be available for use in the video editor timeline. **KEY FEATURE**: Support for simultaneous multi-model generation to compare results and maximize creative options.

## User Flow

### Single Model Generation
1. **User clicks Text2Image tab** → Opens text-to-image interface
2. **User enters text prompt** → Input field for describing desired image
3. **User selects model** → Choose from available Fal AI text-to-image models
4. **User clicks Generate** → API call to Fal AI service
5. **Loading state** → Shows progress while image generates
6. **Image appears in media panel** → Generated image added to media library
7. **User can drag to timeline** → Image becomes usable in video project

### Multi-Model Generation (NEW FEATURE)
1. **User clicks Text2Image tab** → Opens text-to-image interface
2. **User enters text prompt** → Input field for describing desired image
3. **User selects multiple models** → Choose 2-3 models using checkboxes
4. **User clicks "Generate with All Models"** → Simultaneous API calls to multiple services
5. **Parallel loading states** → Shows progress for each model independently
6. **Side-by-side results** → Compare images from different models in real-time
7. **User selects favorites** → Choose which generated images to add to media panel
8. **Selected images added** → Chosen images become available for timeline use

## Technical Architecture

### Single Model API Integration Flow
```
Text2Image Tab → Fal AI Client → Fal API → Image Result → Media Store → Media Panel
```

### Multi-Model API Integration Flow (NEW)
```
Text2Image Tab → Multi-Model Manager → [Parallel API Calls]
                                    ├── Imagen4 Ultra API
                                    ├── SeedDream v3 API  
                                    └── FLUX Pro v1.1 Ultra API
                                           ↓
                Result Aggregator → Comparison View → User Selection → Media Store
```

### Data Flow
#### Single Model
1. User input (prompt, model, settings) → Text2Image component
2. API request → Fal AI client service
3. Generated image URL → Media store
4. Updated media items → Media panel refresh
5. Image available for timeline drag & drop

#### Multi-Model (NEW)
1. User input (prompt, multiple models, settings) → Text2Image component
2. Parallel API requests → Multi-model generation service
3. Multiple image URLs → Comparison results state
4. User selection → Selected images to media store
5. Chosen images → Media panel refresh
6. Selected images available for timeline drag & drop

## File Modifications Required

### 1. Create Text2Image View Component
**File**: `apps/web/src/components/editor/media-panel/views/text2image.tsx`
- Text input for prompts
- **Multi-model selector with checkboxes** (NEW)
- Single model dropdown (legacy mode)
- **"Generate with Selected Models" button** (NEW)
- **Parallel loading states for multiple models** (NEW)
- **Side-by-side comparison view** (NEW)
- **Image selection interface** (NEW)
- Error handling for individual model failures
- Settings panel (dimensions, style, etc.)

### 2. Update Media Panel Index
**File**: `apps/web/src/components/editor/media-panel/index.tsx`
- Replace placeholder with actual `<Text2ImageView />` component
- Import the new component

### 3. Create Fal AI Client Service
**File**: `apps/web/src/lib/fal-ai-client.ts`
- API configuration and authentication
- Text-to-image model definitions
- **Multi-model parallel generation service** (NEW)
- **Request batching and concurrency management** (NEW)
- API request/response handling for individual models
- Error handling and retry logic with model-specific failures
- Image URL processing and result aggregation

### 4. Create Text2Image Models Configuration
**File**: `apps/web/src/lib/text2image-models.ts`
- Available Fal AI text-to-image models:
  - Imagen4 Ultra configuration and parameters
  - SeedDream v3 settings and capabilities  
  - FLUX Pro v1.1 Ultra specifications
- Model-specific pricing information
- Quality vs speed trade-offs for each model
- Recommended use cases per model

### 5. Update Media Store
**File**: `apps/web/src/stores/media-store.ts`
- Add generated images to media items
- Handle image metadata (prompt, model used, etc.)
- Implement image caching/storage logic
- Add text2image-specific actions

### 6. Create Text2Image Store
**File**: `apps/web/src/stores/text2image-store.ts` *(New)*
- Generation state management
- Current prompt and settings
- **Multi-model selection state** (NEW)
- **Parallel loading/error states for each model** (NEW)
- **Comparison results management** (NEW)
- **Image selection tracking** (NEW)
- Generation history with model attribution
- Model recommendation logic

### 7. Update Environment Configuration
**File**: `apps/web/.env.local`
- Add Fal AI API key configuration
- Add any required environment variables

### 8. Update Package Dependencies
**File**: `apps/web/package.json`
- Add Fal AI SDK dependency
- Add any required image processing libraries

### 9. Create API Route Handler
**File**: `apps/web/src/app/api/text2image/route.ts` *(New)*
- Server-side API endpoint for Fal AI calls
- Authentication handling
- Request validation
- Response processing

### 10. Update Types
**File**: `apps/web/src/types/text2image.ts` *(New)*
- Text2Image model interfaces
- API request/response types
- Generation settings types
- Media item extensions for generated images

### 11. Create Text2Image Utilities
**File**: `apps/web/src/lib/text2image-utils.ts` *(New)*
- Image download and processing
- Prompt optimization helpers
- Model recommendation logic
- Image format conversion

### 12. Update Media Panel Styles
**File**: `apps/web/src/components/editor/media-panel/views/text2image.module.css` *(Optional)*
- Custom styling for text2image interface
- Loading animations
- Generation progress indicators

## Implementation Phases

### Phase 1: Basic Integration (2-3 days)
- Create basic Text2ImageView component
- Implement Fal AI client service with Imagen4 Ultra
- Add simple text prompt → image generation
- Show generated images in media panel

### Phase 2: Multi-Model Support (2-3 days)
- Add SeedDream v3 integration
- Add FLUX Pro v1.1 Ultra support
- Implement model selection interface
- Add model-specific parameter handling
- Quality/Speed indicators per model

### Phase 3: Enhanced Features (3-4 days)
- Model-specific generation settings
- Loading states and progress indicators  
- Error handling and user feedback
- Generation history with model tracking
- Smart model recommendations based on prompt

### Phase 4: Advanced Features (2-3 days)
- Prompt optimization suggestions
- Model comparison features
- Batch generation across models
- Advanced parameter fine-tuning
- Model performance analytics

### Phase 5: Polish & Optimization (1-2 days)
- Performance optimization for multi-model support
- UI/UX improvements
- Comprehensive error handling
- Testing across all three models

## Fal AI Models to Support

### Primary Models
1. **Imagen4 Ultra** (`fal-ai/imagen4/preview/ultra`) - Google's latest high-quality model
   - API: https://fal.ai/models/fal-ai/imagen4/preview/ultra/api
   - Best for photorealistic and detailed images
   - Advanced prompt understanding

2. **SeedDream v3** (`fal-ai/bytedance/seedream/v3/text-to-image`) - ByteDance's creative model
   - API: https://fal.ai/models/fal-ai/bytedance/seedream/v3/text-to-image/api  
   - Excellent for artistic and stylized generation
   - Fast generation speed

3. **FLUX Pro v1.1 Ultra** (`fal-ai/flux-pro/v1.1-ultra`) - Latest FLUX model
   - API: https://fal.ai/models/fal-ai/flux-pro/v1.1-ultra/api
   - Enhanced quality and detail
   - Professional-grade output

### Secondary Models  
4. **FLUX.1 [dev]** - Good balance of quality/speed
5. **FLUX.1 [schnell]** - Fastest generation
6. **Stable Diffusion XL** - Popular, reliable baseline

## API Integration Details

### Fal AI Endpoints

#### 1. Imagen4 Ultra
- **Endpoint**: `https://fal.run/fal-ai/imagen4/preview/ultra`
- **Strengths**: Photorealistic images, excellent prompt adherence
- **Best for**: Product shots, realistic scenes, detailed imagery

#### 2. SeedDream v3  
- **Endpoint**: `https://fal.run/fal-ai/bytedance/seedream/v3/text-to-image`
- **Strengths**: Artistic styles, creative interpretation, fast generation
- **Best for**: Creative artwork, stylized images, concept art

#### 3. FLUX Pro v1.1 Ultra
- **Endpoint**: `https://fal.run/fal-ai/flux-pro/v1.1-ultra`  
- **Strengths**: Professional quality, enhanced detail, versatile
- **Best for**: Professional content, high-quality outputs, versatile use cases

### Model-Specific Request Parameters

#### Imagen4 Ultra Parameters
- `prompt`: Text description
- `aspect_ratio`: Image dimensions 
- `safety_tolerance`: Content filtering level
- `guidance_scale`: How closely to follow prompt

#### SeedDream v3 Parameters  
- `prompt`: Text description
- `image_size`: Output dimensions
- `num_inference_steps`: Generation quality vs speed
- `seed`: Reproducible results

#### FLUX Pro v1.1 Ultra Parameters
- `prompt`: Text description
- `image_size`: Output resolution options
- `num_inference_steps`: Quality control
- `guidance_scale`: Prompt adherence strength
- `safety_checker`: Content filtering

## Media Panel Integration

### Generated Image Properties
- **Source**: "text2image"
- **Metadata**: Original prompt, model used, generation settings
- **Thumbnail**: Auto-generated preview
- **Actions**: Re-generate, edit prompt, download

### Media Item Extension
```typescript
interface GeneratedMediaItem extends MediaItem {
  source: "text2image";
  generationData: {
    prompt: string;
    model: string;
    settings: Text2ImageSettings;
    generatedAt: Date;
  };
}
```

## User Interface Design

### Single Model Tab Layout (Legacy Mode)
```
┌─────────────────────────────────────┐
│ Model Selector    [Imagen4 Ultra ▼]│
│ Quality: [●●●○○] Speed: [●●○○○]      │
├─────────────────────────────────────┤
│ Prompt Input                        │
│ ┌─────────────────────────────────┐ │
│ │ A beautiful sunset over mountains│ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Settings                            │
│ Size: [Square HD ▼]    Seed: [    ] │
│ Steps: [●────────] 28               │
├─────────────────────────────────────┤
│          [Generate Image]           │
└─────────────────────────────────────┘
```

### Multi-Model Tab Layout (NEW FEATURE)
```
┌─────────────────────────────────────┐
│ Mode: ( ) Single  (●) Multi-Model   │
├─────────────────────────────────────┤
│ Model Selection                     │
│ ☑ Imagen4 Ultra    Quality: ●●●●○   │
│ ☑ SeedDream v3     Speed:   ●●●●●   │
│ ☐ FLUX Pro v1.1    Balance: ●●●●○   │
├─────────────────────────────────────┤
│ Prompt Input                        │
│ ┌─────────────────────────────────┐ │
│ │ A beautiful sunset over mountains│ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Settings (Applied to All Selected)  │
│ Size: [Square HD ▼]    Seed: [    ] │
├─────────────────────────────────────┤
│      [Generate with 2 Models]      │
├─────────────────────────────────────┤
│ Results Comparison                  │
│ ┌───────────┐ ┌───────────┐        │
│ │ Imagen4   │ │ SeedDream │        │
│ │ [●] [img] │ │ [○] [img] │        │
│ │ Loading..  │ │ Complete  │        │
│ └───────────┘ └───────────┘        │
│         [Add Selected to Media]     │
└─────────────────────────────────────┘
```

### Model Selection Interface
- **Multi-model checkboxes** with quality/speed indicators
- **Toggle between single and multi-model modes**
- **Real-time generation count** (e.g., "Generate with 2 Models")
- **Side-by-side comparison view** with selection controls
- **Batch add to media panel** for selected results
- Model-specific parameter suggestions

## Error Handling

### API Errors
- Network connection issues
- API rate limiting
- Invalid prompts/content policy
- Insufficient credits
- Model unavailable

### User Feedback
- Loading spinners during generation
- Progress indicators for longer generations
- Clear error messages with suggested fixes
- Retry mechanisms for failed generations

## Security Considerations

### API Key Protection
- Store Fal AI key server-side only
- Use environment variables
- Implement request validation
- Rate limiting on client side

### Content Filtering
- Implement prompt filtering
- Use Fal AI's built-in safety checkers
- Block inappropriate content requests
- Log generation attempts for monitoring

## Performance Optimization

### Image Handling
- Lazy loading for generated images
- Image compression for thumbnails
- Efficient caching strategy
- Background image downloading

### API Efficiency
- Request batching where possible
- Intelligent retry logic
- Connection pooling
- Response caching for duplicate prompts

## Testing Strategy

### Unit Tests
- Fal AI client service functions
- Text2Image component logic
- Store state management
- Utility functions

### Integration Tests
- API call flow end-to-end
- Media panel integration
- Error handling scenarios
- User interaction flows

### User Testing
- Generation workflow usability
- Model selection experience
- Error message clarity
- Performance with multiple generations

## Success Metrics

### Functionality
- ✅ User can generate images from text prompts
- ✅ Generated images appear in media panel
- ✅ Images can be dragged to timeline
- ✅ Multiple models are supported
- ✅ Error handling works properly

### Performance
- Generation time < 30 seconds for most models
- UI remains responsive during generation
- Images load quickly in media panel
- No memory leaks with multiple generations

### User Experience
- Intuitive interface for text-to-image generation
- Clear feedback during all states
- Easy model switching
- Helpful error messages
- Generation history is accessible

## Future Enhancements

### Advanced Features
- Image-to-image generation
- Inpainting/outpainting
- Style transfer
- Batch processing
- Custom model fine-tuning

### Integration Features
- Timeline-aware generation (matching video style)
- Auto-prompt generation from video context
- Collaborative generation sharing
- Export options for generated images

## Dependencies

### NPM Packages to Add
```json
{
  "@fal-ai/serverless-client": "^0.7.0",
  "sharp": "^0.32.0",
  "uuid": "^9.0.0"
}
```

### Dev Dependencies
```json
{
  "@types/uuid": "^9.0.0"
}
```

This implementation plan provides a comprehensive roadmap for integrating text-to-image generation using Fal AI into the OpenCut video editor's media panel.