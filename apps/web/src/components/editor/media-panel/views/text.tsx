import { DraggableMediaItem } from "@/components/ui/draggable-item";

export function TextView() {
  return (
    <div className="p-4">
      <DraggableMediaItem
        name="Default text"
        preview={
          <div className="flex items-center justify-center w-full h-full bg-accent rounded">
            <span className="text-xs select-none">Default text</span>
          </div>
        }
        dragData={{
          id: "default-text",
          type: "text",
          name: "Default text",
          content: "Default text",
        }}
        aspectRatio={1}
        showLabel={false}
      />
    </div>
  );
}
