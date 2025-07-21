"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  Zap, 
  Eye, 
  Palette, 
  Users, 
  Volume2, 
  Scissors, 
  Sparkles,
  TrendingUp,
  Clock,
  Target,
  Camera,
  Waveform
} from "lucide-react";
import { 
  analyzeVideoContent, 
  generateAutoCutSuggestions,
  type ContentAnalysisResult,
  type HighlightMoment,
  type FaceDetection,
  type SceneDetection,
  type ColorGradingSuggestion
} from "@/lib/ai-content-analyzer";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { cn } from "@/lib/utils";

interface AIAnalyzerPanelProps {
  className?: string;
}

export function AIAnalyzerPanel({ className }: AIAnalyzerPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<ContentAnalysisResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { addElementToTrack, addTrack } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { seek } = usePlaybackStore();

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      setAnalysisResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      const result = await analyzeVideoContent(selectedFile, (progress) => {
        setAnalysisProgress(progress);
      });
      
      setAnalysisResult(result);
      console.log('🤖 AI Analysis Complete:', result);
    } catch (error) {
      console.error('AI Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const handleApplyHighlight = (highlight: HighlightMoment) => {
    // Create a new track with the highlight segment
    const trackId = addTrack("media");
    
    // Find corresponding media item
    const mediaItem = mediaItems.find((item: any) => item.name === selectedFile?.name);
    
    if (mediaItem) {
      addElementToTrack(trackId, {
        type: "media",
        mediaId: mediaItem.id,
        name: `AI Highlight: ${highlight.description}`,
        duration: highlight.endTime - highlight.startTime,
        startTime: 0, // Place at beginning of new track
        trimStart: highlight.startTime,
        trimEnd: 0
      });
    }
  };

  const handleSeekToMoment = (timestamp: number) => {
    seek(timestamp);
  };

  const handleApplyAutoCuts = () => {
    if (!analysisResult) return;
    
    const suggestions = generateAutoCutSuggestions(analysisResult);
    console.log('🎯 Auto-cut suggestions:', suggestions);
    
    // Apply suggestions to timeline
    suggestions
      .filter(s => s.type === 'highlight' && s.confidence > 0.6)
      .slice(0, 5) // Top 5 suggestions
      .forEach((suggestion, index) => {
        const highlight = analysisResult.highlights.find((h: any) => h.startTime <= suggestion.timestamp && h.endTime >= suggestion.timestamp);
        if (highlight) {
          setTimeout(() => handleApplyHighlight(highlight), index * 100);
        }
      });
  };

  if (!analysisResult && !isAnalyzing && !selectedFile) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Content Analyzer
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
              BETA
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Revolutionary AI-powered video analysis that automatically detects:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-6">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Scene Changes
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Face Detection
              </div>
              <div className="flex items-center gap-1">
                <Volume2 className="h-3 w-3" />
                Audio Analysis
              </div>
              <div className="flex items-center gap-1">
                <Palette className="h-3 w-3" />
                Color Grading
              </div>
            </div>
            <Button onClick={handleFileSelect} className="bg-purple-600 hover:bg-purple-700">
              <Brain className="h-4 w-4 mr-2" />
              Select Video to Analyze
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selectedFile && !analysisResult && !isAnalyzing) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Content Analyzer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <div className="text-sm font-medium mb-2">{selectedFile.name}</div>
            <div className="text-xs text-muted-foreground mb-4">
              Ready to analyze with AI computer vision
            </div>
            <Button 
              onClick={handleAnalyze}
              className="bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              <Zap className="h-4 w-4 mr-2" />
              Start AI Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isAnalyzing) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500 animate-pulse" />
            Analyzing Video...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <div className="text-sm font-medium mb-2">
              AI is analyzing your video content
            </div>
            <Progress value={analysisProgress} className="mb-2" />
            <div className="text-xs text-muted-foreground">
              {Math.round(analysisProgress)}% complete
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (analysisResult) {
    const { summary, highlights, scenes, faces, colorGrading } = analysisResult;
    
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Analysis Results
            <Badge variant="default" className="bg-green-100 text-green-700">
              Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-xs text-blue-600 font-medium">Duration</div>
              <div className="text-lg font-bold text-blue-800">
                {Math.round(summary.totalDuration)}s
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-xs text-green-600 font-medium">Content Type</div>
              <div className="text-lg font-bold text-green-800 capitalize">
                {summary.contentType.replace('_', ' ')}
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="text-xs text-orange-600 font-medium">Scenes</div>
              <div className="text-lg font-bold text-orange-800">
                {summary.sceneCount}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-xs text-purple-600 font-medium">Faces</div>
              <div className="text-lg font-bold text-purple-800">
                {summary.faceDetectionCount}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <Button 
              onClick={handleApplyAutoCuts}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Scissors className="h-4 w-4 mr-2" />
              Apply AI Auto-Cuts ({highlights.length} highlights)
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setShowDetails(!showDetails)}
              className="w-full"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {showDetails ? 'Hide' : 'Show'} Detailed Analysis
            </Button>
          </div>

          {/* Content Tags */}
          <div>
            <div className="text-sm font-medium mb-2">Content Tags</div>
            <div className="flex flex-wrap gap-1">
              {analysisResult.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {showDetails && (
            <>
              <Separator />
              
              {/* Highlight Moments */}
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Target className="h-4 w-4 text-yellow-500" />
                  AI-Detected Highlights ({highlights.length})
                </div>
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {highlights.slice(0, 8).map((highlight, index) => (
                      <div 
                        key={index} 
                        className="bg-yellow-50 p-3 rounded-lg border border-yellow-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-yellow-800">
                            {highlight.description}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Score: {Math.round(highlight.score * 100)}%
                          </Badge>
                        </div>
                        <div className="text-xs text-yellow-700 mb-2">
                          {Math.round(highlight.startTime)}s - {Math.round(highlight.endTime)}s
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleSeekToMoment(highlight.startTime)}
                            className="text-xs"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Seek
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleApplyHighlight(highlight)}
                            className="text-xs bg-yellow-600 hover:bg-yellow-700"
                          >
                            <Scissors className="h-3 w-3 mr-1" />
                            Extract
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Separator />

              {/* Face Detection Summary */}
              {faces.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-3">
                    <Camera className="h-4 w-4 text-blue-500" />
                    Face Detection ({faces.length} moments)
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-xs text-blue-700">
                      AI detected {faces.length} moments with face(s) present. 
                      Average confidence: {Math.round(faces.reduce((sum, f) => sum + f.faces.reduce((fSum, face) => fSum + face.confidence, 0) / f.faces.length, 0) / faces.length * 100)}%
                    </div>
                  </div>
                </div>
              )}

              {/* Scene Analysis */}
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Eye className="h-4 w-4 text-green-500" />
                  Scene Analysis
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-green-50 p-2 rounded text-center">
                    <div className="font-medium text-green-800">Motion Level</div>
                    <div className="text-green-600">
                      {Math.round(summary.avgMotionLevel * 100)}%
                    </div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded text-center">
                    <div className="font-medium text-blue-800">Audio Level</div>
                    <div className="text-blue-600">
                      {Math.round(summary.avgAudioLevel * 100)}%
                    </div>
                  </div>
                  <div className="bg-purple-50 p-2 rounded text-center">
                    <div className="font-medium text-purple-800">Scene Changes</div>
                    <div className="text-purple-600">
                      {summary.sceneCount}
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Grading Suggestions */}
              {colorGrading.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-3">
                    <Palette className="h-4 w-4 text-pink-500" />
                    Color Grading Suggestions ({colorGrading.length})
                  </div>
                  <div className="bg-pink-50 p-3 rounded-lg">
                    <div className="text-xs text-pink-700 mb-2">
                      AI detected {colorGrading.length} moments that could benefit from color correction
                    </div>
                    <Button size="sm" variant="outline" className="text-xs">
                      Apply All Corrections
                    </Button>
                  </div>
                </div>
              )}

              {/* Dominant Colors */}
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Palette className="h-4 w-4 text-indigo-500" />
                  Dominant Colors
                </div>
                <div className="flex gap-2">
                  {summary.dominantColors.map((color, index) => (
                    <div
                      key={index}
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Reset Button */}
          <Separator />
          <Button 
            variant="outline" 
            onClick={() => {
              setAnalysisResult(null);
              setSelectedFile(null);
            }}
            className="w-full"
          >
            Analyze New Video
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}

export default AIAnalyzerPanel;
