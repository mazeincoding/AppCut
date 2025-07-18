"use client";

import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { Keyboard } from "lucide-react";
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
import { getPlatformSpecialKey } from "@/lib/utils";

const modifier: {
  [key: string]: string;
} = {
  Shift: "Shift",
  Alt: "Alt",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Space: "Space",
};

function getKeyWithModifier(key: string) {
  if (key === "Ctrl") return getPlatformSpecialKey();
  return modifier[key] || key;
}

const ShortcutItem = ({ shortcut }: { shortcut: any }) => {
  // Filter out lowercase duplicates for display - if both "j" and "J" exist, only show "J"
  const displayKeys = shortcut.keys.filter((key: string) => {
    if (
      key.includes("Cmd") &&
      shortcut.keys.includes(key.replace("Cmd", "Ctrl"))
    )
      return false;

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
                <ShortcutKey key={partIndex}>
                  {getKeyWithModifier(keyPart)}
                </ShortcutKey>
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

function ShortcutKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd 
      className="inline-flex font-sans text-xs rounded px-2 min-w-[1.5rem] min-h-[1.5rem] leading-none items-center justify-center shadow-sm border mr-1"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.2)",
        borderColor: "rgba(255, 255, 255, 0.1)"
      }}
    >
      {children}
    </kbd>
  );
};
