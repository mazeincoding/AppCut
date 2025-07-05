import { UploadIcon } from "lucide-react";

interface DragOverlayProps {
  isVisible: boolean;
  title?: string;
  description?: string;
}

export function DragOverlay({
  isVisible,
  title = "Drop files here",
  description = "Images, videos, and audio files",
}: DragOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-accent/20 backdrop-blur-lg border-2 border-dashed border-accent flex items-center justify-center z-10 pointer-events-none">
      <div className="text-center">
        <UploadIcon className="h-8 w-8 text-accent mx-auto mb-2" />
        <p className="text-sm font-medium text-accent">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
