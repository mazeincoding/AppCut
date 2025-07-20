/**
 * REVOLUTIONARY AI Live Preview Component
 * 
 * This component provides INSANE real-time AI analysis overlays on video preview:
 * - Live frame analysis with visual feedback
 * - Real-time effect suggestions with previews
 * - Smart overlay system with performance optimization
 * - Interactive AI assistance that responds to user actions
 * 
 * This is the most advanced video preview system ever built for the web!
 */

"use client";

import * as React from "react";
import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Brain, 
  Eye, 
  Zap, 
  Settings, 
  TrendingUp, 
  Sparkles,
  Target,
  BarChart3,
  Cpu,
  Activity
} from 'lucide-react';
import {
  realTimeAIAnalyzer,
  type LiveAnalysisResult,
  type FrameAnalysis,
  type AIOverlay,
  formatAnalysisForDisplay
} from '@/lib/real-time-ai-analyzer';

// Fallback for toast if sonner is not available
const toast = {
  success: (message: string) => console.log('✅', message),
  error: (message: string) => console.error('❌', message),
};

interface AILivePreviewProps {
  videoElement: HTMLVideoElement | null;
  isVisible: boolean;
  onEffectApply?: (effectType: string, parameters: Record<string, number>) => void;
  onColorGradingApply?: (grading: any) => void;
}

export function AILivePreview({ 
  videoElement, 
  isVisible, 
  onEffectApply, 
  onColorGradingApply 
}: AILivePreviewProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<LiveAnalysisResult | null>(null);
  const [overlaysEnabled, setOverlaysEnabled] = useState(true);
  const [performanceMode, setPerformanceMode] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<FrameAnalysis[]>([]);
  
  // Overlay canvas ref
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  
  // Performance monitoring
  const [performanceStats, setPerformanceStats] = useState({
    fps: 0,
    analysisTime: 0,
    cpuUsage: 0,
    memoryUsage: 0,
  });
  
  // Analysis callback
  const handleAnalysisResult = useCallback((result: LiveAnalysisResult) => {
    setCurrentAnalysis(result);
    setAnalysisHistory(prev => [...prev.slice(-49), result.currentFrame]); // Keep last 50 frames
    setPerformanceStats({
      fps: result.performance.fps,
      analysisTime: result.performance.analysisTime,
      cpuUsage: result.performance.cpuUsage,
      memoryUsage: result.performance.memoryUsage / 1024 / 1024, // MB
    });
    
    // Update overlays if enabled
    if (overlaysEnabled && overlayCanvasRef.current && videoElement) {
      drawAIOverlays(result.currentFrame);
    }
  }, [overlaysEnabled, videoElement]);
  
  // Start/stop analysis based on visibility and video element
  useEffect(() => {
    if (!isVisible || !videoElement) {
      if (isAnalyzing) {
        realTimeAIAnalyzer.stopAnalysis();
        setIsAnalyzing(false);
        setCurrentAnalysis(null);
      }
      return;
    }
    
    if (!isAnalyzing) {
      const analysisFrequency = performanceMode ? 15 : 30; // Lower FPS in performance mode
      
      realTimeAIAnalyzer.startRealTimeAnalysis(
        videoElement,
        handleAnalysisResult,
        {
          analysisFrequency,
          enableOverlays: overlaysEnabled,
          enablePerformanceMonitoring: true,
        }
      );
      
      setIsAnalyzing(true);
      toast.success('🧠 AI Live Analysis activated!');
    }
    
    return () => {
      if (isAnalyzing) {
        realTimeAIAnalyzer.stopAnalysis();
        setIsAnalyzing(false);
      }
    };
  }, [isVisible, videoElement, performanceMode, isAnalyzing, handleAnalysisResult]);
  
  // Draw AI overlays on canvas
  const drawAIOverlays = useCallback((analysis: FrameAnalysis) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || !videoElement) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Match canvas size to video
    canvas.width = videoElement.clientWidth;
    canvas.height = videoElement.clientHeight;
    
    // Clear previous overlays
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Generate overlays
    const overlays = realTimeAIAnalyzer.generateAIOverlays(
      analysis, 
      canvas.width, 
      canvas.height
    );
    
    // Draw overlays
    overlays.forEach(overlay => {
      ctx.save();
      
      // Set overlay style
      ctx.fillStyle = overlay.color + '20'; // Semi-transparent background
      ctx.strokeStyle = overlay.color;
      ctx.lineWidth = 2;
      ctx.font = '12px monospace';
      
      // Draw overlay box
      ctx.fillRect(overlay.x, overlay.y, overlay.width, overlay.height);
      ctx.strokeRect(overlay.x, overlay.y, overlay.width, overlay.height);
      
      // Blinking effect for warnings
      if (overlay.blinking && Date.now() % 1000 < 500) {
        ctx.globalAlpha = 0.3;
      }
      
      // Draw content
      ctx.fillStyle = overlay.color;
      ctx.fillText(
        overlay.content, 
        overlay.x + 5, 
        overlay.y + 15
      );
      
      // Draw confidence bar for detections
      if (overlay.type === 'detection') {
        const barWidth = overlay.width - 10;
        const barHeight = 3;
        const barY = overlay.y + overlay.height - 8;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(overlay.x + 5, barY, barWidth, barHeight);
        
        ctx.fillStyle = overlay.color;
        ctx.fillRect(overlay.x + 5, barY, barWidth * overlay.confidence, barHeight);
      }
      
      ctx.restore();
    });
  }, [videoElement]);
  
  // Apply suggested effect
  const applySuggestedEffect = useCallback((effect: any) => {
    if (onEffectApply) {
      onEffectApply(effect.type, effect.parameters);
      toast.success(`✨ Applied ${effect.name}!`);
    }
  }, [onEffectApply]);
  
  // Apply color grading suggestion
  const applyColorGrading = useCallback(() => {
    if (currentAnalysis?.currentFrame.colorGradingSuggestion && onColorGradingApply) {
      onColorGradingApply(currentAnalysis.currentFrame.colorGradingSuggestion);
      toast.success(`🎨 Applied ${currentAnalysis.currentFrame.colorGradingSuggestion.style} color grading!`);
    }
  }, [currentAnalysis, onColorGradingApply]);
  
  if (!isVisible) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Overlay Canvas */}
      {overlaysEnabled && (
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{ mixBlendMode: 'normal' }}
        />
      )}
      
      {/* AI Analysis Panel */}
      <div className="absolute top-4 right-4 pointer-events-auto z-20">
        <Card className="w-80 p-4 bg-black/80 backdrop-blur-sm text-white border-blue-500/30">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-5 w-5 text-blue-400 animate-pulse" />
            <span className="font-bold text-sm">AI Live Analysis</span>
            <Badge variant="outline" className="text-xs">
              {isAnalyzing ? 'ACTIVE' : 'INACTIVE'}
            </Badge>
          </div>
          
          {/* Performance Stats */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-green-400" />
              <span>{performanceStats.fps.toFixed(1)} FPS</span>
            </div>
            <div className="flex items-center gap-1">
              <Cpu className="h-3 w-3 text-yellow-400" />
              <span>{performanceStats.cpuUsage.toFixed(1)}% CPU</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3 text-purple-400" />
              <span>{performanceStats.analysisTime.toFixed(1)}ms</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-blue-400" />
              <span>{performanceStats.memoryUsage.toFixed(1)}MB</span>
            </div>
          </div>
          
          {/* Current Frame Analysis */}
          {currentAnalysis && (
            <>
              <div className="border-t border-gray-600 pt-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium">Frame Analysis</span>
                </div>
                
                <div className="space-y-1 text-xs">
                  {Object.entries(formatAnalysisForDisplay(currentAnalysis.currentFrame)).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-300">{key}:</span>
                      <span className="text-white font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Effect Suggestions */}
              {currentAnalysis.currentFrame.suggestedEffects.length > 0 && (
                <div className="border-t border-gray-600 pt-3 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm font-medium">AI Suggestions</span>
                  </div>
                  
                  <div className="space-y-2">
                    {currentAnalysis.currentFrame.suggestedEffects.slice(0, 3).map((effect, index) => (
                      <div key={index} className="bg-gray-800/50 rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{effect.name}</span>
                          <Badge variant="outline" size="sm" className="text-xs">
                            {Math.round(effect.confidence * 100)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-300 mb-2">{effect.description}</p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full h-6 text-xs"
                          onClick={() => applySuggestedEffect(effect)}
                        >
                          Apply
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Color Grading Suggestion */}
              {currentAnalysis.currentFrame.colorGradingSuggestion.confidence > 0.5 && (
                <div className="border-t border-gray-600 pt-3 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-medium">Color Grading</span>
                  </div>
                  
                  <div className="bg-gray-800/50 rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">
                        {currentAnalysis.currentFrame.colorGradingSuggestion.style} Style
                      </span>
                      <Badge variant="outline" size="sm" className="text-xs">
                        {Math.round(currentAnalysis.currentFrame.colorGradingSuggestion.confidence * 100)}%
                      </Badge>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full h-6 text-xs mt-2"
                      onClick={applyColorGrading}
                    >
                      Apply Style
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Scene Context */}
              {currentAnalysis.sceneContext.sceneStability < 0.8 && (
                <div className="border-t border-gray-600 pt-3 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-medium">Scene Changes</span>
                  </div>
                  
                  <div className="text-xs text-yellow-300">
                    Unstable scene detected. Consider cutting at recommended points.
                  </div>
                  
                  {currentAnalysis.sceneContext.recommendedCutPoints.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-300">Cut suggestions: </span>
                      {currentAnalysis.sceneContext.recommendedCutPoints.slice(0, 3).map((time, index) => (
                        <Badge key={index} variant="outline" size="sm" className="text-xs mr-1">
                          {time.toFixed(1)}s
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          
          {/* Controls */}
          <div className="border-t border-gray-600 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs">Overlays</span>
              <Switch 
                checked={overlaysEnabled} 
                onCheckedChange={setOverlaysEnabled}
                size="sm"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs">Performance Mode</span>
              <Switch 
                checked={performanceMode} 
                onCheckedChange={setPerformanceMode}
                size="sm"
              />
            </div>
          </div>
        </Card>
      </div>
      
      {/* Analysis History Visualization */}
      {analysisHistory.length > 10 && (
        <div className="absolute bottom-4 left-4 pointer-events-auto z-20">
          <Card className="w-64 p-3 bg-black/80 backdrop-blur-sm text-white border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium">Analysis Timeline</span>
            </div>
            
            <div className="h-16 flex items-end gap-1">
              {analysisHistory.slice(-30).map((frame, index) => (
                <div
                  key={index}
                  className="flex-1 bg-gradient-to-t from-green-500/50 to-green-300/30 rounded-sm"
                  style={{
                    height: `${Math.max(4, frame.brightness * 60)}px`,
                    opacity: 0.3 + (index / 30) * 0.7,
                  }}
                  title={`Frame ${frame.frameNumber}: ${Math.round(frame.brightness * 100)}% brightness`}
                />
              ))}
            </div>
            
            <div className="text-xs text-gray-300 mt-1">
              Brightness over time ({analysisHistory.length} frames analyzed)
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default AILivePreview;
