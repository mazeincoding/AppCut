"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ExportFormat, ExportQuality } from "@/types/export";
import { useExportStore } from "@/stores/export-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useProjectStore } from "@/stores/project-store";
import { useMediaStore } from "@/stores/media-store";
import { ExportCanvas, ExportCanvasRef } from "@/components/export-canvas";
import { ExportEngine } from "@/lib/export-engine";
import { useState, useEffect, useRef } from "react";
import { Download, X } from "lucide-react";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const { settings, progress, updateSettings, updateProgress, resetExport } = useExportStore();
  const { tracks, getTotalDuration } = useTimelineStore();
  const { activeProject } = useProjectStore();
  const { mediaItems } = useMediaStore();
  const canvasRef = useRef<ExportCanvasRef>(null);
  
  // Initialize local state from store
  const [format, setFormat] = useState<ExportFormat>(settings.format);
  const [quality, setQuality] = useState<ExportQuality>(settings.quality);
  const [filename, setFilename] = useState(settings.filename);
  
  // Use store state for export progress
  const isExporting = progress.isExporting;
  const exportProgress = progress.progress;
  const exportStatus = progress.status;
  
  // Update store when local state changes
  useEffect(() => {
    updateSettings({
      format,
      quality,
      filename,
      width: getResolution(quality).width,
      height: getResolution(quality).height,
    });
  }, [format, quality, filename, updateSettings]);

  const getResolution = (quality: ExportQuality) => {
    switch (quality) {
      case ExportQuality.HIGH:
        return { width: 1920, height: 1080, label: "1920x1080" };
      case ExportQuality.MEDIUM:
        return { width: 1280, height: 720, label: "1280x720" };
      case ExportQuality.LOW:
        return { width: 854, height: 480, label: "854x480" };
      default:
        return { width: 1920, height: 1080, label: "1920x1080" };
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

  const resolution = getResolution(quality);
  const estimatedSize = getEstimatedSize(quality);

  const handleExport = async () => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) {
      updateProgress({ isExporting: false });
      return;
    }

    updateProgress({ isExporting: true, progress: 0, status: "Initializing export..." });
    
    try {
      // Get all timeline elements from all tracks
      const timelineElements = tracks.flatMap(track => track.elements);
      
      // Create export engine
      const exportEngine = new ExportEngine({
        canvas,
        settings,
        timelineElements,
        mediaItems,
        duration: getTotalDuration(),
        fps: activeProject?.fps || 30,
        onProgress: (progress, status) => {
          updateProgress({ progress, status });
        },
        onError: (error) => {
          updateProgress({ isExporting: false, status: `Error: ${error}` });
        },
      });

      // Start export
      const videoBlob = await exportEngine.startExport();
      
      // Create download
      const fullFilename = `${filename}.${format}`;
      ExportEngine.createDownloadLink(videoBlob, fullFilename);
      
      updateProgress({ isExporting: false, progress: 100, status: "Export complete!" });
      setTimeout(() => onOpenChange(false), 1000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      updateProgress({ isExporting: false, status: `Error: ${errorMessage}` });
    }
  };

  const handleCancel = () => {
    if (!isExporting) {
      onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    // Prevent closing dialog during export
    if (!open && isExporting) {
      return;
    }
    onOpenChange(open);
  };

  const isValidFilename = (name: string) => {
    return name.trim().length > 0 && !/[<>:"/\\|?*]/.test(name);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
          <DialogDescription>
            Configure your export settings and render your video.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Format</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ExportFormat.MP4} id="mp4" />
                <Label htmlFor="mp4">MP4 (Recommended)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ExportFormat.WEBM} id="webm" />
                <Label htmlFor="webm">WebM</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ExportFormat.MOV} id="mov" />
                <Label htmlFor="mov">MOV</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <Label>Quality</Label>
            <RadioGroup value={quality} onValueChange={(value) => setQuality(value as ExportQuality)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ExportQuality.HIGH} id="1080p" />
                <Label htmlFor="1080p">1080p (High Quality)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ExportQuality.MEDIUM} id="720p" />
                <Label htmlFor="720p">720p (Medium Quality)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={ExportQuality.LOW} id="480p" />
                <Label htmlFor="480p">480p (Low Quality)</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <Label>Resolution & Size</Label>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Resolution:</span>
                <span className="text-sm">{resolution.label}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm font-medium">Est. size:</span>
                <span className="text-sm text-muted-foreground">{estimatedSize}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="filename">Filename</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Enter filename"
                className={!isValidFilename(filename) ? "border-red-500" : ""}
              />
              <span className="text-sm text-muted-foreground">.{format}</span>
            </div>
            {!isValidFilename(filename) && (
              <p className="text-sm text-red-500">
                Invalid filename. Avoid special characters: &lt; &gt; : " / \ | ? *
              </p>
            )}
          </div>
        </div>
        
        {isExporting && (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Export Progress</Label>
                <span className="text-sm text-muted-foreground">{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">{exportStatus}</p>
            </div>
          </div>
        )}
        
        <ExportCanvas
          ref={canvasRef}
          settings={settings}
          className="export-canvas"
        />
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isExporting}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || !isValidFilename(filename)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Export Video"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}