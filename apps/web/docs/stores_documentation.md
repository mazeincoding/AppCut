# Stores Documentation: `apps/web/src/stores/`

This document provides an overview of the Zustand stores used for state management within the OpenCut web application. Each store manages a specific part of the application's global state and provides actions to modify that state.

## Stores and Their Functionality

### `adjustment-store.ts`

Manages the state for image adjustment and editing features, including the original and edited images, selected AI models, parameters for image generation, and an edit history.

*   **State:** `originalImage`, `originalImageUrl`, `currentEditedUrl`, `selectedModel`, `prompt`, `parameters`, `editHistory`, `currentHistoryIndex`, `isProcessing`, `progress`, `statusMessage`, `elapsedTime`, `estimatedTime`, `showParameters`, `showHistory`, `previewMode`.
*   **Actions:** `setOriginalImage`, `clearImage`, `setSelectedModel`, `setPrompt`, `updateParameter`, `resetParameters`, `addToHistory`, `goToHistoryItem`, `canUndo`, `canRedo`, `undo`, `redo`, `clearHistory`, `setProcessingState`, `toggleParameters`, `toggleHistory`, `setPreviewMode`.

### `editor-store.ts`

Manages the global state related to the video editor interface, including initialization status and canvas settings.

*   **State:** `isInitializing`, `isPanelsReady`, `canvasSize`, `canvasMode`, `canvasPresets`.
*   **Actions:** `setInitializing`, `setPanelsReady`, `initializeApp`, `setCanvasSize`, `setCanvasSizeToOriginal`, `setCanvasSizeFromAspectRatio`.

### `export-store.ts`

Manages the state and settings for the video export process, including export configuration, progress, and error handling.

*   **State:** `settings` (format, quality, filename, dimensions), `progress` (isExporting, progress percentage, frame counts, status), `error`, `isDialogOpen`.
*   **Actions:** `updateSettings`, `updateProgress`, `setError`, `setDialogOpen`, `resetExport`.

### `keybindings-store.ts`

Manages application-wide keyboard shortcuts and their associated actions.

*   **State:** `keybindings` (a map of key combinations to actions).
*   **Actions:** `updateKeybinding`, `removeKeybinding`, `getKeybindingString` (converts KeyboardEvent to a key string), `validateKeybinding`, `getKeybindingsForAction`.

### `media-store.ts`

Manages all media items (images, videos, audio) within the project, including their metadata, URLs, and processing status. It also handles thumbnail and timeline preview generation.

*   **State:** `mediaItems`, `isLoading`.
*   **Actions:** `addMediaItem`, `removeMediaItem`, `loadProjectMedia`, `clearProjectMedia`, `clearAllMedia`, `addGeneratedImages`, `generateEnhancedThumbnails`, `getThumbnailAtTime`, `setThumbnailQuality`, `clearThumbnailCache`, `generateTimelinePreviews`, `getTimelinePreviewStrip`, `getTimelinePreviewAtPosition`, `clearTimelinePreviews`, `shouldRegenerateTimelinePreviews`, `isMediaItemReady`, `updateProcessingStage`, `updateMediaItem`.

### `panel-store.ts`

Manages the sizes and states of various UI panels within the editor, persisting these settings across sessions.

*   **State:** `toolsPanel`, `previewPanel`, `propertiesPanel`, `mainContent`, `timeline`, `mainContentHeight`, `timelineHeight` (all as percentages).
*   **Actions:** `setToolsPanel`, `setPreviewPanel`, `setPropertiesPanel`, `setMainContent`, `setTimeline`, `setMainContentHeight`, `setTimelineHeight`.

### `playback-store.ts`

Controls the playback state of the video timeline, including play/pause, current time, duration, volume, and speed.

*   **State:** `isPlaying`, `currentTime`, `duration`, `volume`, `muted`, `previousVolume`, `speed`.
*   **Actions:** `play`, `pause`, `toggle`, `seek`, `setVolume`, `setSpeed`, `setDuration`, `setCurrentTime`, `mute`, `unmute`, `toggleMute`.

### `project-store.ts`

Manages the active project, a list of all saved projects, and provides actions for project creation, loading, saving, deletion, and duplication. It also handles project-level settings like background and FPS.

*   **State:** `activeProject`, `savedProjects`, `isLoading`, `isInitialized`.
*   **Actions:** `createNewProject`, `loadProject`, `saveCurrentProject`, `loadAllProjects`, `deleteProject`, `closeProject`, `renameProject`, `duplicateProject`, `updateProjectBackground`, `updateBackgroundType`, `updateProjectFps`.

### `text2image-store.ts`

Manages the state for text-to-image generation, including the prompt, selected AI models, generation results, and a history of past generations.

*   **State:** `prompt`, `selectedModels`, `generationMode`, `isGenerating`, `generationResults`, `selectedResults`, `generationHistory`.
*   **Actions:** `setPrompt`, `toggleModel`, `clearModelSelection`, `setGenerationMode`, `generateImages`, `addSelectedToMedia`, `clearResults`, `addToHistory`.

### `timeline-store.ts`

Manages the core video timeline state, including tracks, elements, selection, and drag operations. It also handles history (undo/redo) and persistence of timeline data.

*   **State:** `_tracks` (internal storage), `history`, `redoStack`, `tracks` (sorted and ensured), `selectedElements`, `dragState`.
*   **Actions:** `getSortedTracks`, `pushHistory`, `undo`, `redo`, `selectElement`, `deselectElement`, `clearSelectedElements`, `setSelectedElements`, `addTrack`, `insertTrackAt`, `removeTrack`, `addElementToTrack`, `removeElementFromTrack`, `moveElementToTrack`, `updateElementTrim`, `updateElementDuration`, `updateElementStartTime`, `toggleTrackMute`, `updateTextElement`, `splitElement`, `splitAndKeepLeft`, `splitAndKeepRight`, `separateAudio`, `replaceElementMedia`, `getTotalDuration`, `loadProjectTimeline`, `saveProjectTimeline`, `clearTimeline`, `setDragState`, `startDrag`, `updateDragTime`, `endDrag`.
