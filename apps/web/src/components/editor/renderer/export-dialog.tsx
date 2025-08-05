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
import { SceneNode } from "@/lib/renderer/nodes/scene-node";
import { Progress } from "@/components/ui/progress";
import { useRendererStore } from "@/stores/renderer-store";

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
  const scene = useRendererStore((s) => s.scene);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    setError(null);
    setProgress(0);
  };

  const handleExport = async () => {
    if (!scene) {
      return;
    }

    setIsExporting(true);

    const exporter = new SceneExporter({
      width: 600, // TODO: Use project's aspect ratio
      height: 320, // TODO: Use project's aspect ratio
      fps: 30, // TODO: Use project's frame rate
    });

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
          <Button disabled={isExporting || !scene} onClick={handleExport}>
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
