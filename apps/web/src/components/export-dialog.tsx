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
import { ExportEngine } from "@/lib/export-engine-optimized";
import { ExportEngineFactory, EngineType } from "@/lib/export-engine-factory";
import { WebCodecsCompatibility } from "@/lib/webcodecs-detector";
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
  
  // SAFETY: Engine selection state - implements mermaid diagram user preferences
  const [exportEngine, setExportEngine] = useState<EngineType>('auto');
  const [engineStatus, setEngineStatus] = useState<string>('Detecting capabilities...');
  const [engineCapabilities, setEngineCapabilities] = useState<any>(null);
  
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

  // SAFETY: Check engine capabilities on component mount - implements mermaid diagram
  useEffect(() => {
    const checkCapabilities = async () => {
      try {
        const capabilities = await ExportEngineFactory.getEngineCapabilities();
        setEngineCapabilities(capabilities);
        setEngineStatus(capabilities.statusMessage);
        
        // Auto-select recommended engine based on capabilities
        if (capabilities.recommendedEngine !== exportEngine) {
          setExportEngine(capabilities.recommendedEngine);
        }
      } catch (error) {
        console.warn('Failed to check engine capabilities:', error);
        setEngineStatus('⚠️ Using stable optimized engine');
        setExportEngine('stable');
      }
    };
    
    checkCapabilities();
  }, []);

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
        
        // If memory is critical, force stable engine
        if (fileSafetyWarning.level === 'error' && exportEngine !== 'stable') {
          setExportEngine('stable');
          setEngineStatus('⚠️ Memory critical - forced stable engine');
        }
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
  }, [quality, getTotalDuration, activeProject?.fps, resolution.width, resolution.height, exportEngine]);

  // Event handlers - implements mermaid diagram export flow
  const handleExport = async () => {
    if (!canvasRef.current?.getCanvas() || isExporting) return;

    try {
      updateProgress({ isExporting: true, progress: 0, status: "Initializing export..." });
      
      const canvas = canvasRef.current?.getCanvas();
      if (!canvas) {
        throw new Error("Canvas not available");
      }

      // SAFETY: Use factory to select engine based on user preference - implements mermaid diagram
      const engine = await ExportEngineFactory.createEngineByPreference(exportEngine, {
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
          
          // Show memory warnings and engine status
          if (status.includes('💾') || status.includes('⚠️') || status.includes('WebCodecs')) {
            setMemoryWarning(status);
            if (status.includes('WebCodecs')) {
              setMemoryLevel('info');
            } else {
              setMemoryLevel('warning');
            }
          }
        },
        onError: (error) => {
          updateProgress({ isExporting: false, status: `Error: ${error}` });
        },
      });

      const videoBlob = await engine.startExport();
      const fullFilename = `${filename}.${format}`;
      await ExportEngine.createDownloadLink(videoBlob, fullFilename);
      
      updateProgress({ isExporting: false, progress: 100, status: "Export complete!" });
      setTimeout(() => setDialogOpen(false), 1000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      updateProgress({ isExporting: false, status: `Error: ${errorMessage}` });
      
      // SAFETY: If auto mode fails, suggest stable fallback
      if (exportEngine === 'auto') {
        setMemoryWarning(`${errorMessage} - Try switching to "Stable Mode" in export options.`);
        setMemoryLevel('error');
      }
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
            <h2 className="text-sm font-semibold ml-[5px]">Export Video</h2>
            <p className="text-[13px] text-muted-foreground mt-1 ml-[5px]">Configure your export settings and render your video.</p>
          </div>
          <Button
            variant="text"
            size="icon"
            onClick={handleClose}
            className="h-9 w-9 rounded-lg bg-transparent hover:bg-transparent"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Export Button - Moved to top */}
        <div className="p-6 border-b border-border">
          <Button
            variant="shimmer"
            size="lg"
            onClick={handleExport}
            disabled={isExporting || !isValidFilename(filename) || memoryLevel === 'error' || timelineDuration === 0}
            className="w-full"
          >
            <Download style={{ width: '12px', height: '12px', marginRight: '8px' }} />
            {isExporting ? "Exporting..." : "Export Video"}
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 ml-[5px]">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-[13px] font-medium">Format</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ExportFormat.MP4} id="mp4" />
                <Label htmlFor="mp4" className="ml-2 text-[13px]">MP4 (Recommended)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ExportFormat.WEBM} id="webm" />
                <Label htmlFor="webm" className="ml-2 text-[13px]">WebM</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ExportFormat.MOV} id="mov" />
                <Label htmlFor="mov" className="ml-2 text-[13px]">MOV</Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Quality Selection */}
          <div className="space-y-3" style={{ marginTop: '10px' }}>
            <Label className="text-[13px] font-medium">Quality</Label>
            <RadioGroup value={quality} onValueChange={(value) => setQuality(value as ExportQuality)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ExportQuality.HIGH} id="1080p" />
                <Label htmlFor="1080p" className="ml-2 text-[13px]">1080p (High Quality)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ExportQuality.MEDIUM} id="720p" />
                <Label htmlFor="720p" className="ml-2 text-[13px]">720p (Medium Quality)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ExportQuality.LOW} id="480p" />
                <Label htmlFor="480p" className="ml-2 text-[13px]">480p (Low Quality)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* SAFETY: Export Engine Selection - implements mermaid diagram UI */}
          <div className="space-y-3" style={{ marginTop: '10px' }}>
            <Label className="text-[13px] font-medium">Export Engine</Label>
            <RadioGroup value={exportEngine} onValueChange={(value) => setExportEngine(value as EngineType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="auto" />
                <Label htmlFor="auto" className="text-[13px] ml-2">Auto (Recommended) - Best available</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="stable" id="stable" />
                <Label htmlFor="stable" className="text-[13px] ml-2">Stable Mode - Proven optimized</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="parallel" id="parallel" />
                <Label htmlFor="parallel" className="text-[13px] ml-2">Parallel Processing - 5-10x faster</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="webcodecs" id="webcodecs" />
                <Label htmlFor="webcodecs" className="text-[13px] ml-2">WebCodecs (Experimental) - Force new</Label>
              </div>
            </RadioGroup>
            <div className="p-3 bg-muted rounded-lg">
              <div className="space-y-1">
                <p className="text-[12px] font-medium">Engine Status:</p>
                <p className="text-[12px] text-muted-foreground">{engineStatus}</p>
                {engineCapabilities && (
                  <div className="text-[12px] text-muted-foreground space-y-1">
                    {engineCapabilities.memoryStatus && (
                      <div>Memory: {engineCapabilities.memoryStatus}</div>
                    )}
                    {engineCapabilities.hardwareAcceleration && (
                      <div className="text-green-600">✅ Hardware acceleration available</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resolution & Size Info */}
          <div className="space-y-3" style={{ marginTop: '10px' }}>
            <Label className="text-[13px] font-medium">Resolution & Size</Label>
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-medium">Resolution:</span>
                <span className="text-[12px]">{resolution.label}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-medium">Est. size:</span>
                <span className="text-[12px] text-muted-foreground">{estimatedSize}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-medium">Memory:</span>
                <span className="text-[12px] text-muted-foreground">{memoryMonitor.getMemorySummary()}</span>
              </div>
            </div>
          </div>
          
          {/* Filename Input */}
          <div className="space-y-3">
            <Label className="text-[13px] font-medium" htmlFor="filename">Filename</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="filename"
                value={filename}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilename(e.target.value)}
                placeholder="Enter filename"
                className={!isValidFilename(filename) ? "border-red-500" : ""}
              />
              <span className="text-[12px] text-muted-foreground">.{format}</span>
            </div>
            {!isValidFilename(filename) && (
              <p className="text-[12px] text-red-500">
                Invalid filename. Avoid special characters: &lt; &gt; : " / \ | ? *
              </p>
            )}
          </div>

          {/* Duration Info */}
          <div className="space-y-3" style={{ marginTop: '10px' }}>
            <Label className="text-[13px] font-medium">Export Duration</Label>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-medium">Timeline duration:</span>
                <span className="text-[12px]">{timelineDuration.toFixed(2)}s</span>
              </div>
              {timelineDuration === 0 && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-[12px]">
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
              memoryLevel === 'warning' ? 'border-red-500 bg-red-50 dark:bg-red-950' :
              'border-blue-500 bg-blue-50 dark:bg-blue-950'
            }`}>
              <div className="flex items-center space-x-2">
                {memoryLevel === 'error' || memoryLevel === 'critical' ? (
                  <AlertTriangle className={`h-4 w-4 ${
                    memoryLevel === 'error' ? 'text-red-600 dark:text-red-400' :
                    'text-orange-600 dark:text-orange-400'
                  }`} />
                ) : memoryLevel === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                ) : (
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                )}
                <AlertDescription className={`text-[13px] ${
                  memoryLevel === 'error' ? 'text-red-800 dark:text-red-200' :
                  memoryLevel === 'critical' ? 'text-orange-800 dark:text-orange-200' :
                  memoryLevel === 'warning' ? 'text-red-800 dark:text-red-200' :
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
                  <Label className="text-[13px] font-medium">Export Progress</Label>
                  <span className="text-[12px] text-muted-foreground">{exportProgress.toFixed(0)}%</span>
                </div>
                <Progress value={exportProgress} className="w-full" />
                <p className="text-[12px] text-muted-foreground">{exportStatus}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-border p-6">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isExporting}
            className="w-full h-11 text-[13px] font-medium !bg-transparent hover:!bg-transparent"
          >
            <X className="h-4 w-4 mr-2.5" />
            Cancel
          </Button>
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