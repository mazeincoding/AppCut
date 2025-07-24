import { MediaElement } from "@/types/timeline";
import { useMediaStore } from "@/stores/media-store";
import { Label } from "../../ui/label";

export function MediaProperties({ element }: { element: MediaElement }) {
  const { mediaItems } = useMediaStore();

  // Find the media item associated with this element
  const mediaItem = mediaItems.find((item) => item.id === element.mediaId);

  if (!mediaItem) {
    return (
      <div className="space-y-4 p-5">
        <div className="text-xs text-muted-foreground">
          Media item not found
        </div>
      </div>
    );
  }

  const formatDuration = (duration: number) => {
    if (typeof duration !== "number" || duration < 0 || !isFinite(duration)) {
      return "0:00";
    }
    const min = Math.floor(duration / 60);
    const sec = Math.floor(duration % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (typeof bytes !== "number" || bytes < 0 || !isFinite(bytes)) {
      return "0 B";
    }
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    if (i >= sizes.length) {
      return `${(bytes / Math.pow(1024, sizes.length - 1)).toFixed(2)} ${sizes[sizes.length - 1]}`;
    }
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-4 p-5">
      {/* Media Info Header */}
      <div className="border-b pb-3">
        <h3 className="text-sm font-medium">Media Properties</h3>
      </div>

      {/* Media Details */}
      <div className="flex flex-col gap-3">
        <PropertyItem label="Media ID:" value={mediaItem.id} />
        <PropertyItem label="Name:" value={mediaItem.name} />
        <PropertyItem label="Type:" value={mediaItem.type.toUpperCase()} />

        <PropertyItem
          label="Size:"
          value={mediaItem.file ? formatFileSize(mediaItem.file.size) : "N/A"}
        />

        <PropertyItem
          label="Duration:"
          value={
            mediaItem.duration ? formatDuration(mediaItem.duration) : "N/A"
          }
        />

        <PropertyItem
          label="Resolution:"
          value={
            mediaItem.width && mediaItem.height
              ? `${mediaItem.width} × ${mediaItem.height}`
              : "N/A"
          }
        />

        <PropertyItem
          label="Frame rate:"
          value={mediaItem.fps ? `${mediaItem.fps} fps` : "N/A"}
        />

        <PropertyItem
          label="URL:"
          value={mediaItem.url ? "Available" : "N/A"}
        />

        <PropertyItem
          label="Thumbnail:"
          value={mediaItem.thumbnailUrl ? "Available" : "N/A"}
        />

        {mediaItem.file && (
          <>
            <PropertyItem
              label="File type:"
              value={mediaItem.file.type || "Unknown"}
            />
            <PropertyItem
              label="Last modified:"
              value={(() => {
                try {
                  return new Date(
                    mediaItem.file.lastModified
                  ).toLocaleDateString();
                } catch {
                  return "Invalid date";
                }
              })()}
            />
          </>
        )}
      </div>

      {/* Element Properties */}
      <div className="border-t pt-3">
        <h4 className="text-xs font-medium text-muted-foreground mb-3">
          Element Properties
        </h4>
        <div className="flex flex-col gap-3">
          <PropertyItem label="Element ID:" value={element.id} />
          <PropertyItem label="Element name:" value={element.name} />
          <PropertyItem label="Media ID:" value={element.mediaId} />
          <PropertyItem
            label="Start time:"
            value={formatDuration(element.startTime)}
          />
          <PropertyItem
            label="Duration:"
            value={formatDuration(element.duration)}
          />
          <PropertyItem
            label="Trim start:"
            value={formatDuration(element.trimStart)}
          />
          <PropertyItem
            label="Trim end:"
            value={formatDuration(element.trimEnd)}
          />
        </div>
      </div>
    </div>
  );
}

function PropertyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-xs text-right font-mono">{value}</span>
    </div>
  );
}
