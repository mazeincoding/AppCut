"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Progress } from "../ui/progress";
import { Checkbox } from "../ui/checkbox";
import { 
  VideoExporter, 
  isWebCodecsSupported, 
  getExportPresets,
  debugLogger,
  type OpenCutExportOptions,
  type ExportProgress 
} from "@opencut/video-export";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { useEditorStore } from "@/stores/editor-store";
import { toast } from "sonner";
import { Download, Settings, AlertTriangle, CheckCircle } from "lucide-react";

interface ExportState {
  isExporting: boolean;
  progress: ExportProgress | null;
  error: string | null;
  completed: boolean;
}

interface DebugLogState {
  logs: string[];
  showDebugLogs: boolean;
}

// Debug Log Viewer Component
function DebugLogViewer({ logs, isExporting }: { logs: string[]; isExporting: boolean }) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added (only during export)
  useEffect(() => {
    if (logContainerRef.current && isExporting) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isExporting]);

  // Allow scroll to top when export is done
  const scrollToTop = () => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  };

  return (
    <div className="w-full max-w-full border border-gray-300 rounded-md overflow-hidden bg-black">
      <div className="flex justify-between items-center p-2 bg-gray-800 border-b border-gray-600 min-w-0">
        <span className="text-green-400 text-xs font-mono truncate">Debug Console</span>
        {!isExporting && logs.length > 0 && (
          <button
            onClick={scrollToTop}
            className="text-green-400 hover:text-green-300 text-xs px-2 py-1 rounded border border-green-400 hover:border-green-300 ml-2 flex-shrink-0"
          >
            ↑ Top
          </button>
        )}
      </div>
      <div
        ref={logContainerRef}
        className="bg-black text-green-400 p-3 overflow-auto text-xs font-mono leading-tight"
        style={{ 
          height: '200px',
          maxWidth: '100%',
          scrollbarWidth: 'thin', 
          scrollbarColor: '#4B5563 #1F2937' 
        }}
      >
        {logs.length === 0 ? (
          <div className="text-gray-500">No debug logs yet...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-1 whitespace-pre-wrap break-all word-break max-w-full">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Helper function to format time duration
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.round(seconds % 60);
    
    if (minutes === 0 && remainingSeconds === 0) {
      return `${hours}h`;
    } else if (remainingSeconds === 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }
  }
}

export function VideoExportDialog({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("1080p_medium");
  const [customSettings, setCustomSettings] = useState<Partial<OpenCutExportOptions>>({});
  const [useCustomSettings, setUseCustomSettings] = useState(false);
  const [currentExporter, setCurrentExporter] = useState<VideoExporter | null>(null);
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    progress: null,
    error: null,
    completed: false
  });
  const [debugState, setDebugState] = useState<DebugLogState>({
    logs: [],
    showDebugLogs: false
  });

  const { tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { activeProject } = useProjectStore();
  const { canvasSize } = useEditorStore();

  const presets = getExportPresets();
  const isSupported = isWebCodecsSupported();

  // Subscribe to debug logs
  useEffect(() => {
    const unsubscribe = debugLogger.addListener((logs) => {
      setDebugState(prev => ({ ...prev, logs }));
    });
    return unsubscribe;
  }, []);

  const handleExport = useCallback(async () => {
    if (!activeProject || !isSupported) {
      toast.error("Export not available");
      return;
    }

    // Prevent starting new export if one is already in progress
    if (exportState.isExporting) {
      toast.error("Export already in progress");
      return;
    }

    if (tracks.length === 0) {
      toast.error("No tracks found - please add some media or text to your timeline");
      return;
    }

    const hasElements = tracks.some(track => track.elements.length > 0);
    if (!hasElements) {
      toast.error("No elements found - please add some media or text to your timeline");
      return;
    }

    setExportState({
      isExporting: true,
      progress: null,
      error: null,
      completed: false
    });

    try {
      const exporter = new VideoExporter();
      setCurrentExporter(exporter);
      
      // Prepare export options
      const baseOptions = useCustomSettings 
        ? customSettings 
        : presets[selectedPreset];

      const exportOptions: OpenCutExportOptions = {
        ...baseOptions,
        fileName: `${activeProject.name}.mp4`,
        onProgress: (progress) => {
          setExportState(prev => ({
            ...prev,
            progress
          }));
        },
        onError: (error) => {
          console.error('Export error in dialog:', error);
          setCurrentExporter(null);
          setExportState(prev => ({
            ...prev,
            error: error.message,
            isExporting: false
          }));
          toast.error(`Export failed: ${error.message}`);
        },
        onComplete: (filePath) => {
          setCurrentExporter(null);
          setExportState(prev => ({
            ...prev,
            completed: true,
            isExporting: false
          }));
          toast.success("Video exported successfully!");
        }
      };

      // Start export
      await exporter.exportTimeline(
        tracks,
        mediaItems,
        {
          width: canvasSize.width,
          height: canvasSize.height,
          fps: activeProject.fps || 30
        },
        exportOptions
      );

    } catch (error) {
      console.error('Export catch block error:', error);
      setCurrentExporter(null);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setExportState({
        isExporting: false,
        progress: null,
        error: errorMessage,
        completed: false
      });
      toast.error(`Export failed: ${errorMessage}`);
    }
  }, [
    activeProject,
    tracks,
    mediaItems,
    canvasSize,
    isSupported,
    useCustomSettings,
    customSettings,
    selectedPreset,
    presets,
    exportState.isExporting
  ]);

  const handleAbort = useCallback(async () => {
    const shouldCancel = window.confirm(
      "Are you sure you want to cancel the export?"
    );
    
    if (!shouldCancel) return;
    
    if (currentExporter) {
      try {
        await currentExporter.abort();
        toast.success("Export cancelled");
      } catch (error) {
        console.error('Error aborting export:', error);
        toast.error("Failed to cancel export");
      }
      setCurrentExporter(null);
    }
    
    setExportState({
      isExporting: false,
      progress: null,
      error: null,
      completed: false
    });
  }, [currentExporter]);

  const resetDialog = useCallback(() => {
    // Only reset if not currently exporting
    if (!exportState.isExporting) {
      setCurrentExporter(null);
      setExportState({
        isExporting: false,
        progress: null,
        error: null,
        completed: false
      });
    }
  }, [exportState.isExporting]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open && exportState.isExporting) {
      // Show confirmation dialog when trying to close during export
      const shouldClose = window.confirm(
        "Export is currently in progress. Are you sure you want to close and cancel the export?"
      );
      
      if (shouldClose) {
        handleAbort();
        resetDialog();
        setIsOpen(false);
      }
      return;
    }
    
    if (!open && !exportState.isExporting) {
      resetDialog();
    }
    setIsOpen(open);
  }, [resetDialog, exportState.isExporting, handleAbort]);

  if (!isSupported) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Export Not Supported
            </DialogTitle>
            <DialogDescription>
              Your browser doesn't support WebCodecs-based video export. 
              Please use Chrome 94+ or Edge 94+ for video export functionality.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" style={{ zIndex: 100 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Video
          </DialogTitle>
          <DialogDescription>
            Export your timeline as an MP4 video file
          </DialogDescription>
        </DialogHeader>

        {exportState.isExporting && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {exportState.progress?.stage === 'initializing' && 'Initializing export...'}
                  {exportState.progress?.stage === 'processing' && 'Processing video...'}
                  {exportState.progress?.stage === 'finalizing' && 'Finalizing export...'}
                  {exportState.progress?.stage === 'complete' && 'Export complete!'}
                </span>
                {exportState.progress && (
                  <span>{Math.round(exportState.progress.percentage)}%</span>
                )}
              </div>
              <Progress 
                value={exportState.progress?.percentage || 0} 
                className="h-2"
              />
              {exportState.progress?.estimatedTimeRemaining && (
                <p className="text-xs text-muted-foreground">
                  Estimated time remaining: {formatTime(exportState.progress.estimatedTimeRemaining)}
                </p>
              )}
            </div>
            
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleAbort}>
                Cancel Export
              </Button>
            </div>
          </div>
        )}

        {exportState.completed && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>Video exported successfully!</span>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setIsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}

        {exportState.error && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Export failed: {exportState.error}</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetDialog}>
                Try Again
              </Button>
              <Button onClick={() => setIsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}

        {!exportState.isExporting && !exportState.completed && !exportState.error && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="custom-settings"
                  checked={useCustomSettings}
                  onCheckedChange={(checked) => setUseCustomSettings(!!checked)}
                />
                <Label htmlFor="custom-settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Use custom settings
                </Label>
              </div>

              {!useCustomSettings ? (
                <div className="space-y-2">
                  <Label htmlFor="preset">Quality Preset</Label>
                  <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ zIndex: 200 }}>
                      <SelectItem value="1080p_high">1080p High (10 Mbps)</SelectItem>
                      <SelectItem value="1080p_medium">1080p Medium (5 Mbps)</SelectItem>
                      <SelectItem value="1080p_low">1080p Low (2.5 Mbps)</SelectItem>
                      <SelectItem value="720p_high">720p High (5 Mbps)</SelectItem>
                      <SelectItem value="720p_medium">720p Medium (2.5 Mbps)</SelectItem>
                      <SelectItem value="4k_high">4K High (40 Mbps)</SelectItem>
                      <SelectItem value="4k_medium">4K Medium (20 Mbps)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="resolution">Resolution</Label>
                      <Select
                        value={customSettings.resolution?.toString() || "1"}
                        onValueChange={(value) => 
                          setCustomSettings(prev => ({ ...prev, resolution: parseFloat(value) }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent style={{ zIndex: 200 }}>
                          <SelectItem value="0.67">720p</SelectItem>
                          <SelectItem value="1">1080p</SelectItem>
                          <SelectItem value="2">4K</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="fps">Frame Rate</Label>
                      <Select
                        value={customSettings.fps?.toString() || "30"}
                        onValueChange={(value) => 
                          setCustomSettings(prev => ({ ...prev, fps: parseInt(value) }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent style={{ zIndex: 200 }}>
                          <SelectItem value="24">24 fps</SelectItem>
                          <SelectItem value="30">30 fps</SelectItem>
                          <SelectItem value="60">60 fps</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="video-bitrate">Video Bitrate (Mbps)</Label>
                      <Input
                        id="video-bitrate"
                        type="number"
                        min="1"
                        max="100"
                        step="0.5"
                        value={customSettings.videoBitrate || 10}
                        onChange={(e) => 
                          setCustomSettings(prev => ({ 
                            ...prev, 
                            videoBitrate: parseFloat(e.target.value) 
                          }))
                        }
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="audio-bitrate">Audio Bitrate (kbps)</Label>
                      <Input
                        id="audio-bitrate"
                        type="number"
                        min="64"
                        max="320"
                        step="32"
                        value={customSettings.audioBitrate || 128}
                        onChange={(e) => 
                          setCustomSettings(prev => ({ 
                            ...prev, 
                            audioBitrate: parseInt(e.target.value) 
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hardware-acceleration"
                      checked={customSettings.hardwareAcceleration !== false}
                      onCheckedChange={(checked) =>
                        setCustomSettings(prev => ({ 
                          ...prev, 
                          hardwareAcceleration: !!checked 
                        }))
                      }
                    />
                    <Label htmlFor="hardware-acceleration">
                      Enable hardware acceleration
                    </Label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleExport} 
                disabled={!activeProject || tracks.length === 0 || exportState.isExporting}
              >
                {exportState.isExporting ? 'Exporting...' : 'Export Video'}
              </Button>
            </div>
          </div>
        )}

        {/* Debug Logs Section - Always Visible */}
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">Debug Logs</Label>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDebugState(prev => ({ ...prev, showDebugLogs: !prev.showDebugLogs }))}
            >
              {debugState.showDebugLogs ? 'Hide' : 'Show'}
            </Button>
          </div>
          
          {debugState.showDebugLogs && (
            <DebugLogViewer logs={debugState.logs} isExporting={exportState.isExporting} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}