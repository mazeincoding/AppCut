"use client";

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Image as ImageIcon, 
  Settings, 
  History, 
  Download, 
  Undo2, 
  Redo2,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { useAdjustmentStore } from '@/stores/adjustment-store';
import { useMediaStore } from '@/stores/media-store';
import { useProjectStore } from '@/stores/project-store';
import { useMediaPanelStore } from '../store';
import { 
  editImage, 
  uploadImageToFAL, 
  getImageEditModels,
  ImageEditProgressCallback 
} from '@/lib/image-edit-client';
import { 
  validateImageFile, 
  getImageInfo, 
  imageToDataUrl,
  downloadImage,
  formatFileSize 
} from '@/lib/image-utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Sub-components (will be implemented below)
import { ModelSelector } from '../../adjustment/model-selector';
import { ParameterControls } from '../../adjustment/parameter-controls';
import { PreviewPanel } from '../../adjustment/preview-panel';
import { EditHistory } from '../../adjustment/edit-history';
import { ImageUploader } from '../../adjustment/image-uploader';

export function AdjustmentView() {
  const {
    originalImage,
    originalImageUrl,
    currentEditedUrl,
    selectedModel,
    prompt,
    parameters,
    editHistory,
    isProcessing,
    progress,
    statusMessage,
    elapsedTime,
    showParameters,
    showHistory,
    previewMode,
    setOriginalImage,
    clearImage,
    setPrompt,
    addToHistory,
    setProcessingState,
    toggleParameters,
    toggleHistory,
    canUndo,
    canRedo,
    undo,
    redo
  } = useAdjustmentStore();

  // Debug logging
  console.log('🔍 ADJUSTMENT-VIEW: Component state:', {
    hasOriginalImage: !!originalImage,
    originalImageType: originalImage ? typeof originalImage : 'null',
    originalImageName: originalImage?.name,
    originalImageSize: originalImage?.size,
    hasOriginalImageUrl: !!originalImageUrl
  });

  // Media and project stores for adding edited images
  const { addMediaItem } = useMediaStore();
  const { activeProject } = useProjectStore();
  const { setActiveTab } = useMediaPanelStore();

  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug effect to log when originalImage changes
  useEffect(() => {
    console.log('🔄 ADJUSTMENT-VIEW: originalImage changed:', {
      hasImage: !!originalImage,
      imageName: originalImage?.name,
      shouldShowControls: !!originalImage
    });
  }, [originalImage]);

  // Handle automatic add to media panel (download disabled temporarily)
  const handleAutoAddToMedia = useCallback(async (
    imageUrl: string, 
    modelName: string, 
    promptText: string
  ) => {
    try {
      if (!activeProject) {
        console.warn('No active project - cannot add to media');
        return;
      }

      // Fetch the edited image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      // Create filename with timestamp and model info
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const sanitizedPrompt = promptText.slice(0, 30).replace(/[^a-zA-Z0-9\s]/g, '').trim();
      const filename = `edited-${modelName}-${sanitizedPrompt ? sanitizedPrompt + '-' : ''}${timestamp}.png`;
      
      // Create File object
      const editedFile = new File([blob], filename, { type: 'image/png' });

      // Get image dimensions
      const { width, height } = await getImageInfo(editedFile);

      // Add to media panel
      await addMediaItem(activeProject.id, {
        name: filename,
        type: 'image',
        file: editedFile,
        width,
        height
      });

      // Download functionality temporarily disabled to fix navigation bug
      // TODO: Re-implement download without causing navigation to blob URL

      console.log(`✅ Edited image automatically added to media: ${filename}`);
      
    } catch (error) {
      console.error('Failed to auto-add to media:', error);
      toast.error('Failed to add edited image to media panel');
    }
  }, [activeProject, addMediaItem]);

  // Handle image file selection
  const handleImageSelect = useCallback(async (file: File) => {
    setError(null);
    
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error!);
      return;
    }

    try {
      setUploadingImage(true);
      
      // Get image info and create preview URL
      const imageInfo = await getImageInfo(file);
      const previewUrl = await imageToDataUrl(file);
      
      // Set in store
      console.log('📸 ADJUSTMENT-VIEW: Setting original image:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        previewUrlLength: previewUrl.length
      });
      setOriginalImage(file, previewUrl);
      
      toast.success(`Image loaded: ${imageInfo.width}x${imageInfo.height} (${formatFileSize(file.size)})`);
    } catch (error) {
      console.error('Error loading image:', error);
      setError('Failed to load image');
    } finally {
      setUploadingImage(false);
    }
  }, [setOriginalImage]);

  // Handle image editing
  const handleEdit = useCallback(async () => {
    if (!originalImage || !prompt.trim()) {
      setError('Please select an image and enter a prompt');
      return;
    }

    setError(null);
    
    try {
      // Upload image to FAL.ai
      setProcessingState({ isProcessing: true, progress: 5, statusMessage: 'Uploading image...' });
      console.log('🚀 ADJUSTMENT: About to upload image:', {
        fileName: originalImage.name,
        fileSize: originalImage.size,
        fileType: originalImage.type
      });
      const imageUrl = await uploadImageToFAL(originalImage);
      console.log('🎯 ADJUSTMENT: Upload completed, imageUrl:', {
        type: typeof imageUrl,
        length: imageUrl?.length,
        startsWithData: imageUrl?.startsWith('data:'),
        prefix: imageUrl?.substring(0, 30)
      });
      
      // Progress callback
      const onProgress: ImageEditProgressCallback = (status) => {
        setProcessingState({
          isProcessing: status.status !== 'completed' && status.status !== 'failed',
          progress: status.progress,
          statusMessage: status.message,
          elapsedTime: status.elapsedTime || 0,
          estimatedTime: status.estimatedTime
        });
      };
      
      // Edit image
      const result = await editImage({
        imageUrl,
        prompt,
        model: selectedModel,
        ...parameters
      }, onProgress);
      
      if (result.status === 'completed' && result.result_url) {
        // Add to history
        addToHistory({
          originalUrl: originalImageUrl!,
          editedUrl: result.result_url,
          prompt,
          model: selectedModel,
          parameters,
          processingTime: result.processing_time
        });
        
        // Automatically add to media panel (download disabled temporarily to fix navigation bug)
        await handleAutoAddToMedia(result.result_url, selectedModel, prompt);
        
        toast.success(`🎉 Image edited successfully with ${selectedModel}! Check the preview panel and your media library.`, {
          duration: 4000
        });
      } else {
        throw new Error('No result URL received');
      }
    } catch (error) {
      console.error('Edit failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle content policy violations with user-friendly toast notifications
      if (errorMessage.includes('Content policy violation')) {
        toast.error('Content policy violation', {
          description: 'Please use appropriate language for image descriptions. Avoid terms that could be flagged as inappropriate.',
          duration: 6000,
        });
        setError('Please try a different description');
      } else {
        // Handle other errors with existing logic
        setError(`Edit failed: ${errorMessage}`);
        toast.error('Edit failed', {
          description: errorMessage,
          duration: 4000,
        });
      }
      
      setProcessingState({ isProcessing: false });
    }
  }, [originalImage, prompt, selectedModel, parameters, originalImageUrl, addToHistory, setProcessingState, handleAutoAddToMedia]);

  // Handle download
  const handleDownload = useCallback(async () => {
    if (!currentEditedUrl) return;
    
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `edited-${selectedModel}-${timestamp}.png`;
      await downloadImage(currentEditedUrl, filename);
      toast.success('Image downloaded!');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download image');
    }
  }, [currentEditedUrl, selectedModel]);

  const canEdit = originalImage && prompt.trim() && !isProcessing;
  const hasResult = currentEditedUrl;

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('media')}
            className="mr-2 bg-transparent hover:bg-primary hover:text-primary-foreground transition-colors"
            aria-label="Back to media"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <ImageIcon className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Image Adjustment</h2>
          {editHistory.length > 0 && (
            <Badge variant="secondary">{editHistory.length} edits</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleParameters}
            className={`!bg-transparent ${showParameters ? 'bg-primary/10' : ''}`}
          >
            <Settings className="size-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={toggleHistory}
            disabled={editHistory.length === 0}
            className={showHistory ? 'bg-primary/10' : ''}
          >
            <History className="size-4" />
          </Button>
          
          {hasResult && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Status */}
      {isProcessing && (
        <Card className="border-blue-500">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm font-medium">{statusMessage}</span>
              </div>
              <div className="text-xs text-blue-600">
                {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}
              </div>
            </div>
            
            {progress > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs text-blue-600">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content - Single Column */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 space-y-3 overflow-y-auto pr-2 pb-4" style={{ scrollbarWidth: 'thin' }}>
          {/* Image Upload */}
          {!originalImage ? (
            <ImageUploader 
              onImageSelect={handleImageSelect}
              uploading={uploadingImage}
            />
          ) : (
            <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="size-4 text-green-600" />
                    <div>
                      <span className="text-xs font-semibold text-green-800 dark:text-green-200">Image loaded</span>
                      <div className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                        {formatFileSize(originalImage.size)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearImage}
                    className="border-green-300 hover:bg-green-100 dark:border-green-700 dark:hover:bg-green-900/20 text-xs h-6"
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edit/Generate Button - Moved to top */}
          {originalImage && (
            <Card className="bg-gradient-to-r from-primary/5 to-blue-500/5 border-primary/20">
              <CardContent className="p-3 space-y-2">
                <Button
                  onClick={handleEdit}
                  disabled={!canEdit}
                  className="w-full h-10 font-semibold text-sm transition-all duration-200 hover:scale-[1.01] shadow-sm"
                  size="default"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="mr-2 size-4" />
                      Generate Edit
                    </>
                  )}
                </Button>
                
                {editHistory.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={undo}
                      disabled={!canUndo()}
                      className="flex-1 h-8 text-xs"
                      size="sm"
                    >
                      <Undo2 className="size-3 mr-1" />
                      Undo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={redo}
                      disabled={!canRedo()}
                      className="flex-1 h-8 text-xs"
                      size="sm"
                    >
                      <Redo2 className="size-3 mr-1" />
                      Redo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Model Selection */}
          {originalImage && (
            <ModelSelector />
          )}

          {/* Prompt Input */}
          {originalImage && (
            <Card>
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Edit Instructions</label>
                </div>
                <div className="space-y-2">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want to change..."
                    className="w-full p-2.5 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                    rows={3}
                    maxLength={700}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Be specific about changes
                    </span>
                    <span className={cn(
                      "text-[10px] font-medium transition-colors",
                      prompt.length > 650 ? "text-orange-500" : prompt.length > 600 ? "text-yellow-500" : "text-muted-foreground"
                    )}>
                      {prompt.length}/700
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview Panel - Below Edit Instructions */}
          {originalImage && (
            <div className="h-64">
              <PreviewPanel />
            </div>
          )}

          {/* Parameter Controls */}
          {originalImage && showParameters && (
            <ParameterControls />
          )}

          {/* No Image State */}
          {!originalImage && (
            <Card className="h-64 flex items-center justify-center">
              <CardContent className="text-center">
                <ImageIcon className="size-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Image Selected</h3>
                <p className="text-muted-foreground">
                  Upload an image to start editing with AI models
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit History Sidebar */}
      {showHistory && (
        <div className="fixed right-4 top-4 bottom-4 w-80 z-50">
          <EditHistory />
        </div>
      )}
    </div>
  );
}