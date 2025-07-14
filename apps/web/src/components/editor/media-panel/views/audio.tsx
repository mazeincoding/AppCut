"use client";

import { useDragDrop } from "@/hooks/use-drag-drop";
import { processMediaFiles } from "@/lib/media-processing";
import { useMediaStore, type MediaItem } from "@/stores/media-store";
import { Music, Plus, Upload } from "lucide-react";
import { useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DragOverlay } from "@/components/ui/drag-overlay";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { DraggableMediaItem } from "@/components/ui/draggable-item";
import { useProjectStore } from "@/stores/project-store";
import AudioWaveform from "../../../editor/audio-waveform";

export function AudioView() {
  const { mediaItems, addMediaItem, removeMediaItem } = useMediaStore();
  const { activeProject } = useProjectStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter only audio items
  const audioItems = mediaItems.filter((item) => item.type === "audio");

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    if (!activeProject) {
      toast.error("No active project");
      return;
    }

    // Filter only audio files
    const audioFiles = Array.from(files).filter((file) =>
      file.type.startsWith("audio/")
    );

    if (audioFiles.length === 0) {
      toast.error("Please select audio files only");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    try {
      const processedItems = await processMediaFiles(audioFiles, (p) =>
        setProgress(p)
      );
      for (const item of processedItems) {
        await addMediaItem(activeProject.id, item);
      }
    } catch (error) {
      console.error("Error processing audio files:", error);
      toast.error("Failed to process audio files");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const { isDragOver, dragProps } = useDragDrop({
    onDrop: processFiles,
  });

  const handleFileSelect = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = "";
  };

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!activeProject) {
      toast.error("No active project");
      return;
    }
    await removeMediaItem(activeProject.id, id);
  };

  const formatDuration = (duration: number) => {
    const min = Math.floor(duration / 60);
    const sec = Math.floor(duration % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const filteredAudioItems = useMemo(() => {
    return audioItems.filter((item) => {
      if (
        searchQuery &&
        !item.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [audioItems, searchQuery]);

  const renderAudioPreview = (item: MediaItem) => {
    return (
      <div className="w-full h-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex flex-col items-center justify-center text-muted-foreground rounded border border-green-500/20 relative overflow-hidden">
        <div className="absolute inset-2">
          <AudioWaveform
            audioUrl={item.url || ""}
            height={20}
            className="w-full opacity-60"
          />
        </div>
        <Music className="h-6 w-6 mb-1 z-10" />
        <span className="text-xs z-10">Audio</span>
        {item.duration && (
          <span className="text-xs opacity-70 z-10">
            {formatDuration(item.duration)}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        className={`h-full flex flex-col gap-1 transition-colors relative ${
          isDragOver ? "bg-accent/30" : ""
        }`}
        {...dragProps}
      >
        <DragOverlay isVisible={isDragOver} />

        <div className="p-3 pb-2">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search audio..."
              className="flex-1 h-full text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={handleFileSelect}
              disabled={isProcessing}
              className="flex-none bg-transparent min-w-[30px] whitespace-nowrap overflow-hidden px-2 justify-center items-center"
            >
              {isProcessing ? (
                <>
                  <Upload className="h-4 w-4 animate-spin" />
                  <span className="hidden md:inline ml-2">{progress}%</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Add</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 pt-0">
          {filteredAudioItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center h-full">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mb-4 border border-green-500/20">
                <Music className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No audio files</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Drag audio files here or use the button above
              </p>
            </div>
          ) : (
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: "repeat(auto-fill, 160px)",
              }}
            >
              {filteredAudioItems.map((item) => (
                <ContextMenu key={item.id}>
                  <ContextMenuTrigger>
                    <div >
                      <DraggableMediaItem
                        name={item.name}
                        preview={renderAudioPreview(item)}
                        dragData={{
                          id: item.id,
                          type: item.type,
                          name: item.name,
                        }}
                        showPlusOnDrag={false}
                        rounded={false}
                      />
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem>Export audio</ContextMenuItem>
                    <ContextMenuItem
                      variant="destructive"
                      onClick={(e) => handleRemove(e, item.id)}
                    >
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
