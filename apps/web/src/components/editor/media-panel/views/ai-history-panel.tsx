"use client";

import { History, Play, Trash2, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface GeneratedVideo {
  jobId: string;
  videoUrl: string;
  videoPath?: string;
  fileSize?: number;
  duration?: number;
  prompt: string;
  model: string;
}

interface AIHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  generationHistory: GeneratedVideo[];
  onSelectVideo: (video: GeneratedVideo) => void;
  onRemoveFromHistory: (jobId: string) => void;
  aiModels: Array<{ id: string; name: string; description: string; price: string; resolution: string }>;
}

export function AIHistoryPanel({
  isOpen,
  onClose,
  generationHistory,
  onSelectVideo,
  onRemoveFromHistory,
  aiModels
}: AIHistoryPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      
      {/* Sliding Panel */}
      <div className={`
        fixed right-0 top-0 h-full w-80 bg-background border-l border-border z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="size-5 text-primary" />
            <h3 className="font-semibold">Generation History</h3>
          </div>
          <Button
            size="sm"
            variant="text"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {generationHistory.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <History className="size-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No generation history yet</p>
              <p className="text-xs mt-1">Generated videos will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {generationHistory.map((video) => (
                <div key={video.jobId} className="bg-panel-accent rounded-lg border p-3">
                  {/* Video Thumbnail/Preview */}
                  <div className="aspect-video bg-black rounded-lg mb-3 relative overflow-hidden">
                    <video
                      src={video.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                      poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23000'/%3E%3C/svg%3E"
                    >
                      Your browser does not support the video tag.
                    </video>
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <Play className="size-8 text-white opacity-80" />
                    </div>
                  </div>

                  {/* Video Info */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-medium line-clamp-2">
                        {video.prompt.length > 40 ? `${video.prompt.substring(0, 40)}...` : video.prompt}
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium">Model:</span>
                        <br />
                        {aiModels.find(m => m.id === video.model)?.name || video.model}
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span>
                        <br />
                        {video.duration || 5}s
                      </div>
                    </div>

                    {video.fileSize && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Size:</span> {(video.fileSize / 1024).toFixed(1)} KB
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onSelectVideo(video)}
                    >
                      <Play className="mr-1 size-3" />
                      Use
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = video.videoUrl;
                        link.download = `generated-video-${video.jobId.substring(0, 8)}.mp4`;
                        link.click();
                      }}
                    >
                      <Download className="size-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRemoveFromHistory(video.jobId)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            {generationHistory.length} video{generationHistory.length !== 1 ? 's' : ''} in history
          </p>
        </div>
      </div>
    </>
  );
}