import { DraggableMediaItem } from "@/components/ui/draggable-item";
import { useState } from "react";

export function TextView() {
  const [text, setText] = useState("Default text");

  const handleUpdateText = () => {
    const newText = prompt("Enter your text:", "New text") || "New text";
    setText(newText);

    // TODO: Add this to your actual video/canvas layer system instead!
    console.log("Add to video:", newText);
  };
  return (
    <div className="p-4">
      <DraggableMediaItem
        name={text}
        preview={
          <div className="flex items-center justify-center w-full h-full bg-accent rounded">
            <span className="text-xs select-none">{text}</span>
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
        onPlusClick={handleUpdateText}
      />
    </div>
  );
}
