import { useState } from "react";
import { SceneExporter } from "@/lib/renderer/scene-exporter";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { buildScene } from "@/lib/renderer/build-scene";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

function ExportProgress({ progress }: { progress: number }) {
  return (
    <div className="w-full flex flex-col text-sm text-muted-foreground">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">Rendering video...</div>
        <div className="text-xs text-muted-foreground">
          {Math.round(progress * 100)}%
        </div>
      </div>
      <Progress value={progress * 100} className="mt-2" />
    </div>
  );
}

export function ExportDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [exporter, setExporter] = useState<SceneExporter | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (isExporting) {
      return;
    }

    setIsOpen(open);
    setError(null);
    setProgress(0);
  };

  const handleExport = async () => {
    setProgress(0);
    setIsExporting(true);

    const project = useProjectStore.getState().activeProject;

    const width = project?.canvasSize.width ?? 640;
    const height = project?.canvasSize.height ?? 720;
    const fps = project?.fps ?? 30;

    const scene = buildScene({
      tracks: useTimelineStore.getState().tracks,
      mediaItems: useMediaStore.getState().mediaItems,
      duration: useTimelineStore.getState().getTotalDuration(),
      canvasSize: {
        width,
        height,
      },
    });

    const exporter = new SceneExporter({
      width,
      height,
      fps,
    });

    setExporter(exporter);

    exporter.on("progress", (progress) => {
      setProgress(progress);
    });

    exporter.on("complete", (blob) => {
      downloadBlob(blob, `export-${Date.now()}.mp4`);
      setIsOpen(false);
    });

    exporter.on("error", (error) => {
      setError(error.message);
    });

    await exporter.export(scene);
    setIsExporting(false);
    setExporter(null);
  };

  const handleCancel = () => {
    exporter?.cancel();
    setIsExporting(false);
    setIsOpen(false);
  };

  return (
    <Dialog modal open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
        </DialogHeader>
        <DialogDescription>Export the scene as a video file.</DialogDescription>
        <div className="min-h-16 text-sm flex items-end">
          {isExporting && <ExportProgress progress={progress} />}
          {error && <div className="text-red-500">{error}</div>}
        </div>
        <DialogFooter>
          {isExporting && (
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          )}
          <Button disabled={isExporting} onClick={handleExport}>
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
