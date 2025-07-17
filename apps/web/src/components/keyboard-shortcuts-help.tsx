"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Keyboard } from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

const KeyBadge = ({ keyName }: { keyName: string }) => {
  // Replace common key names with symbols or friendly names
  const displayKey = keyName
    .replace("Cmd", "⌘")
    .replace("Shift", "Shift")
    .replace("ArrowLeft", "Arrow Left")
    .replace("ArrowRight", "Arrow Right")
    .replace("ArrowUp", "Arrow Up")
    .replace("ArrowDown", "Arrow Down")
    .replace("←", "◀")
    .replace("→", "▶")
    .replace("Space", "Space");

  return (
    <Badge variant="secondary" className="font-mono text-xs px-1 py-1">
      {displayKey}
    </Badge>
  );
};

const ShortcutItem = ({ shortcut }: { shortcut: any }) => {
  // Filter out lowercase duplicates for display - if both "j" and "J" exist, only show "J"
  const displayKeys = shortcut.keys.filter((key: string) => {
    const lowerKey = key.toLowerCase();
    const upperKey = key.toUpperCase();

    // If this is a lowercase letter and the uppercase version exists, skip it
    if (
      key === lowerKey &&
      key !== upperKey &&
      shortcut.keys.includes(upperKey)
    ) {
      return false;
    }

    return true;
  });

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {shortcut.icon && (
          <div className="text-muted-foreground">{shortcut.icon}</div>
        )}
        <span className="text-sm">{shortcut.description}</span>
      </div>
      <div className="flex items-center gap-1">
        {displayKeys.map((key: string, index: number) => (
          <div key={index} className="flex items-center gap-1">
            <div className="flex items-center">
              {key.split("+").map((keyPart: string, partIndex: number) => (
                <div key={partIndex} className="flex items-center gap-1">
                  <KeyBadge keyName={keyPart} />
                  {partIndex < key.split("+").length - 1 && (
                    <span className="text-xs text-muted-foreground">+</span>
                  )}
                </div>
              ))}
            </div>
            {index < displayKeys.length - 1 && (
              <span className="text-xs text-muted-foreground">or</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const KeyboardShortcutsHelp = () => {
  const [open, setOpen] = useState(false);

  // Get shortcuts from centralized hook (disabled so it doesn't add event listeners)
  const { shortcuts } = useKeyboardShortcuts({ enabled: false });

  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="text" size="sm" className="gap-2">
          <Keyboard className="w-4 h-4" />
          Shortcuts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-hidden flex">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your video editing workflow with these keyboard shortcuts.
            Most shortcuts work when the timeline is focused.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category} className="flex flex-col gap-1">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                {category}
              </h3>
              <div className="space-y-0.5">
                {shortcuts
                  .filter((shortcut) => shortcut.category === category)
                  .map((shortcut, index) => (
                    <ShortcutItem key={index} shortcut={shortcut} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
