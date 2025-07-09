"use client";

import { useProjectStore } from "@/stores/project-store";
import { useAspectRatio } from "@/hooks/use-aspect-ratio";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";

export function PropertiesPanel() {
  const { activeProject } = useProjectStore();
  const { getDisplayName, canvasSize } = useAspectRatio();

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-5">
        {/* Media Properties */}
        <div className="flex flex-col gap-3">
          <PropertyItem label="Name:" value={activeProject?.name || ""} />
          <PropertyItem label="Aspect ratio:" value={getDisplayName()} />
          <PropertyItem
            label="Resolution:"
            value={`${canvasSize.width} × ${canvasSize.height}`}
          />
          <PropertyItem label="Frame rate:" value="30.00fps" />
        </div>
      </div>
    </ScrollArea>
  );
}

function PropertyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-xs text-right">{value}</span>
    </div>
  );
}
