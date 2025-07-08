import { DraggableMediaItem } from "@/components/ui/draggable-item";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { randomUUID } from "crypto";

export function TextView() {
  const [text, setText] = useState<string>("Default text");
  const [inputValue, setInputValue] = useState<string>("");
  const [open, setOpen] = useState(false);

  const handleAddText = () => {
    setText(inputValue || "New text");
    setOpen(false);
    setInputValue("");

    // You'd likely integrate this into your video canvas layer:
    console.log("Add to video:", inputValue);
  };

  return (
    <div className="p-4">
      {/* Text input dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <div>
            <DraggableMediaItem
              name={text}
              preview={
                <div className="flex items-center justify-center w-full h-full bg-accent rounded">
                  <span className="text-xs select-none">{text}</span>
                </div>
              }
              dragData={{
                id: randomUUID(),
                type: "text",
                name: text,
                content: text,
              }}
              aspectRatio={1}
              showLabel={false}
              onPlusClick={() => setOpen(true)}
            />
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter your text</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Enter custom text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button onClick={handleAddText}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
