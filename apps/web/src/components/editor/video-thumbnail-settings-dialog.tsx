"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  getVideoThumbnailCacheStats,
  clearAllVideoThumbnails,
} from "@/lib/video-thumbnail-utils";
import {
  videoThumbnailPerformanceMonitor,
  type VideoThumbnailSettings,
} from "@/lib/video-thumbnail-settings";
import { Film, BarChart3, Trash2, Settings } from "lucide-react";
import { toast } from "sonner";

interface VideoThumbnailSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VideoThumbnailSettings;
  onUpdateSetting: <K extends keyof VideoThumbnailSettings>(
    key: K,
    value: VideoThumbnailSettings[K]
  ) => void;
}

export function VideoThumbnailSettingsDialog({
  isOpen,
  onClose,
  settings,
  onUpdateSetting,
}: VideoThumbnailSettingsDialogProps) {
  const [cacheStats, setCacheStats] = useState(getVideoThumbnailCacheStats());
  const [performanceStats, setPerformanceStats] = useState(
    videoThumbnailPerformanceMonitor.getStats()
  );

  // Update stats periodically when dialog is open
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCacheStats(getVideoThumbnailCacheStats());
      setPerformanceStats(videoThumbnailPerformanceMonitor.getStats());
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleClearCache = async () => {
    await clearAllVideoThumbnails();
    setCacheStats(getVideoThumbnailCacheStats());
    videoThumbnailPerformanceMonitor.reset();
    setPerformanceStats(videoThumbnailPerformanceMonitor.getStats());
    toast.success("Video thumbnail cache cleared");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Video Thumbnail Settings
          </DialogTitle>
          <DialogDescription>
            Configure timeline video thumbnails for optimal performance and
            visual quality. These settings follow professional video editing
            standards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-md ${settings.enabled ? "bg-primary/10" : "bg-muted"}`}
              >
                <Film
                  className={`h-4 w-4 ${settings.enabled ? "text-primary" : "text-muted-foreground"}`}
                />
              </div>
              <div>
                <div className="font-medium">Timeline Video Thumbnails</div>
                <div className="text-sm text-muted-foreground">
                  Show continuous video frames in timeline
                </div>
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => onUpdateSetting("enabled", checked)}
            />
          </div>

          {/* Quality Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <h3 className="font-medium">Quality Settings</h3>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Thumbnail Quality</label>
              <Select
                value={settings.quality}
                onValueChange={(value: VideoThumbnailSettings["quality"]) =>
                  onUpdateSetting("quality", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Quality (120×90)</SelectItem>
                  <SelectItem value="medium">
                    Medium Quality (160×120)
                  </SelectItem>
                  <SelectItem value="high">High Quality (240×180)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Max Cache Size</label>
                <Badge variant="outline">
                  {settings.maxCacheSize} thumbnails
                </Badge>
              </div>
              <Slider
                value={[settings.maxCacheSize]}
                onValueChange={([value]) =>
                  onUpdateSetting("maxCacheSize", value)
                }
                min={100}
                max={1000}
                step={50}
                className="w-full"
              />
            </div>
          </div>

          {/* Performance Stats */}
          <div className="space-y-4">
            <Separator />
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <h3 className="font-medium">Performance & Cache</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 p-3 rounded-lg text-center">
                <div className="text-lg font-semibold">
                  {cacheStats.totalThumbnails}
                </div>
                <div className="text-xs text-muted-foreground">Cached</div>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg text-center">
                <div className="text-lg font-semibold">
                  {cacheStats.cacheUtilization < 1 &&
                  cacheStats.cacheUtilization > 0
                    ? cacheStats.cacheUtilization.toFixed(1)
                    : cacheStats.cacheUtilization.toFixed(0)}
                  %
                </div>
                <div className="text-xs text-muted-foreground">Usage</div>
              </div>
            </div>

            {/* Clear Cache Button */}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearCache}
              disabled={cacheStats.totalThumbnails === 0}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cache ({cacheStats.totalThumbnails} thumbnails)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
