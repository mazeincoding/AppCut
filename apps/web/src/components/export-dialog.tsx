"use client";

import React, { useState, useEffect, useRef } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, X, AlertTriangle, Info } from "lucide-react";
import { ExportFormat, ExportQuality } from "@/types/export";
import { TimelineElement } from "@/types/timeline";
import { useExportStore } from "@/stores/export-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useProjectStore } from "@/stores/project-store";
import { useMediaStore } from "@/stores/media-store";
import { ExportCanvas, ExportCanvasRef } from "@/components/export-canvas";
import { ExportEngine } from "@/lib/export-engine";
import { memoryMonitor, getMemoryRecommendation, estimateVideoMemoryUsage } from "@/lib/memory-monitor";

interface ExportDialogProps {
  // No props needed - uses global state
}

export function ExportDialog() {
  const { settings, progress, updateSettings, updateProgress, resetExport, isDialogOpen, setDialogOpen } = useExportStore();
  const { tracks, getTotalDuration } = useTimelineStore();
  const { activeProject } = useProjectStore();
  const { mediaItems } = useMediaStore();
  const canvasRef = useRef<ExportCanvasRef>(null);
  
  // Local state
  const [format, setFormat] = useState<ExportFormat>(settings.format);
  const [quality, setQuality] = useState<ExportQuality>(settings.quality);
  const [filename, setFilename] = useState(settings.filename);
  const [memoryWarning, setMemoryWarning] = useState<string | null>(null);
  const [memoryLevel, setMemoryLevel] = useState<'info' | 'warning' | 'critical' | 'error'>('info');
  
  // Export state
  const isExporting = progress.isExporting;
  const exportProgress = progress.progress;
  const exportStatus = progress.status;

  // Helper functions
  const getResolution = (quality: ExportQuality) => {
    switch (quality) {
      case ExportQuality.HIGH:
        return { width: 1920, height: 1080, label: "1920×1080" };
      case ExportQuality.MEDIUM:
        return { width: 1280, height: 720, label: "1280×720" };
      case ExportQuality.LOW:
        return { width: 854, height: 480, label: "854×480" };
      default:
        return { width: 1920, height: 1080, label: "1920×1080" };
    }
  };

  const getEstimatedSize = (quality: ExportQuality) => {
    switch (quality) {
      case ExportQuality.HIGH:
        return "~50-100 MB/min";
      case ExportQuality.MEDIUM:
        return "~25-50 MB/min";
      case ExportQuality.LOW:
        return "~15-25 MB/min";
      default:
        return "~50-100 MB/min";
    }
  };

  const isValidFilename = (name: string) => {
    return name.trim().length > 0 && !/[<>:"/\\|?*]/.test(name);
  };

  // Computed values
  const resolution = getResolution(quality);
  const estimatedSize = getEstimatedSize(quality);
  const timelineDuration = getTotalDuration();

  // Update store when local state changes
  useEffect(() => {
    updateSettings({
      format,
      quality,
      filename,
      width: resolution.width,
      height: resolution.height,
    });
  }, [format, quality, filename, resolution.width, resolution.height, updateSettings]);

  // Memory check effect
  useEffect(() => {
    const checkMemoryUsage = () => {
      const duration = getTotalDuration();
      const fps = activeProject?.fps || 30;
      
      const estimatedMemoryBytes = estimateVideoMemoryUsage(
        resolution.width,
        resolution.height,
        duration,
        fps
      );
      
      const fileSafetyWarning = memoryMonitor.checkFileSafety(estimatedMemoryBytes);
      
      if (fileSafetyWarning) {
        setMemoryWarning(fileSafetyWarning.message);
        setMemoryLevel(fileSafetyWarning.level);
      } else {
        const recommendation = getMemoryRecommendation(estimatedMemoryBytes);
        setMemoryWarning(recommendation);
        // Set level based on message content
        if (recommendation.includes('Consider using FFmpeg')) {
          setMemoryLevel('error');
        } else if (recommendation.includes('Monitor memory')) {
          setMemoryLevel('warning');
        } else if (recommendation.includes('acceptable')) {
          setMemoryLevel('info');
        } else {
          setMemoryLevel('info');
        }
      }
    };
    
    checkMemoryUsage();
  }, [quality, getTotalDuration, activeProject?.fps, resolution.width, resolution.height]);

  // Event handlers
  const handleExport = async () => {
    if (!canvasRef.current?.getCanvas() || isExporting) return;

    try {
      updateProgress({ isExporting: true, progress: 0, status: "Initializing export..." });
      
      const canvas = canvasRef.current?.getCanvas();
      if (!canvas) {
        throw new Error("Canvas not available");
      }
      
      const exportEngine = new ExportEngine({
        canvas: canvas,
        settings: {
          ...settings,
          format,
          quality,
          filename,
          width: resolution.width,
          height: resolution.height,
        },
        timelineElements: tracks.flatMap(track => track.elements),
        mediaItems,
        duration: getTotalDuration(),
        fps: activeProject?.fps || 30,
        onProgress: (progress, status) => {
          updateProgress({ isExporting: true, progress, status });
          
          if (status.includes('💾') || status.includes('⚠️')) {
            setMemoryWarning(status);
            setMemoryLevel('warning');
          }
        },
        onError: (error) => {
          updateProgress({ isExporting: false, status: `Error: ${error}` });
        },
      });

      const videoBlob = await exportEngine.startExport();
      const fullFilename = `${filename}.${format}`;
      ExportEngine.createDownloadLink(videoBlob, fullFilename);
      
      updateProgress({ isExporting: false, progress: 100, status: "Export complete!" });
      setTimeout(() => setDialogOpen(false), 1000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      updateProgress({ isExporting: false, status: `Error: ${errorMessage}` });
    }
  };

  const handleCancel = () => {
    if (!isExporting) {
      setDialogOpen(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      setDialogOpen(false);
    }
  };

  return (
    <div className="h-full bg-background rounded-xl">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold">Export Video</h2>
            <p className="text-sm text-muted-foreground mt-1">Configure your export settings and render your video.</p>
          </div>
          <Button
            variant="text"
            size="icon"
            onClick={handleClose}
            className="h-9 w-9 rounded-lg"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Format</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ExportFormat.MP4} id="mp4" style={{ width: '12px', height: '12px' }} />
                <Label htmlFor="mp4">MP4 (Recommended)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ExportFormat.WEBM} id="webm" style={{ width: '12px', height: '12px' }} />
                <Label htmlFor="webm">WebM</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ExportFormat.MOV} id="mov" style={{ width: '12px', height: '12px' }} />
                <Label htmlFor="mov">MOV</Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Quality Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quality</Label>
            <RadioGroup value={quality} onValueChange={(value) => setQuality(value as ExportQuality)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ExportQuality.HIGH} id="1080p" style={{ width: '12px', height: '12px' }} />
                <Label htmlFor="1080p">1080p (High Quality)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ExportQuality.MEDIUM} id="720p" style={{ width: '12px', height: '12px' }} />
                <Label htmlFor="720p">720p (Medium Quality)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ExportQuality.LOW} id="480p" style={{ width: '12px', height: '12px' }} />
                <Label htmlFor="480p">480p (Low Quality)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Resolution & Size Info */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Resolution & Size</Label>
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">Resolution:</span>
                <span className="text-xs">{resolution.label}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">Est. size:</span>
                <span className="text-xs text-muted-foreground">{estimatedSize}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">Memory:</span>
                <span className="text-xs text-muted-foreground">{memoryMonitor.getMemorySummary()}</span>
              </div>
            </div>
          </div>
          
          {/* Filename Input */}
          <div className="space-y-3">
            <Label className="text-sm font-medium" htmlFor="filename">Filename</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="filename"
                value={filename}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilename(e.target.value)}
                placeholder="Enter filename"
                className={!isValidFilename(filename) ? "border-red-500" : ""}
              />
              <span className="text-xs text-muted-foreground">.{format}</span>
            </div>
            {!isValidFilename(filename) && (
              <p className="text-xs text-red-500">
                Invalid filename. Avoid special characters: &lt; &gt; : " / \ | ? *
              </p>
            )}
          </div>

          {/* Duration Info */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Duration</Label>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">Timeline duration:</span>
                <span className="text-xs">{timelineDuration.toFixed(2)}s</span>
              </div>
              {timelineDuration === 0 && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                  <div className="flex items-start space-x-2">
                    <span className="text-red-600">❌</span>
                    <div className="text-red-800">
                      <div className="font-medium">No Content</div>
                      <div>Your timeline is empty. Add some media files to export a video.</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Memory Warning */}
          {memoryWarning && (
            <Alert className={`${
              memoryLevel === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-950' :
              memoryLevel === 'critical' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' :
              memoryLevel === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' :
              'border-blue-500 bg-blue-50 dark:bg-blue-950'
            }`}>
              <div className="flex items-center space-x-2">
                {memoryLevel === 'error' || memoryLevel === 'critical' ? (
                  <AlertTriangle className={`h-4 w-4 ${
                    memoryLevel === 'error' ? 'text-red-600 dark:text-red-400' :
                    'text-orange-600 dark:text-orange-400'
                  }`} />
                ) : memoryLevel === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                )}
                <AlertDescription className={`text-sm ${
                  memoryLevel === 'error' ? 'text-red-800 dark:text-red-200' :
                  memoryLevel === 'critical' ? 'text-orange-800 dark:text-orange-200' :
                  memoryLevel === 'warning' ? 'text-yellow-800 dark:text-yellow-200' :
                  'text-blue-800 dark:text-blue-200'
                }`}>
                  {memoryWarning}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Export Progress */}
          {isExporting && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Export Progress</Label>
                  <span className="text-xs text-muted-foreground">{exportProgress.toFixed(0)}%</span>
                </div>
                <Progress value={exportProgress} className="w-full" />
                <p className="text-xs text-muted-foreground">{exportStatus}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-border p-6">
          <div className="flex flex-col gap-3">
            <Button
              variant="shimmer"
              size="lg"
              onClick={handleExport}
              disabled={isExporting || !isValidFilename(filename) || memoryLevel === 'error' || timelineDuration === 0}
              className="w-full"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export Video"}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isExporting}
              className="w-full h-11 text-sm font-medium"
            >
              <X className="h-4 w-4 mr-2.5" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
      
      {/* Hidden Export Canvas */}
      <ExportCanvas
        ref={canvasRef}
        settings={settings}
        className="export-canvas"
      />
    </div>
  );
}