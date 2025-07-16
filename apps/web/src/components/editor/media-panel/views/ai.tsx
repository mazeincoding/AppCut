"use client";

import { BotIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generateVideo, handleApiError } from "@/lib/ai-video-client";

interface AIModel {
  id: string;
  name: string;
  description: string;
  price: string;
  resolution: string;
}

const AI_MODELS: AIModel[] = [
  { id: "veo3", name: "Veo3", description: "Highest quality, slower generation", price: "$3.00", resolution: "1080p" },
  { id: "veo3_fast", name: "Veo3 Fast", description: "High quality, faster generation", price: "$2.00", resolution: "1080p" },
  { id: "veo2", name: "Veo2", description: "Good quality, balanced speed", price: "$2.50", resolution: "1080p" },
  { id: "hailuo", name: "Hailuo", description: "Fast generation, good quality", price: "$0.08", resolution: "720p" },
  { id: "kling", name: "Kling", description: "Fast generation, cost-effective", price: "$0.10", resolution: "720p" },
];

export function AiView() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const maxChars = 500;
  const remainingChars = maxChars - prompt.length;

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedModel) return;
    
    setIsGenerating(true);
    setError(null);
    setJobId(null);
    
    try {
      console.log("Generating video with:", { prompt, selectedModel });
      
      const response = await generateVideo({
        prompt: prompt.trim(),
        model: selectedModel,
        resolution: "1080p",
        duration: 5
      });
      
      console.log("Video generation started:", response);
      setJobId(response.job_id);
      
      // In a real implementation, you'd poll the status endpoint
      // For now, we'll just show the job ID
      console.log("Job ID:", response.job_id);
      console.log("Status:", response.status);
      console.log("Message:", response.message);
      console.log("Estimated time:", response.estimated_time, "seconds");
      
    } catch (error) {
      console.error("Generation failed:", error);
      setError(handleApiError(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = prompt.trim().length > 0 && selectedModel && !isGenerating;
  const selectedModelInfo = AI_MODELS.find(m => m.id === selectedModel);

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <BotIcon className="size-5 text-primary" />
        <h3 className="text-sm font-medium">AI Video Generation</h3>
      </div>
      
      <div className="flex-1 flex flex-col gap-4">
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
            <p className="text-xs text-muted-foreground">
              Be specific about scenes, actions, and style
            </p>
            <span className={`text-xs ${remainingChars < 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {remainingChars}/{maxChars}
            </span>
          </div>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <Label htmlFor="model">AI Model</Label>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger id="model">
              <SelectValue placeholder="Select AI model" />
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {model.price} • {model.resolution}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {model.description}
                    </span>
                  </div>
                </SelectItem>
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
          
          {/* Job ID Display */}
          {jobId && (
            <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-sm text-green-700">
              ✅ Generation started! Job ID: {jobId.substring(0, 8)}...
            </div>
          )}
          
          {/* Cost Display */}
          {selectedModel && (
            <div className="mt-2 text-center">
              <span className="text-xs text-muted-foreground">
                Cost: {selectedModelInfo?.price} • {selectedModelInfo?.resolution}
              </span>
            </div>
          )}
          
          {/* Validation Message */}
          {!canGenerate && !isGenerating && (
            <div className="mt-2 text-center">
              <span className="text-xs text-muted-foreground">
                {!prompt.trim() ? "Enter a video description" : "Select an AI model"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}