"use client";

import { BotIcon, Loader2, Play, Download, History, Trash2, ImageIcon, TypeIcon, Upload, X } from "lucide-react";
import { useState, useEffect, useRef, Fragment } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateVideo, generateVideoFromImage, handleApiError, getGenerationStatus } from "@/lib/ai-video-client";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { useMediaPanelStore } from "../store";
import { AIHistoryPanel } from "./ai-history-panel";
import { debugLogger } from "@/lib/debug-logger";

interface AIModel {
  id: string;
  name: string;
  description: string;
  price: string;
  resolution: string;
}

const AI_MODELS: AIModel[] = [
  { id: "veo3", name: "Veo3", description: "Highest quality, slower generation", price: "3.00", resolution: "1080p" },
  { id: "veo3_fast", name: "Veo3 Fast", description: "High quality, faster generation", price: "2.00", resolution: "1080p" },
  { id: "veo2", name: "Veo2", description: "Good quality, balanced speed", price: "2.50", resolution: "1080p" },
  { id: "hailuo", name: "Hailuo", description: "Fast generation, good quality", price: "0.08", resolution: "720p" },
  { id: "kling", name: "Kling v1.5", description: "Fast generation, cost-effective", price: "0.10", resolution: "720p" },
  { id: "kling_v2", name: "Kling v2.1", description: "Premium model with unparalleled motion fluidity", price: "0.15", resolution: "1080p" },
];

interface GeneratedVideo {
  jobId: string;
  videoUrl: string;
  videoPath?: string;
  fileSize?: number;
  duration?: number;
  prompt: string;
  model: string;
}

export function AiView() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  const [generationHistory, setGenerationHistory] = useState<GeneratedVideo[]>([]);
  
  // Image-to-video state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use global AI tab state instead of local state
  const { aiActiveTab: activeTab, setAiActiveTab: setActiveTab } = useMediaPanelStore();
  
  // Get project store early for debugging
  const { activeProject } = useProjectStore();

  // Check if current project is a fallback project
  const isFallbackProject = activeProject?.id?.startsWith('project-') && 
    /^project-\d{13}$/.test(activeProject?.id || '');

  // DEBUG: Component lifecycle tracking
  debugLogger.log('AIView', 'RENDER', {
    activeTab,
    selectedModel,
    selectedImageExists: !!selectedImage,
    currentProjectId: activeProject?.id,
    isFallbackProject,
    currentUrl: window.location.href,
    renderCount: Math.random(),
    codeVersion: '2025-07-21-15:30-CLICK-PREVENTION-FIX'
  });

  // Temporarily disabled all window/document event monitoring for debugging
  
  // Progress tracking
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // History panel state
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState<boolean>(false);
  
  // Store hooks
  const { addMediaItem } = useMediaStore();

  const maxChars = 500;
  const remainingChars = maxChars - prompt.length;

  // Load generation history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('ai-generation-history');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        setGenerationHistory(parsedHistory);
      } catch (error) {
        debugLogger.log('AIView', 'PARSE_HISTORY_ERROR', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
  }, []);

  // Save generation history to localStorage
  const saveGenerationHistory = (history: GeneratedVideo[]) => {
    try {
      localStorage.setItem('ai-generation-history', JSON.stringify(history));
    } catch (error) {
      debugLogger.log('AIView', 'SAVE_HISTORY_ERROR', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  // Add video to history
  const addToHistory = (video: GeneratedVideo) => {
    const newHistory = [video, ...generationHistory.slice(0, 9)]; // Keep only last 10
    setGenerationHistory(newHistory);
    saveGenerationHistory(newHistory);
  };

  // Remove video from history
  const removeFromHistory = (jobId: string) => {
    const newHistory = generationHistory.filter(video => video.jobId !== jobId);
    setGenerationHistory(newHistory);
    saveGenerationHistory(newHistory);
  };

  // Handle image selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file too large (max 10MB)');
      return;
    }

    setSelectedImage(file);
    setError(null);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Remove selected image
  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Start status polling
  const startStatusPolling = (jobId: string) => {
    setGenerationProgress(10);
    setStatusMessage("Starting generation...");
    
    const pollStatus = async () => {
      try {
        const status = await getGenerationStatus(jobId);
        
        if (status.progress) {
          setGenerationProgress(status.progress);
        }
        
        if (status.status === "processing") {
          setStatusMessage(`Generating video... ${status.progress || 0}%`);
        } else if (status.status === "completed" && status.video_url) {
          // Clear polling
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          
          setGenerationProgress(100);
          setStatusMessage("Generation complete!");
          
          const newVideo = {
            jobId: jobId,
            videoUrl: status.video_url,
            videoPath: undefined, // Not available in GenerationStatus
            fileSize: undefined, // Not available in GenerationStatus
            duration: undefined, // Not available in GenerationStatus
            prompt: prompt.trim(),
            model: selectedModel
          };
          
          setGeneratedVideo(newVideo);
          addToHistory(newVideo);
          
          // Automatically add to media store
          if (activeProject) {
            try {
              const response = await fetch(newVideo.videoUrl);
              const blob = await response.blob();
              const file = new File([blob], `generated-video-${newVideo.jobId.substring(0, 8)}.mp4`, {
                type: 'video/mp4',
              });
              
              await addMediaItem(activeProject.id, {
                name: `AI: ${newVideo.prompt.substring(0, 30)}...`,
                type: "video",
                file: file,
                url: newVideo.videoUrl,
                duration: newVideo.duration || 5,
                width: 1920,
                height: 1080,
              });
              
              debugLogger.log('AIView', 'VIDEO_ADDED_TO_MEDIA_STORE', { 
                videoUrl: newVideo.videoUrl,
                projectId: activeProject.id 
              });
            } catch (error) {
              debugLogger.log('AIView', 'VIDEO_ADD_TO_MEDIA_STORE_FAILED', { 
                error: error instanceof Error ? error.message : 'Unknown error',
                projectId: activeProject.id 
              });
            }
          }
          
          setIsGenerating(false);
        } else if (status.status === "failed") {
          // Clear polling
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          
          setError(status.error || "Generation failed");
          setIsGenerating(false);
        }
      } catch (error) {
        debugLogger.log('AIView', 'STATUS_POLLING_ERROR', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          jobId 
        });
        setGenerationProgress(prev => Math.min(prev + 5, 90)); // Slowly increment until we get real status
      }
    };
    
    // Poll immediately, then every 3 seconds
    pollStatus();
    const interval = setInterval(pollStatus, 3000);
    setPollingInterval(interval);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleGenerate = async () => {
    // Validate based on active tab
    if (activeTab === "text") {
      if (!prompt.trim() || !selectedModel) return;
    } else {
      if (!selectedImage || !selectedModel) return;
    }
    
    setIsGenerating(true);
    setError(null);
    setJobId(null);
    
    try {
      let response;
      
      if (activeTab === "text") {
        debugLogger.log('AIView', 'GENERATING_VIDEO', { prompt, selectedModel });
        response = await generateVideo({
          prompt: prompt.trim(),
          model: selectedModel,
          resolution: "1080p",
          duration: 5
        });
      } else {
        debugLogger.log('AIView', 'GENERATING_VIDEO_FROM_IMAGE', { 
          imageName: selectedImage?.name, 
          prompt, 
          selectedModel 
        });
        response = await generateVideoFromImage({
          image: selectedImage!,
          model: selectedModel,
          prompt: prompt.trim() || undefined,
          resolution: "1080p",
          duration: 5
        });
      }
      
      debugLogger.log('AIView', 'VIDEO_GENERATION_COMPLETED', { 
        jobId: response.job_id,
        status: response.status 
      });
      setJobId(response.job_id);
      
      // With direct FAL AI, generation is immediate
      if (response.status === "completed" && response.video_url) {
        setGenerationProgress(100);
        setStatusMessage("Generation complete!");
        
        const newVideo = {
          jobId: response.job_id,
          videoUrl: response.video_url,
          videoPath: response.video_url,
          fileSize: undefined,
          duration: 5, // Default duration
          prompt: prompt.trim(),
          model: selectedModel
        };
        
        setGeneratedVideo(newVideo);
        addToHistory(newVideo);
        
        // Automatically add to media store
        if (activeProject) {
          try {
            const videoResponse = await fetch(newVideo.videoUrl);
            const blob = await videoResponse.blob();
            const file = new File([blob], `generated-video-${newVideo.jobId.substring(0, 8)}.mp4`, {
              type: 'video/mp4',
            });
            
            await addMediaItem(activeProject.id, {
              name: `AI: ${newVideo.prompt.substring(0, 30)}...`,
              type: "video",
              file: file,
              url: newVideo.videoUrl,
              duration: newVideo.duration || 5,
              width: 1920,
              height: 1080,
            });
            
            debugLogger.log('AIView', 'VIDEO_ADDED_TO_MEDIA_STORE', { 
              videoUrl: newVideo.videoUrl,
              projectId: activeProject.id 
            });
          } catch (error) {
            debugLogger.log('AIView', 'VIDEO_ADD_TO_MEDIA_STORE_FAILED', { 
              error: error instanceof Error ? error.message : 'Unknown error',
              projectId: activeProject.id 
            });
          }
        }
        
        setIsGenerating(false);
      } else if (response.status === "failed") {
        setError(response.message || "Generation failed");
        setIsGenerating(false);
      }
      
      debugLogger.log('AIView', 'GENERATION_DETAILS', {
        jobId: response.job_id,
        status: response.status,
        message: response.message,
        estimatedTime: response.estimated_time
      });
      
    } catch (error) {
      debugLogger.log('AIView', 'GENERATION_FAILED', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      setError(handleApiError(error));
      
      // Clear polling on error
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    } finally {
      if (!pollingInterval) {
        setIsGenerating(false);
      }
    }
  };

  // Reset generation state
  const resetGenerationState = () => {
    setGeneratedVideo(null);
    setJobId(null);
    setError(null);
    setGenerationProgress(0);
    setStatusMessage("");
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  const canGenerate = (() => {
    if (isGenerating || !selectedModel) return false;
    if (activeTab === "text") {
      return prompt.trim().length > 0;
    } else {
      return selectedImage !== null;
    }
  })();
  
  const selectedModelInfo = AI_MODELS.find(m => m.id === selectedModel);


  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BotIcon className="size-5 text-primary" />
          <h3 className="text-sm font-medium">AI Video Generation</h3>
        </div>
        {generationHistory.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="text"
            onClick={() => setIsHistoryPanelOpen(true)}
            className="h-8 px-2"
          >
            <History className="size-4 mr-1" />
            History ({generationHistory.length})
          </Button>
        )}
      </div>
      
      <div className="flex-1 flex flex-col gap-4">
        {/* Generation Mode Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => {
          debugLogger.log('AIView', 'TAB_CHANGE', { 
            from: activeTab, 
            to: value,
            currentProjectId: activeProject?.id 
          });
          setActiveTab(value as "text" | "image");
        }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <TypeIcon className="size-4" />
              Text to Video
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center gap-2">
              <ImageIcon className="size-4" />
              Image to Video
            </TabsTrigger>
          </TabsList>
          
          <TabsContent key="text-tab-content" value="text" className="space-y-4">
            {/* Text Prompt Input */}
            <div className="space-y-2">
              <Label htmlFor="prompt">Describe your video</Label>
              <Textarea
                id="prompt"
                placeholder="Describe your video..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, maxChars))}
                className="min-h-[80px] resize-none"
              />
              <div className="flex justify-between items-center">
                <p className="text-[0.65rem] text-muted-foreground">
                  Be specific about scenes, actions, and style
                </p>
                <span className={`text-xs ${remainingChars < 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {remainingChars}/{maxChars}
                </span>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent key="image-tab-content" value="image" className="space-y-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Upload Image</Label>
              {!selectedImage ? (
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Click to upload an image
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, WEBP (max 10MB)
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <img 
                    src={imagePreview!} 
                    alt="Selected image" 
                    className="w-full h-40 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={removeSelectedImage}
                  >
                    <X className="size-3" />
                  </Button>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {selectedImage.name} ({(selectedImage.size / 1024 / 1024).toFixed(1)} MB)
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
            
            {/* Optional Text Prompt for Image */}
            <div className="space-y-2">
              <Label htmlFor="image-prompt">Additional prompt (optional)</Label>
              <Textarea
                id="image-prompt"
                placeholder="Describe how the image should animate..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, maxChars))}
                className="min-h-[60px] resize-none"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Describe motion, style, or effects
                </p>
                <span className={`text-xs ${remainingChars < 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {remainingChars}/{maxChars}
                </span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Model Selection */}
        <div className="space-y-2">
          <Label htmlFor="model" className="text-sm font-medium text-foreground">AI Model</Label>
          <Select 
            key={`model-select-${activeTab}`}
            value={selectedModel}
            onValueChange={setSelectedModel}
            onOpenChange={(open) => {
              // Prevent any event bubbling that might trigger navigation
              debugLogger.log('AIView', 'MODEL_DROPDOWN_OPEN_CHANGE', { 
                isOpen: open, 
                activeTab, 
                selectedModel,
                timestamp: Date.now()
              });
            }}
          >
            <SelectTrigger 
              id="model"
              type="button"
              className="h-10 border border-border/50 bg-background hover:border-border transition-colors duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
              onClick={(e) => {
                // Prevent event bubbling to document handlers
                e.stopPropagation();
                debugLogger.log('AIView', 'MODEL_TRIGGER_CLICK', { 
                  activeTab, 
                  selectedModel,
                  timestamp: Date.now()
                });
              }}
            >
              <SelectValue 
                placeholder="Select AI model" 
                className="text-sm text-foreground placeholder:text-muted-foreground/70"
              />
            </SelectTrigger>
            <SelectContent 
              onClick={(e) => e.stopPropagation()}
              className="bg-background border border-border/50 shadow-lg rounded-lg min-w-[280px] font-mono"
            >
              {AI_MODELS.map((model, index) => (
                <Fragment key={model.id}>
                  <SelectItem 
                    value={model.id}
                    className="px-3 py-2 rounded-md hover:bg-accent/50 focus:bg-accent/50 cursor-pointer transition-colors duration-150 border-0 focus:text-foreground"
                    onClick={(e) => {
                      // Prevent event bubbling to document handlers
                      e.stopPropagation();
                      debugLogger.log('AIView', 'MODEL_ITEM_CLICK', { 
                        modelId: model.id, 
                        modelName: model.name,
                        timestamp: Date.now()
                      });
                    }}
                  >
                    <div className="flex items-center justify-between w-full px-2">
                      <span className="font-medium text-sm text-foreground">{model.name}</span>
                      <span className="text-xs text-muted-foreground font-normal ml-6">
                        USD {model.price} • {model.resolution}
                      </span>
                    </div>
                  </SelectItem>
                  {index < AI_MODELS.length - 1 && (
                    <div className="mx-2 h-px bg-border my-1" />
                  )}
                </Fragment>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Model Info */}
        {selectedModel && (
          <div className="bg-panel-accent rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <BotIcon className="size-4 text-primary" />
              <span className="text-sm font-medium">
                {selectedModelInfo?.name}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedModelInfo?.description}
            </p>
          </div>
        )}

        {/* Generate Button */}
        <div className="mt-auto pt-4">
          <Button 
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <BotIcon className="mr-2 size-4" />
                Generate Video
              </>
            )}
          </Button>
          
          {/* Error Display */}
          {error && (
            <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
              {error}
            </div>
          )}
          
          {/* Progress Display */}
          {isGenerating && jobId && (
            <div className="mt-2 space-y-2">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="size-4 animate-spin text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    {statusMessage || "Processing..."}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-blue-600">
                    Job ID: {jobId.substring(0, 8)}...
                  </span>
                  <span className="text-xs text-blue-600">
                    {generationProgress}%
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Success Display */}
          {jobId && !isGenerating && !generatedVideo && !error && (
            <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-sm text-green-700">
              ✅ Generation completed! Processing video...
            </div>
          )}
          
          {/* Cost Display */}
          {selectedModel && !generatedVideo && (
            <div className="mt-2 text-center">
              <span className="text-xs text-muted-foreground">
                Cost: USD {selectedModelInfo?.price} • {selectedModelInfo?.resolution}
              </span>
            </div>
          )}
          
          {/* Validation Message */}
          {!canGenerate && !isGenerating && !generatedVideo && (
            <div className="mt-2 text-center">
              <span className="text-xs text-muted-foreground">
                {!selectedModel ? "Select an AI model" : 
                 activeTab === "text" ? "Enter a video description" : 
                 "Upload an image"}
              </span>
            </div>
          )}
        </div>
        
        {/* Video Generated Success */}
        {generatedVideo && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Play className="size-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Video Generated Successfully!</span>
            </div>
            
            {/* Video Info */}
            <div className="space-y-2 text-xs text-muted-foreground mb-3">
              <div className="flex justify-between">
                <span>Prompt:</span>
                <span className="text-right max-w-[200px] truncate">{generatedVideo.prompt}</span>
              </div>
              <div className="flex justify-between">
                <span>Model:</span>
                <span>{AI_MODELS.find(m => m.id === generatedVideo.model)?.name}</span>
              </div>
              {generatedVideo.fileSize && (
                <div className="flex justify-between">
                  <span>File Size:</span>
                  <span>{(generatedVideo.fileSize / 1024).toFixed(1)} KB</span>
                </div>
              )}
              {generatedVideo.duration && (
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>{generatedVideo.duration}s</span>
                </div>
              )}
            </div>

            <div className="text-sm text-green-700 mb-3">
              ✅ Video automatically added to Media panel
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  // Download video
                  const link = document.createElement('a');
                  link.href = generatedVideo.videoUrl;
                  link.download = `generated-video-${generatedVideo.jobId.substring(0, 8)}.mp4`;
                  link.click();
                }}
              >
                <Download className="mr-1 size-3" />
                Download
              </Button>
              <Button
                type="button"
                size="sm"
                variant="text"
                className="flex-1"
                onClick={resetGenerationState}
              >
                Generate Another Video
              </Button>
            </div>
          </div>
        )}
        
        {/* History Panel */}
        <AIHistoryPanel
          isOpen={isHistoryPanelOpen}
          onClose={() => setIsHistoryPanelOpen(false)}
          generationHistory={generationHistory}
          onSelectVideo={(video) => {
            setGeneratedVideo(video);
            setIsHistoryPanelOpen(false);
          }}
          onRemoveFromHistory={removeFromHistory}
          aiModels={AI_MODELS}
        />
      </div>
    </div>
  );
}