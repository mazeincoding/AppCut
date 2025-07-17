"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Settings, Bug, ChevronDown, ChevronUp, Play, Square, AlertCircle } from "lucide-react";
import { VideoExportService, ExportSettings, ExportProgress, ExportProject } from "@/lib/export/video-export-service";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useEditorStore } from "@/stores/editor-store";
import { useProjectStore } from "@/stores/project-store";
import { toast } from "sonner";

interface ExportDialogProps {
  children: React.ReactNode;
}

export function ExportDialog({ children }: ExportDialogProps) {
  const { tracks, getTotalDuration } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { canvasSize } = useEditorStore();
  const { activeProject } = useProjectStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    canvasSize: { width: 1920, height: 1080 },
    fps: activeProject?.fps || 30,
    quality: 'medium',
    format: 'mp4'
  });
  const [showDebugData, setShowDebugData] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [showLogs, setShowLogs] = useState(false);
  
  const exportServiceRef = useRef<VideoExportService | null>(null);
  const outputBlobRef = useRef<Blob | null>(null);

  // Reset export state when timeline changes
  useEffect(() => {
    if (isExporting || progress?.phase === 'completed') {
      setIsExporting(false);
      setProgress(null);
      outputBlobRef.current = null;
      if (exportServiceRef.current) {
        exportServiceRef.current.terminate();
        exportServiceRef.current = null;
      }
    }
  }, [tracks, mediaItems]); // Reset when timeline or media changes

  const handleExport = async () => {
    if (!activeProject) {
      toast.error("No active project to export");
      return;
    }

    setIsExporting(true);
    setProgress(null);
    outputBlobRef.current = null;

    try {
      const exportService = new VideoExportService();
      exportServiceRef.current = exportService;

      const exportProject: ExportProject = {
        tracks,
        mediaItems,
        settings: {
          ...exportSettings,
          canvasSize: canvasSize,
          backgroundColor: activeProject?.backgroundColor
        },
        duration: getTotalDuration()
      };

      // Generate debug data
      const debugInfo = exportService.getDebugData(exportProject);
      setDebugData(debugInfo);

      // Initialize with progress callback
      await exportService.initialize((progressUpdate: ExportProgress) => {
        setProgress(progressUpdate);
      });

      // Start export
      const blob = await exportService.exportVideo(exportProject);
      outputBlobRef.current = blob;

      toast.success("Video exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(`Export failed: ${error}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancelExport = () => {
    if (exportServiceRef.current) {
      exportServiceRef.current.terminate();
      exportServiceRef.current = null;
    }
    setIsExporting(false);
    setProgress(null);
  };

  const handleDownload = () => {
    if (outputBlobRef.current) {
      const url = URL.createObjectURL(outputBlobRef.current);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeProject?.name || 'video'}.${exportSettings.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getPhaseIcon = (phase: ExportProgress['phase']) => {
    switch (phase) {
      case 'initializing': return <Settings className="w-4 h-4 animate-spin" />;
      case 'processing': return <Play className="w-4 h-4" />;
      case 'rendering': return <Play className="w-4 h-4" />;
      case 'finalizing': return <Settings className="w-4 h-4 animate-spin" />;
      case 'completed': return <Download className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Square className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 z-[9999]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg font-semibold">Export Video</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="settings" className="w-full flex flex-col">
          <div className="flex flex-col max-h-[calc(85vh-120px)]">
            <div className="px-6 pb-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="settings" className="text-sm">Settings</TabsTrigger>
                <TabsTrigger value="export" className="text-sm">Export</TabsTrigger>
                <TabsTrigger value="debug" className="text-sm">Debug</TabsTrigger>
              </TabsList>
            </div>
          
          <ScrollArea className="flex-1">
            <TabsContent value="settings" className="px-6 pb-6 mt-0">
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Export Settings</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Frame Rate</Label>
                      <Select
                        value={exportSettings.fps.toString()}
                        onValueChange={(value) => setExportSettings(prev => ({ ...prev, fps: parseInt(value) }))}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                          <SelectItem value="24">24 FPS</SelectItem>
                          <SelectItem value="30">30 FPS</SelectItem>
                          <SelectItem value="60">60 FPS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quality</Label>
                      <Select
                        value={exportSettings.quality}
                        onValueChange={(value: 'low' | 'medium' | 'high') => setExportSettings(prev => ({ ...prev, quality: value }))}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                          <SelectItem value="low">Low (Fast)</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High (Slow)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Format</Label>
                    <Select
                      value={exportSettings.format}
                      onValueChange={(value: 'mp4' | 'webm' | 'mov') => setExportSettings(prev => ({ ...prev, format: value }))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[10000]">
                        <SelectItem value="mp4">MP4 (H.264)</SelectItem>
                        <SelectItem value="webm">WebM</SelectItem>
                        <SelectItem value="mov">MOV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="pt-4 border-t space-y-3">
                  <h3 className="text-sm font-medium">Project Info</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Resolution:</span>
                      <span className="font-mono">{canvasSize.width} × {canvasSize.height}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-mono">{getTotalDuration().toFixed(2)}s</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="export" className="px-6 pb-6 mt-0">
              <div className="space-y-6">
                {!isExporting && !progress && (
                  <div className="text-center py-12">
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">Ready to export your video</div>
                      <Button onClick={handleExport} size="lg" className="gap-2">
                        <Play className="w-4 h-4" />
                        Start Export
                      </Button>
                    </div>
                  </div>
                )}
                
                {isExporting && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {progress && getPhaseIcon(progress.phase)}
                        <div>
                          <div className="text-sm font-medium">
                            {progress?.phase
                              ? progress.phase.charAt(0).toUpperCase() + progress.phase.slice(1)
                              : 'Starting...'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {progress?.message || 'Preparing export...'}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleCancelExport}>
                        Cancel
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{progress?.progress || 0}%</span>
                      </div>
                      <Progress value={progress?.progress || 0} className="h-2" />
                    </div>
                  </div>
                )}
                
                {progress?.phase === 'completed' && outputBlobRef.current && (
                  <div className="text-center py-8">
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">Export completed successfully!</div>
                      <Button onClick={handleDownload} size="lg" className="gap-2">
                        <Download className="w-4 h-4" />
                        Download Video
                      </Button>
                    </div>
                  </div>
                )}
                
                {progress?.phase === 'error' && (
                  <div className="text-center py-8">
                    <div className="space-y-4">
                      <div className="text-sm text-red-500">Export failed. Check debug logs for details.</div>
                      <Button onClick={handleExport} variant="outline">
                        Retry Export
                      </Button>
                    </div>
                  </div>
                )}

                {/* Export Logs within Export Tab */}
                {progress?.logs && progress.logs.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <Collapsible open={showLogs} onOpenChange={setShowLogs}>
                      <CollapsibleTrigger asChild>
                        <Button className="w-full justify-between h-8 px-2 text-sm">
                          <span>Export Logs ({progress.logs.length})</span>
                          {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <ScrollArea className="h-32 w-full mt-2 border rounded-md">
                          <div className="p-3 space-y-1 text-xs font-mono">
                            {progress.logs.map((log, index) => (
                              <div key={index} className="text-muted-foreground break-all">
                                {log}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="debug" className="px-6 pb-6 mt-0">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  <h3 className="text-sm font-medium">Debug Information</h3>
                </div>
                
                <Button 
                  onClick={() => {
                    if (!activeProject) return;
                    const exportService = new VideoExportService();
                    const exportProject: ExportProject = {
                      tracks,
                      mediaItems,
                      settings: { 
                        ...exportSettings, 
                        canvasSize,
                        backgroundColor: activeProject?.backgroundColor
                      },
                      duration: getTotalDuration()
                    };
                    setDebugData(exportService.getDebugData(exportProject));
                    setShowDebugData(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Bug className="w-4 h-4" />
                  Generate Debug Data
                </Button>
                
                {debugData && (
                  <Collapsible open={showDebugData} onOpenChange={setShowDebugData}>
                    <CollapsibleTrigger asChild>
                      <Button className="w-full justify-between h-8 px-2 text-sm">
                        <span>Project Debug Data</span>
                        {showDebugData ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ScrollArea className="h-80 w-full mt-2 border rounded-md">
                        <pre className="text-xs font-mono p-3 whitespace-pre-wrap break-words">
                          {JSON.stringify(debugData, null, 2)}
                        </pre>
                      </ScrollArea>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}