import React, { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Pencil, Text, X } from "lucide-react";
import { useCaptionStore } from "@/stores/caption-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { usePanelStore } from "@/stores/panel-store";
import { CaptionStylePanel } from "./caption-style-panel";
import { CaptionImportPanel } from "./CaptionImportPanel";
import { Caption } from "@/types/editor";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CaptionPanelProps {
  // onClose: () => void; // Removed, as we are now displaying style panel and caption panel at the same time
}

export function CaptionPanel({ /* onClose */ }: CaptionPanelProps) {
  const [newCaptionText, setNewCaptionText] = useState("");
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editedCaptionText, setEditedCaptionText] = useState("");
  const [draggingItemIndex, setDraggingItemIndex] = useState<number | null>(null);
  const [hoveringOverIndex, setHoveringOverIndex] = useState<number | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);
  const [showStyleView, setShowStyleView] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [newCaptionDraftStyle, setNewCaptionDraftStyle] = useState<Partial<Caption["style"]>>({
    color: "white",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: "8px 12px",
    borderRadius: "4px",
  });

  const { captions, addCaption, updateCaption, deleteCaption, reorderCaptions, setSelectedCaptionId, selectedCaptionId, clearAllCaptions, undoClearAllCaptions, canUndoClearAll } = useCaptionStore();
  const currentTime = usePlaybackStore((state) => state.currentTime);
  const { setShowCaptionPanel } = usePanelStore();
  const { toast } = useToast();

  const handleAddCaption = () => {
    if (newCaptionText.trim() === "") {
      return;
    }

    addCaption({
      text: newCaptionText,
      startTime: currentTime,
      endTime: currentTime + 3, // Default 3 seconds duration
      style: newCaptionDraftStyle,
    });
    setNewCaptionText("");
    setNewCaptionDraftStyle({
      color: "white",
      backgroundColor: "rgba(0,0,0,0.7)",
      padding: "8px 12px",
      borderRadius: "4px",
    });
    setSelectedCaptionId(null);
    setShowStyleView(false);
  };

  const handleEditClick = (captionId: string, currentText: string) => {
    setEditingCaptionId(captionId);
    setEditedCaptionText(currentText);
  };

  const handleSaveEdit = (captionId: string) => {
    if (editedCaptionText.trim() === "") return;
    updateCaption(captionId, { text: editedCaptionText });
    setEditingCaptionId(null);
    setEditedCaptionText("");
  };

  const handleCancelEdit = () => {
    setEditingCaptionId(null);
    setEditedCaptionText("");
  };

  const handleDeleteClick = (captionId: string) => {
    deleteCaption(captionId);
    if (selectedCaptionId === captionId) {
      setSelectedCaptionId(null);
      setShowStyleView(false);
    }
  };

  const handleClosePanel = () => {
    setShowCaptionPanel(false);
    setShowStyleView(false);
    setSelectedCaptionId(null);
  };

  const handleStyleUpdate = (newStyle: Partial<Caption["style"]>) => {
    if (selectedCaptionId) {
      updateCaption(selectedCaptionId, { style: newStyle });
    } else {
      setNewCaptionDraftStyle(newStyle);
    }
  };

  const currentCaptionForStyle = useMemo(() => {
    if (selectedCaptionId) {
      return captions.find((c) => c.id === selectedCaptionId) || null;
    } else if (newCaptionText.trim() !== "") {
      return {
        id: "draft",
        text: newCaptionText,
        startTime: currentTime,
        endTime: currentTime + 3,
        style: newCaptionDraftStyle,
      };
    }
    return null;
  }, [selectedCaptionId, captions, newCaptionText, newCaptionDraftStyle, currentTime]);

  const startScrolling = (direction: "up" | "down") => {
    if (scrollIntervalRef.current) return; // Already scrolling

    scrollIntervalRef.current = window.setInterval(() => {
      if (scrollAreaRef.current) {
        if (direction === "up") {
          scrollAreaRef.current.scrollTop -= 10; // Scroll up
        } else {
          scrollAreaRef.current.scrollTop += 10; // Scroll down
        }
      }
    }, 20); // Adjust scroll speed here
  };

  const stopScrolling = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggingItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString()); // Store the index of the dragged item
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
    const target = e.target as HTMLElement;
    const captionItem = target.closest(".caption-item") as HTMLElement | null;
    if (captionItem) {
      const index = parseInt(captionItem.dataset.index || "-1");
      if (index !== -1 && index !== hoveringOverIndex && index !== draggingItemIndex) {
        setHoveringOverIndex(index);
      }
    }

    // Auto-scrolling logic
    if (scrollAreaRef.current) {
      const scrollAreaRect = scrollAreaRef.current.getBoundingClientRect();
      const mouseY = e.clientY;

      const scrollThreshold = 50; // Pixels from top/bottom edge to start scrolling
      const scrollSpeed = 10; // Pixels per interval

      if (mouseY < scrollAreaRect.top + scrollThreshold) {
        startScrolling("up");
      } else if (mouseY > scrollAreaRect.bottom - scrollThreshold) {
        startScrolling("down");
      } else {
        stopScrolling();
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Stop scrolling if drag leaves the entire list area (or the scroll area specifically)
    // This can be tricky with nested elements, so often handled in dragOver or drop
    stopScrolling();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    stopScrolling(); // Stop scrolling on drop
    if (draggingItemIndex !== null && draggingItemIndex !== dropIndex) {
      reorderCaptions(draggingItemIndex, dropIndex);
    }
    setDraggingItemIndex(null);
    setHoveringOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggingItemIndex(null);
    setHoveringOverIndex(null);
    stopScrolling(); // Stop scrolling when drag ends
  };

  // Helper to format time (e.g., 00:00:00)
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [
      h.toString().padStart(2, "0"),
      m.toString().padStart(2, "0"),
      s.toString().padStart(2, "0"),
    ].join(":");
  };

  const handleClearAllCaptions = () => {
    setIsClearConfirmOpen(true);
  };

  const handleConfirmClearAll = () => {
    clearAllCaptions();
    setIsClearConfirmOpen(false);
    toast({
      title: "All Captions Cleared",
      description: "All captions have been removed. You can undo this action.",
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            undoClearAllCaptions();
            toast({
              title: "Undo Successful",
              description: "All captions have been restored.",
            });
          }}
        >
          Undo
        </Button>
      ),
    });
  };

  const handleCancelClear = () => {
    setIsClearConfirmOpen(false);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium
                      ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2
                      focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
                      h-9 px-3 cursor-pointer text-primary hover:bg-muted/50
                      `}
            onClick={() => setShowStyleView(false)}
          >
            Captions
          </span>
          <span
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium
                      ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2
                      focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
                      h-9 px-3 cursor-pointer text-primary hover:bg-muted/50
                      ${!selectedCaptionId && newCaptionText.trim() === "" ? "opacity-50 cursor-not-allowed" : ""}
                      `}
            onClick={() => setShowStyleView(true)}
            title="Open Text Styling Panel"
          >
            Text
          </span>
          <CaptionImportPanel />
        </div>
        <Button variant="text" size="sm" onClick={handleClosePanel} title="Close Panel">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {showStyleView ? (
          currentCaptionForStyle ? (
            <CaptionStylePanel
              currentCaption={currentCaptionForStyle}
              onStyleChange={handleStyleUpdate}
            />
          ) : (
            <div className="p-4 text-center text-gray-500">
              No caption selected or new caption text entered. Please select a caption or type text to style.
            </div>
          )
        ) : (
        <div className="space-y-6 p-5" ref={scrollAreaRef}>
          {/* Add New Caption Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Add New Caption</h3>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor="new-caption-text" className="sr-only">Caption Text</Label>
                <Input
                  id="new-caption-text"
                  placeholder="Type new caption..."
                  value={newCaptionText}
                    onChange={(e) => {
                      setNewCaptionText(e.target.value);
                      setSelectedCaptionId(null);
                    }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCaption();
                  }}
                />
              </div>
              <Button size="sm" onClick={handleAddCaption}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Existing Captions List */}
          <div className="flex justify-end pr-5 pb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllCaptions}
              disabled={captions.length === 0}
              title="Clear all captions"
            >
              Clear All
            </Button>
          </div>
          <div
            className="space-y-4"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, captions.length)}
          >
            <h3 className="text-sm font-medium">Existing Captions</h3>
            {captions.length === 0 ? (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">No captions added yet.</p>
                {/* Show undo button if there are previous captions to restore */}
                {canUndoClearAll() && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        undoClearAllCaptions();
                        toast({
                          title: "Captions Restored",
                          description: "Previous captions have been restored.",
                        });
                      }}
                      className="text-primary border-primary hover:bg-primary/10"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      Restore Previous Captions
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {captions.map((caption, index) => (
                  <div
                    key={caption.id}
                      className={`flex items-center gap-2 p-2 border rounded-md bg-card text-card-foreground shadow-sm caption-item cursor-pointer transition-all duration-200 ease-in-out
                      ${draggingItemIndex === index ? "opacity-50 border-2 border-blue-500 cursor-grabbing z-50" : ""}
                        ${hoveringOverIndex === index && draggingItemIndex !== index ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                        ${selectedCaptionId === caption.id ? "ring-2 ring-blue-500 ring-offset-2" : ""}
                      `}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                      onClick={() => {
                        setSelectedCaptionId(caption.id);
                        setNewCaptionText("");
                        setShowStyleView(false);
                      }}
                    onDragEnd={handleDragEnd}
                    data-index={index}
                  >
                    <span className="font-bold text-xs text-muted-foreground mr-2">{index + 1}.</span>
                    <div className="flex-grow flex flex-col min-w-0">
                    {editingCaptionId === caption.id ? (
                      <Input
                        value={editedCaptionText}
                        onChange={(e) => setEditedCaptionText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(caption.id);
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                          className="w-full"
                      />
                    ) : (
                        <p className="text-sm break-words">{caption.text}</p>
                    )}

                      <span className="text-xs text-muted-foreground text-left mt-1">
                      {formatTime(caption.startTime)} - {formatTime(caption.endTime)}
                    </span>
                    </div>

                    {editingCaptionId === caption.id ? (
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSaveEdit(caption.id)}
                          title="Save Changes"
                        >
                          Save
                        </Button>
                        <Button
                          variant="text"
                          size="sm"
                          onClick={handleCancelEdit}
                          title="Cancel Edit"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="text"
                          size="sm"
                          onClick={() => handleEditClick(caption.id, caption.text)}
                          title="Edit Caption"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="text"
                          size="sm"
                          onClick={() => handleDeleteClick(caption.id)}
                          title="Delete Caption"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}
      </ScrollArea>

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all your captions. You can undo this action if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClear}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClearAll}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 