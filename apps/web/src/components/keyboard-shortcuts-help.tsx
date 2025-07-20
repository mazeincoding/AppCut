"use client";

import { useState, useEffect } from "react";
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
import { Keyboard } from "lucide-react";
import {
  useKeyboardShortcutsHelp,
  KeyboardShortcut,
} from "@/hooks/use-keyboard-shortcuts-help";
import { useKeybindingsStore } from "@/stores/keybindings-store";
import { toast } from "sonner";

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

const ShortcutItem = ({
  shortcut,
  recordingKey,
  onStartRecording,
}: {
  shortcut: KeyboardShortcut;
  recordingKey: string | null;
  onStartRecording: (keyId: string, shortcut: KeyboardShortcut) => void;
}) => {
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
              {key.split("+").map((keyPart: string, partIndex: number) => {
                const keyId = `${shortcut.id}-${index}-${partIndex}`;
                return (
                  <EditableShortcutKey
                    key={partIndex}
                    keyId={keyId}
                    originalKey={key}
                    shortcut={shortcut}
                    isRecording={recordingKey === keyId}
                    onStartRecording={() => onStartRecording(keyId, shortcut)}
                  >
                    {getKeyWithModifier(keyPart)}
                  </EditableShortcutKey>
                );
              })}
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

const EditableShortcutKey = ({
  children,
  keyId,
  originalKey,
  shortcut,
  isRecording,
  onStartRecording,
}: {
  children: React.ReactNode;
  keyId: string;
  originalKey: string;
  shortcut: KeyboardShortcut;
  isRecording: boolean;
  onStartRecording: () => void;
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onStartRecording();
  };

  return (
    <kbd
      className={`inline-flex font-sans text-xs rounded px-2 min-w-[1.5rem] min-h-[1.5rem] leading-none items-center justify-center shadow-sm border mr-1 cursor-pointer hover:bg-opacity-80 ${
        isRecording
          ? "border-primary bg-primary/10"
          : "border-white/10 bg-black/20"
      }`}
      onClick={handleClick}
      title={
        isRecording ? "Press any key combination..." : "Click to edit shortcut"
      }
    >
      {children}
    </kbd>
  );
};

export const KeyboardShortcutsHelp = () => {
  const [open, setOpen] = useState(false);
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [recordingShortcut, setRecordingShortcut] =
    useState<KeyboardShortcut | null>(null);

  const {
    updateKeybinding,
    removeKeybinding,
    getKeybindingString,
    validateKeybinding,
    getKeybindingsForAction,
  } = useKeybindingsStore();

  // Get shortcuts from centralized hook
  const { shortcuts } = useKeyboardShortcutsHelp();

  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  useEffect(() => {
    if (!recordingKey || !recordingShortcut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const keyString = getKeybindingString(e);
      if (keyString) {
        // Auto-save the new keybinding
        const conflict = validateKeybinding(
          keyString,
          recordingShortcut.action
        );
        if (conflict) {
          toast.error(
            `Key "${keyString}" is already bound to "${conflict.existingAction}"`
          );
          setRecordingKey(null);
          setRecordingShortcut(null);
          return;
        }

        // Remove old keybindings for this action
        const oldKeys = getKeybindingsForAction(recordingShortcut.action);
        oldKeys.forEach((key) => removeKeybinding(key));

        // Add new keybinding
        updateKeybinding(keyString, recordingShortcut.action);

        setRecordingKey(null);
        setRecordingShortcut(null);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      setRecordingKey(null);
      setRecordingShortcut(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [
    recordingKey,
    recordingShortcut,
    getKeybindingString,
    updateKeybinding,
    removeKeybinding,
    validateKeybinding,
    getKeybindingsForAction,
  ]);

  const handleStartRecording = (keyId: string, shortcut: KeyboardShortcut) => {
    setRecordingKey(keyId);
    setRecordingShortcut(shortcut);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="text" size="sm" className="gap-2">
          <Keyboard className="w-4 h-4" />
          Shortcuts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Speed up your video editing workflow with these keyboard shortcuts.
            Click any shortcut key to edit it.
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
                    <ShortcutItem
                      key={index}
                      shortcut={shortcut}
                      recordingKey={recordingKey}
                      onStartRecording={handleStartRecording}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
