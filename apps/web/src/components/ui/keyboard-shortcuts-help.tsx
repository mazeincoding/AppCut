"use client";

import { useState, useEffect } from "react";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
} from "./dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
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
  // Filter out duplicate keys (e.g., if both Cmd and Ctrl versions exist, prefer Cmd on Mac)
  const displayKeys = shortcut.keys.filter((key: string) => {
    if (
      key.includes("Ctrl") &&
      shortcut.keys.includes(key.replace("Ctrl", "Cmd"))
    )
      return false;

    return true;
  });

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-200 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        {shortcut.icon && (
          <div className="text-muted-foreground">{shortcut.icon}</div>
        )}
        <span className="text-sm">{shortcut.description}</span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-4">
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
                    {keyPart}
                  </EditableShortcutKey>
                );
              })}
            </div>
            {index < displayKeys.length - 1 && (
              <span className="text-xs text-muted-foreground px-1">or</span>
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
        <Button 
          variant="text" 
          size="sm" 
          className="gap-2 transition-all duration-200 !bg-transparent hover:!bg-transparent !border-transparent"
        >
          <Keyboard className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">Shortcuts</span>
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-50 grid w-[40vw] max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
          style={{
            backgroundColor: '#ff0000',
            maxHeight: '80vh',
            overflow: 'hidden'
          }}
        >
          <div 
            className="p-6 space-y-4 overflow-y-auto"
            style={{ backgroundColor: '#ff0000' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-1.5 text-base text-gray-900 font-semibold">
                  <Keyboard className="w-4 h-4" />
                  Shortcuts
                </h2>
                <p className="text-xs text-gray-600 mt-2">
                  Speed up your workflow with keyboard shortcuts. Click any key to edit.
                </p>
              </div>
              <DialogPrimitive.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            <div className="space-y-6">
              {categories.map((category) => (
                <div key={category} className="flex flex-col gap-1">
                  <h3 className="text-xs uppercase tracking-wide font-medium text-gray-600">
                    {category}
                  </h3>
                  <div className="space-y-2">
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
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};