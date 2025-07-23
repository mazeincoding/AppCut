import { MediaElement } from "@/types/timeline";
import { useMediaStore } from "@/stores/media-store";
import { Label } from "../../ui/label";
import { formatTimeCode } from "@/lib/time";
import { useProjectStore } from "@/stores/project-store";
import { Button } from "../../ui/button";
import { FileText, Download, Edit3, Trash2 } from "lucide-react";
import { MediaInfo } from "../media-info";
import { Separator } from "../../ui/separator";

export function MediaProperties({ element }: { element: MediaElement }) {
  const { mediaItems } = useMediaStore();
  const { activeProject } = useProjectStore();
  const mediaItem = mediaItems.find((item) => item.id === element.mediaId);

  if (!mediaItem) {
    return (
      <div className="space-y-4 p-5">
        <p className="text-sm text-muted-foreground">Media not found</p>
      </div>
    );
  }

  const formatDuration = (duration: number) => {
    if (activeProject?.fps) {
      return formatTimeCode(duration, "HH:MM:SS:FF", activeProject.fps);
    }
    return formatTimeCode(duration, "HH:MM:SS", 30);
  };

  return (
    <div className="space-y-4 p-5">
      {/* Media Thumbnail/Preview */}
      <div className="aspect-video w-full bg-muted/30 rounded-md overflow-hidden">
        {mediaItem.type === "image" && mediaItem.url && (
          <img
            src={mediaItem.url}
            alt={mediaItem.name}
            className="w-full h-full object-cover"
          />
        )}
        {mediaItem.type === "video" && mediaItem.thumbnailUrl && (
          <img
            src={mediaItem.thumbnailUrl}
            alt={mediaItem.name}
            className="w-full h-full object-cover"
          />
        )}
        {mediaItem.type === "audio" && (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="h-8 w-8 mx-auto mb-2" />
              <span className="text-sm">Audio File</span>
            </div>
          </div>
        )}
      </div>

      {/* Media Information Component */}
      <MediaInfo mediaItem={mediaItem} fps={activeProject?.fps} />

      <Separator />

      {/* Element Properties */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Element Properties</h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <PropertyItem
            label="Start Time"
            value={formatDuration(element.startTime)}
          />
          <PropertyItem
            label="Duration"
            value={formatDuration(element.duration)}
          />
          <PropertyItem
            label="Trim Start"
            value={formatDuration(element.trimStart)}
          />
          <PropertyItem
            label="Trim End"
            value={formatDuration(element.trimEnd)}
          />
        </div>
      </div>

      <Separator />

      {/* Actions: TODO: Handle actions later */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="justify-start">
            <Edit3 className="h-3 w-3 mr-2" />
            Replace
          </Button>
          <Button variant="outline" size="sm" className="justify-start">
            <Download className="h-3 w-3 mr-2" />
            Export
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3 mr-2" />
          Remove from Timeline
        </Button>
      </div>
    </div>
  );
}

function PropertyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      <span className="text-xs font-mono block">{value}</span>
    </div>
  );
}
