# Task 7: AI Video Generation Integration - 3-Minute Tasks

## Overview
Add AI video generation capabilities to OpenCut using veo3-fal-video-ai package. Each task is designed to be completed in 3 minutes or less.

## Progress Update - July 16, 2025
✅ **COMPLETED**: Tasks 1.1, 1.2, 1.3, 1.4, and 1.5 - AI Panel Implementation
- AI tab with bot icon successfully added to left sidebar
- Basic AI panel component created and integrated
- Text prompt input field with 500 character limit and counter
- Model selection dropdown with 5 AI models (veo3, veo3_fast, veo2, hailuo, kling)
- Pricing and resolution info displayed for each model
- Dynamic model info card showing selected model details
- Generate Video button with loading state and validation
- Cost display and validation messages
- Complete AI video generation form interface
- "Generate AI Videos" interface working in OpenCut editor
- User confirmed AI button functionality ✅

**Current Status**: 22/40 tasks completed (55%)
**Next Steps**: Phase 5 - Video Integration (continued)

## Phase 1: UI Foundation (15 minutes total)

### 1.1 Add AI Generation Tab Icon (3 min) ✅
- [x] Add "AI" or "Generate" icon to left sidebar tabs
- [x] Copy existing tab structure from Media/Text tabs
- [x] Add basic click handler and state management

### 1.2 Create Basic AI Panel Component (3 min) ✅
- [x] Create `AiGenerationPanel.tsx` in components folder
- [x] Add basic React component structure
- [x] Import and render in sidebar when tab is active

### 1.3 Add Text Prompt Input Field (3 min) ✅
- [x] Create simple textarea for prompt input
- [x] Add placeholder text "Describe your video..."
- [x] Add character counter (max 500 chars)

### 1.4 Add Model Selection Dropdown (3 min) ✅
- [x] Create dropdown with predefined models
- [x] Options: veo3, veo3_fast, veo2, hailuo, kling
- [x] Add model descriptions and pricing

### 1.5 Add Generate Button (3 min) ✅
- [x] Create styled "Generate Video" button
- [x] Add loading state and disabled state
- [x] Add basic click handler (console.log for now)

## Phase 2: Python Backend Setup (15 minutes total)

### 2.1 Create Python Service Directory (3 min) ✅
- [x] Create `services/ai-video-generator/` folder
- [x] Add `requirements.txt` with FastAPI dependencies
- [x] Create basic `main.py` with FastAPI app

### 2.2 Install veo3-fal-video-ai Package (3 min) ✅
- [x] Add veo3-fal-video-ai to requirements.txt (as video-ai-studio)
- [x] Create virtual environment
- [x] Install dependencies with pip

### 2.3 Create Basic API Endpoint (3 min) ✅
- [x] Add POST `/generate-video` endpoint
- [x] Accept prompt and model parameters
- [x] Return mock response for now

### 2.4 Add Environment Configuration (3 min) ✅
- [x] Create `.env` file for API keys
- [x] Add FAL_API_KEY variable
- [x] Load config in main.py

### 2.5 Test Basic API Server (3 min) ✅
- [x] Run FastAPI server with `uvicorn main:app --reload`
- [x] Test endpoint with curl or Postman
- [x] Verify mock response structure

## Phase 3: Frontend-Backend Connection (15 minutes total)

### 3.1 Create API Client Function (3 min) ✅
- [x] Create `lib/ai-video-client.ts`
- [x] Add `generateVideo` function
- [x] Use fetch API to call Python service

### 3.2 Add Loading State Management (3 min) ✅
- [x] Create simple state for isGenerating
- [x] Update UI to show loading spinner
- [x] Disable generate button during generation

### 3.3 Connect Generate Button to API (3 min) ✅
- [x] Call API client from generate button
- [x] Handle success and error responses
- [x] Log response to console

### 3.4 Add Error Handling (3 min) ✅
- [x] Add try-catch around API calls
- [x] Display error messages to user
- [x] Reset loading state on error

### 3.5 Test End-to-End Flow (3 min) ✅
- [x] Enter prompt in UI
- [x] Click generate button
- [x] Verify API call reaches Python service
- [x] Check console for response

## Phase 4: AI Integration (15 minutes total)

### 4.1 Integrate veo3-fal-video-ai in Python (3 min) ✅
- [x] Import AIPipelineManager
- [x] Replace mock response with real API call
- [x] Handle basic text-to-video generation

### 4.2 Add Model Selection Logic (3 min) ✅
- [x] Pass model parameter to veo3-fal-video-ai
- [x] Map UI model names to API model names
- [x] Handle model-specific parameters

### 4.3 Add Video File Handling (3 min) ✅
- [x] Save generated video to temporary folder
- [x] Return file path or URL in response
- [x] Add basic file cleanup logic

### 4.4 Test Real Video Generation (3 min) ✅
- [x] Generate simple test video
- [x] Verify video file is created
- [x] Check video can be played

### 4.5 Add Progress Tracking (3 min) ✅
- [x] Add job ID system for async generation
- [x] Create status endpoint to check progress
- [x] Update UI to show generation progress

## Phase 5: Video Integration (15 minutes total)

### 5.1 Add Video Preview Component (3 min) ✅
- [x] Create component to display generated video
- [x] Add video element with controls
- [x] Show video thumbnail and metadata

### 5.2 Add "Add to Timeline" Button (3 min) ✅
- [x] Create button below video preview
- [x] Add click handler to add video to timeline
- [x] Use existing timeline store methods

### 5.3 Integrate with Media Store (3 min)
- [ ] Add generated video to media store
- [ ] Create media item with proper metadata
- [ ] Show in media library panel

### 5.4 Add File Storage (3 min)
- [ ] Save generated video to OPFS
- [ ] Add metadata to IndexedDB
- [ ] Handle file cleanup on project close

### 5.5 Test Timeline Integration (3 min)
- [ ] Generate video and add to timeline
- [ ] Verify video appears in timeline
- [ ] Test playback and editing

## Phase 6: User Experience (15 minutes total)

### 6.1 Add Generation History (3 min)
- [ ] Create list to show previous generations
- [ ] Store generation metadata in localStorage
- [ ] Add re-use and delete buttons

### 6.2 Add Cost Estimation (3 min)
- [ ] Calculate cost based on model selection
- [ ] Display estimated cost before generation
- [ ] Add warning for expensive models

### 6.3 Add Prompt Suggestions (3 min)
- [ ] Create predefined prompt templates
- [ ] Add dropdown or buttons for quick selection
- [ ] Categories: Nature, Urban, Abstract, etc.

### 6.4 Add Generation Settings (3 min)
- [ ] Add duration slider (model-dependent)
- [ ] Add resolution selector
- [ ] Add aspect ratio options

### 6.5 Improve UI Polish (3 min)
- [ ] Add proper styling and spacing
- [ ] Add icons and visual feedback
- [ ] Test responsive design

## Phase 7: Error Handling & Testing (15 minutes total)

### 7.1 Add API Error Handling (3 min)
- [ ] Handle API key errors
- [ ] Handle quota exceeded errors
- [ ] Handle network timeout errors

### 7.2 Add Input Validation (3 min)
- [ ] Validate prompt length and content
- [ ] Validate model selection
- [ ] Show validation errors to user

### 7.3 Add Retry Logic (3 min)
- [ ] Implement retry for failed generations
- [ ] Add exponential backoff
- [ ] Limit retry attempts

### 7.4 Add Loading States (3 min)
- [ ] Show progress during generation
- [ ] Add estimated time remaining
- [ ] Allow cancellation of generation

### 7.5 Test Error Scenarios (3 min)
- [ ] Test with invalid API key
- [ ] Test with network disconnection
- [ ] Test with invalid prompts

## Phase 8: Production Readiness (15 minutes total)

### 8.1 Add Environment Configuration (3 min)
- [ ] Add production API URL config
- [ ] Add development/production toggles
- [ ] Configure CORS settings

### 8.2 Add Logging and Monitoring (3 min)
- [ ] Add console logging for debugging
- [ ] Log generation requests and responses
- [ ] Add error tracking

### 8.3 Add Rate Limiting (3 min)
- [ ] Implement client-side rate limiting
- [ ] Add cooldown between generations
- [ ] Show rate limit warnings

### 8.4 Add Security Headers (3 min)
- [ ] Add API key validation
- [ ] Add request authentication
- [ ] Sanitize user inputs

### 8.5 Final Testing (3 min)
- [ ] Test complete user workflow
- [ ] Verify all features work together
- [ ] Check for memory leaks

## Quick Setup Commands

### Python Service Setup
```bash
# Create and activate virtual environment (1 min)
cd services && mkdir ai-video-generator && cd ai-video-generator
python -m venv venv && source venv/bin/activate

# Install dependencies (1 min)
pip install fastapi uvicorn python-multipart video-ai-studio

# Run server (1 min)
uvicorn main:app --reload --port 8000
```

### Frontend Integration
```bash
# Add to OpenCut (1 min)
cd apps/web/src/components
mkdir ai-generation

# Install any needed dependencies (1 min)
bun add axios  # if needed for API calls

# Start development server (1 min)
bun run dev
```

## Success Criteria
- [ ] AI generation tab appears in sidebar
- [ ] User can enter prompt and select model
- [ ] Video generates successfully via Python service
- [ ] Generated video can be added to timeline
- [ ] Basic error handling works
- [ ] Cost estimation is accurate
- [ ] UI is responsive and polished

## Notes
- Each task is designed for 3 minutes maximum
- Focus on MVP functionality first
- Use mock data for initial testing
- Prioritize user experience over advanced features
- Test incrementally after each phase

## Total Implementation Time: 2 hours (8 phases × 15 minutes each)