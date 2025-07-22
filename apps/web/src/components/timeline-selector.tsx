"use client";

import { useState } from "react";
import { useTimelineManagerStore } from "@/stores/timeline-manager-store";
import { useProjectStore } from "@/stores/project-store";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ChevronDown, Plus, Settings, Copy, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { TTimeline } from "@/types/project";
import { useEditorStore } from "@/stores/editor-store";

interface TimelineDialogData {
  type: "create" | "edit" | "settings" | "delete";
  timeline?: TTimeline;
}

export function TimelineSelector() {
  const {
    timelines,
    activeTimeline,
    createTimeline,
    switchToTimeline,
    renameTimeline,
    updateTimelineSettings,
    duplicateTimeline,
    deleteTimeline,
  } = useTimelineManagerStore();

  const { activeProject } = useProjectStore();
  const { canvasPresets } = useEditorStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState<TimelineDialogData | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    width: 1920,
    height: 1080,
    fps: 30,
    copyFromActive: false,
  });

  if (!activeProject || timelines.length === 0) {
    return null;
  }

  const openCreateDialog = () => {
    setFormData({
      name: `Timeline ${timelines.length + 1}`,
      width: 1920,
      height: 1080,
      fps: activeProject.fps || 30,
      copyFromActive: false,
    });
    setDialogData({ type: "create" });
    setDialogOpen(true);
  };

  const openEditDialog = (timeline: TTimeline) => {
    setFormData({
      name: timeline.name,
      width: timeline.width,
      height: timeline.height,
      fps: timeline.fps,
      copyFromActive: false,
    });
    setDialogData({ type: "edit", timeline });
    setDialogOpen(true);
  };

  const openSettingsDialog = (timeline: TTimeline) => {
    setFormData({
      name: timeline.name,
      width: timeline.width,
      height: timeline.height,
      fps: timeline.fps,
      copyFromActive: false,
    });
    setDialogData({ type: "settings", timeline });
    setDialogOpen(true);
  };

  const openDeleteDialog = (timeline: TTimeline) => {
    setDialogData({ type: "delete", timeline });
    setDialogOpen(true);
  };

  const handleDialogSubmit = async () => {
    try {
      switch (dialogData?.type) {
        case "create":
          await createTimeline(formData.name, {
            width: formData.width,
            height: formData.height,
            fps: formData.fps,
            copyFromActive: formData.copyFromActive,
          });
          break;
        case "edit":
          if (dialogData.timeline) {
            await renameTimeline(dialogData.timeline.id, formData.name);
          }
          break;
        case "settings":
          if (dialogData.timeline) {
            await updateTimelineSettings(dialogData.timeline.id, {
              width: formData.width,
              height: formData.height,
              fps: formData.fps,
            });
          }
          break;
        case "delete":
          if (dialogData.timeline) {
            await deleteTimeline(dialogData.timeline.id);
          }
          break;
      }
      setDialogOpen(false);
    } catch (error) {
      console.error("Dialog action failed:", error);
    }
  };

  const handleDuplicate = async (timeline: TTimeline) => {
    try {
      await duplicateTimeline(timeline.id);
    } catch (error) {
      console.error("Failed to duplicate timeline:", error);
    }
  };

  const handlePresetSelect = (preset: { width: number; height: number }) => {
    setFormData((prev) => ({
      ...prev,
      width: preset.width,
      height: preset.height,
    }));
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <span className="text-sm">
                {activeTimeline?.name || "Select Timeline"}
              </span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Timelines
            </div>
            {timelines.map((timeline) => (
              <DropdownMenuItem
                key={timeline.id}
                className="flex items-center justify-between"
                onClick={() => switchToTimeline(timeline.id)}
              >
                <div className="flex-1">
                  <div className="font-medium">{timeline.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {timeline.width}×{timeline.height} • {timeline.fps}fps
                  </div>
                </div>
                {activeTimeline?.id === timeline.id && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Timeline
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {activeTimeline && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="text" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditDialog(activeTimeline)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openSettingsDialog(activeTimeline)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDuplicate(activeTimeline)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => openDeleteDialog(activeTimeline)}
                className="text-destructive focus:text-destructive"
                disabled={timelines.length <= 1}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogData?.type === "create" && "Create Timeline"}
              {dialogData?.type === "edit" && "Rename Timeline"}
              {dialogData?.type === "settings" && "Timeline Settings"}
              {dialogData?.type === "delete" && "Delete Timeline"}
            </DialogTitle>
            <DialogDescription>
              {dialogData?.type === "create" &&
                "Create a new timeline with custom resolution and framerate."}
              {dialogData?.type === "edit" &&
                "Change the name of this timeline."}
              {dialogData?.type === "settings" &&
                "Adjust timeline resolution and framerate."}
              {dialogData?.type === "delete" &&
                "This action cannot be undone. All clips in this timeline will be permanently deleted."}
            </DialogDescription>
          </DialogHeader>

          {dialogData?.type !== "delete" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timeline-name">Name</Label>
                <Input
                  id="timeline-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Timeline name"
                />
              </div>

              {(dialogData?.type === "create" ||
                dialogData?.type === "settings") && (
                <>
                  <div className="space-y-2">
                    <Label>Resolution Preset</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {canvasPresets.map((preset) => (
                        <Button
                          key={`${preset.width}x${preset.height}`}
                          variant={
                            formData.width === preset.width &&
                            formData.height === preset.height
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => handlePresetSelect(preset)}
                          className="justify-start"
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timeline-width">Width</Label>
                      <Input
                        id="timeline-width"
                        type="number"
                        value={formData.width}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            width: parseInt(e.target.value) || 1920,
                          }))
                        }
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeline-height">Height</Label>
                      <Input
                        id="timeline-height"
                        type="number"
                        value={formData.height}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            height: parseInt(e.target.value) || 1080,
                          }))
                        }
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeline-fps">Frame Rate</Label>
                    <Select
                      value={formData.fps.toString()}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          fps: parseInt(value),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">24 fps</SelectItem>
                        <SelectItem value="25">25 fps</SelectItem>
                        <SelectItem value="30">30 fps</SelectItem>
                        <SelectItem value="60">60 fps</SelectItem>
                        <SelectItem value="120">120 fps</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {dialogData?.type === "create" && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="copy-from-active"
                        checked={formData.copyFromActive}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            copyFromActive: e.target.checked,
                          }))
                        }
                        className="rounded"
                      />
                      <Label htmlFor="copy-from-active" className="text-sm">
                        Copy clips from current timeline
                      </Label>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDialogSubmit}
              variant={
                dialogData?.type === "delete" ? "destructive" : "default"
              }
              disabled={!formData.name.trim() && dialogData?.type !== "delete"}
            >
              {dialogData?.type === "create" && "Create"}
              {dialogData?.type === "edit" && "Rename"}
              {dialogData?.type === "settings" && "Save"}
              {dialogData?.type === "delete" && "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
