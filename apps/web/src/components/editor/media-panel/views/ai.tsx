"use client";

import { BotIcon, Loader2, Play, Download, History, Trash2, ImageIcon, TypeIcon, Upload, X, Check } from "lucide-react";
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

interface GeneratedVideoResult {
  modelId: string;
  video: GeneratedVideo;
}

export function AiView() {
  const [prompt, setPrompt] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideoResult[]>([]);
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

  // Helper functions for multi-model selection
  const toggleModel = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const isModelSelected = (modelId: string) => selectedModels.includes(modelId);

  // 🧪 TESTING FUNCTION: Mock generation without API calls (remove before production)
  const handleMockGenerate = async () => {
    if (activeTab === "text") {
      if (!prompt.trim() || selectedModels.length === 0) return;
    } else {
      if (!selectedImage || selectedModels.length === 0) return;
    }
    
    setIsGenerating(true);
    setError(null);
    setJobId(null);
    setGeneratedVideos([]);
    
    try {
      const mockGenerations: GeneratedVideoResult[] = [];
      
      for (let i = 0; i < selectedModels.length; i++) {
        const modelId = selectedModels[i];
        const modelName = AI_MODELS.find(m => m.id === modelId)?.name;
        
        setStatusMessage(`🧪 Mock generating with ${modelName} (${i + 1}/${selectedModels.length})`);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const mockVideo: GeneratedVideo = {
          jobId: `mock-job-${Date.now()}-${i}`,
          videoUrl: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4', // Free sample video
          videoPath: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
          fileSize: 1024000,
          duration: 5,
          prompt: prompt.trim(),
          model: modelId
        };
        
        mockGenerations.push({ modelId, video: mockVideo });
        
        // Mock history addition
        addToHistory(mockVideo);
        
        debugLogger.log('AIView', 'MOCK_VIDEO_GENERATED', { 
          modelName,
          mockJobId: mockVideo.jobId,
          modelId 
        });
      }
      
      setGeneratedVideos(mockGenerations);
      setStatusMessage(`🧪 Mock generated ${mockGenerations.length} videos successfully!`);
      
    } catch (error) {
      setError('Mock generation error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      debugLogger.log('AIView', 'MOCK_GENERATION_FAILED', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // DEBUG: Component lifecycle tracking
  debugLogger.log('AIView', 'RENDER', {
    activeTab,
    selectedModels,
    selectedImageExists: !!selectedImage,
    currentProjectId: activeProject?.id,
    isFallbackProject,
    currentUrl: window.location.href,
    renderCount: Math.random(),
    codeVersion: '2025-07-21-15:30-MULTI-SELECT-IMPLEMENTATION'
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
            model: selectedModels[0] || 'unknown' // Use first selected model for legacy support
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
      const generations: GeneratedVideoResult[] = [];
      
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
          
          // Automatically add to media panel and download to Downloads folder
          if (activeProject) {
            try {
              const videoResponse = await fetch(newVideo.videoUrl);
              const blob = await videoResponse.blob();
              const modelName = AI_MODELS.find(m => m.id === modelId)?.name || modelId;
              const fileName = `ai-${modelName.toLowerCase().replace(/\s+/g, '-')}-${newVideo.jobId.substring(0, 8)}.mp4`;
              const file = new File([blob], fileName, {
                type: 'video/mp4',
              });
              
              // Add to media panel
              await addMediaItem(activeProject.id, {
                name: `AI (${modelName}): ${newVideo.prompt.substring(0, 20)}...`,
                type: "video",
                file: file,
                url: newVideo.videoUrl,
                duration: newVideo.duration || 5,
                width: 1920,
                height: 1080,
              });
              
              // Automatically download to Downloads folder
              const downloadLink = document.createElement('a');
              downloadLink.href = URL.createObjectURL(blob);
              downloadLink.download = fileName;
              document.body.appendChild(downloadLink);
              downloadLink.click();
              document.body.removeChild(downloadLink);
              URL.revokeObjectURL(downloadLink.href);
              
              debugLogger.log('AIView', 'VIDEO_ADDED_TO_MEDIA_PANEL_AND_DOWNLOADED', { 
                videoUrl: newVideo.videoUrl,
                modelName,
                fileName,
                projectId: activeProject.id 
              });
            } catch (addError) {
              debugLogger.log('AIView', 'VIDEO_ADD_TO_MEDIA_PANEL_FAILED', { 
                error: addError instanceof Error ? addError.message : 'Unknown error',
                modelName: AI_MODELS.find(m => m.id === modelId)?.name,
                projectId: activeProject.id 
              });
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

  // Reset generation state
  const resetGenerationState = () => {
    setGeneratedVideo(null);
    setGeneratedVideos([]);
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
    if (isGenerating || selectedModels.length === 0) return false;
    if (activeTab === "text") {
      return prompt.trim().length > 0;
    } else {
      return selectedImage !== null;
    }
  })();
  
  // Calculate total cost for selected models
  const totalCost = selectedModels.reduce((total, modelId) => {
    const model = AI_MODELS.find(m => m.id === modelId);
    return total + (model ? parseFloat(model.price) : 0);
  }, 0);


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
          <TabsList className="grid w-full grid-cols-2 bg-transparent">
            <TabsTrigger 
              value="text" 
              className="flex items-center gap-2 bg-transparent text-white data-[state=active]:bg-transparent data-[state=active]:text-white border-0 shadow-none hover:text-blue-400 transition-colors duration-200"
            >
              <TypeIcon className="size-4" />
              Text to Video
            </TabsTrigger>
            <TabsTrigger 
              value="image" 
              className="flex items-center gap-2 bg-transparent text-white data-[state=active]:bg-transparent data-[state=active]:text-white border-0 shadow-none hover:text-blue-400 transition-colors duration-200"
            >
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
              size="sm"
              variant="outline"
              onClick={() => setSelectedModels(AI_MODELS.map(m => m.id))}
              className="text-xs flex-1"
            >
              Select All
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSelectedModels([])}
              className="text-xs flex-1"
            >
              Clear All
            </Button>
          </div>
        </div>

        {/* Selected Models Info */}
        {selectedModels.length > 0 && (
          <div className="bg-panel-accent rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <BotIcon className="size-4 text-primary" />
              <span className="text-sm font-medium">
                {selectedModels.length} Model{selectedModels.length > 1 ? 's' : ''} Selected
              </span>
            </div>
            <div className="space-y-1">
              {selectedModels.map(modelId => {
                const model = AI_MODELS.find(m => m.id === modelId);
                return (
                  <div key={modelId} className="flex justify-between items-center text-xs">
                    <span className="text-foreground">{model?.name}</span>
                    <span className="text-muted-foreground">USD {model?.price}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="mt-auto pt-4 space-y-2">
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
          
          {/* 🧪 TESTING: Mock Generate Button - Remove before production */}
          <Button 
            onClick={handleMockGenerate}
            disabled={!canGenerate}
            className="w-full"
            size="lg"
            variant="outline"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Mock Generating...
              </>
            ) : (
              <>
                🧪 Test Generate (No Cost)
              </>
            )}
          </Button>
        </div>
        
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
        {selectedModels.length > 0 && !generatedVideos.length && (
          <div className="mt-2 text-center">
            <span className="text-xs text-muted-foreground">
              Total Cost: USD {totalCost.toFixed(2)} • {selectedModels.length} model{selectedModels.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
        
        {/* Validation Message */}
        {!canGenerate && !isGenerating && generatedVideos.length === 0 && (
          <div className="mt-2 text-center">
            <span className="text-xs text-muted-foreground">
              {selectedModels.length === 0 ? "Select at least one AI model" : 
               activeTab === "text" ? "Enter a video description" : 
               "Upload an image"}
            </span>
          </div>
        )}
        
        {/* Multi-Video Generated Success */}
        {generatedVideos.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Play className="size-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                {generatedVideos.length} Video{generatedVideos.length > 1 ? 's' : ''} Generated Successfully!
              </span>
            </div>
            
            <div className="text-sm text-green-700 mb-3">
              ✅ All videos automatically added to Media panel<br/>
              📁 Videos downloaded to your Downloads folder
            </div>
            
            {/* Individual video results */}
            <div className="space-y-2">
              {generatedVideos.map(({ modelId, video }) => {
                const model = AI_MODELS.find(m => m.id === modelId);
                return (
                  <div key={modelId} className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm text-green-700">
                        {model?.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        USD {model?.price} • {model?.resolution}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = video.videoUrl;
                          link.download = `ai-${model?.name.toLowerCase().replace(/\s+/g, '-')}-${video.jobId.substring(0, 8)}.mp4`;
                          link.click();
                        }}
                        className="flex-1"
                      >
                        <Download className="mr-1 size-3" />
                        Download
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Actions for all videos */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  // Download all videos
                  generatedVideos.forEach(({ modelId, video }) => {
                    const model = AI_MODELS.find(m => m.id === modelId);
                    const link = document.createElement('a');
                    link.href = video.videoUrl;
                    link.download = `ai-${model?.name.toLowerCase().replace(/\s+/g, '-')}-${video.jobId.substring(0, 8)}.mp4`;
                    link.click();
                  });
                }}
                className="flex-1"
              >
                <Download className="mr-1 size-3" />
                Download All ({generatedVideos.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={resetGenerationState}
                className="flex-1"
              >
                Generate Again
              </Button>
            </div>
          </div>
        )}
        
        {/* Single Video Generated Success (Fallback) */}
        {generatedVideo && generatedVideos.length === 0 && (
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Play className="size-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Video Generated Successfully!</span>
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
                variant="outline"
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