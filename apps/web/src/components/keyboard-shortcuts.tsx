"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  KeyboardShortcut,
  useKeyboardShortcutsHelp,
} from "@/hooks/use-keyboard-shortcuts-help";
import { getPlatformSpecialKey } from "@/lib/utils";
import { useKeybindingsStore } from "@/stores/keybindings-store";
import { ShortcutKey } from "@/types/keybinding";
import {
  AlertTriangle,
  Check,
  Download,
  Edit,
  Keyboard,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface KeyRecorderProps {
  value: string;
  onValueChange: (value: string) => void;
  onCancel: () => void;
}

const KeyRecorder = ({ value, onValueChange, onCancel }: KeyRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedKey, setRecordedKey] = useState("");
  const { getKeybindingString } = useKeybindingsStore();

  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();

      const keyString = getKeybindingString(e);
      if (keyString) {
        setRecordedKey(keyString);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isRecording, getKeybindingString]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordedKey("");
  };

  const handleConfirm = () => {
    onValueChange(recordedKey);
    setIsRecording(false);
    setRecordedKey("");
  };

  const handleCancel = () => {
    setIsRecording(false);
    setRecordedKey("");
    onCancel();
  };

  const displayKey = recordedKey || value;

  return (
    <div className="flex items-center gap-2">
      <Input
        value={displayKey}
        readOnly
        placeholder={isRecording ? "Press keys..." : "Click to record"}
        className="font-mono text-sm w-40"
        onClick={handleStartRecording}
      />
      {isRecording ? (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleConfirm}
            disabled={!recordedKey}
            className="h-8 w-8 p-0"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={handleStartRecording}
          className="h-8"
        >
          Record
        </Button>
      )}
    </div>
  );
};

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

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex font-sans text-xs rounded px-2 min-w-[1.5rem] min-h-[1.5rem] leading-none items-center justify-center shadow-sm border mr-1"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.2)",
        borderColor: "rgba(255, 255, 255, 0.1)",
      }}
    >
      {children}
    </kbd>
  );
}

const ShortcutRow = ({
  shortcut,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onRemove,
}: {
  shortcut: KeyboardShortcut;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (newKey: string) => void;
  onRemove: () => void;
}) => {
  const [newKeyBinding, setNewKeyBinding] = useState<string>("");

  // Filter out lowercase duplicates for display
  const displayKeys = shortcut.keys.filter((key: string) => {
    const lowerKey = key.toLowerCase();
    const upperKey = key.toUpperCase();
    if (
      key === lowerKey &&
      key !== upperKey &&
      shortcut.keys.includes(upperKey)
    ) {
      return false;
    }
    return true;
  });

  const handleSave = () => {
    onSave(newKeyBinding);
    setNewKeyBinding("");
  };

  const handleCancel = () => {
    onCancelEdit();
    setNewKeyBinding("");
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0">
      <div className="flex items-center gap-3 flex-1">
        {shortcut.icon && (
          <div className="text-muted-foreground">{shortcut.icon}</div>
        )}
        <span className="text-sm font-medium">{shortcut.description}</span>
      </div>

      <div className="flex items-center gap-3">
        {isEditing ? (
          <KeyRecorder
            value={newKeyBinding}
            onValueChange={setNewKeyBinding}
            onCancel={handleCancel}
          />
        ) : (
          <div className="flex items-center gap-1 min-w-[120px] justify-end">
            {displayKeys.length > 0 ? (
              displayKeys.map((key: string, index: number) => (
                <div key={index} className="flex items-center gap-1">
                  <div className="flex items-center">
                    {key
                      .split("+")
                      .map((keyPart: string, partIndex: number) => (
                        <Key key={partIndex}>{getKeyWithModifier(keyPart)}</Key>
                      ))}
                  </div>
                  {index < displayKeys.length - 1 && (
                    <span className="text-xs text-muted-foreground">or</span>
                  )}
                </div>
              ))
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                No binding
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!newKeyBinding}
                className="h-8"
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="h-8"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onEdit}
                className="h-8 w-8 p-0"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onRemove}
                disabled={shortcut.keys.length === 0}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const KeyboardShortcuts = () => {
  const [open, setOpen] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const {
    keybindings,
    updateKeybinding,
    removeKeybinding,
    resetToDefaults,
    isCustomized,
    validateKeybinding,
    getKeybindingsForAction,
    exportKeybindings,
    importKeybindings,
  } = useKeybindingsStore();

  const { shortcuts } = useKeyboardShortcutsHelp();

  const categories = [
    "all",
    ...Array.from(new Set(shortcuts.map((s) => s.category))),
  ];

  const filteredShortcuts = shortcuts.filter((shortcut) => {
    const matchesSearch =
      shortcut.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shortcut.keys.some((key) =>
        key.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesCategory =
      selectedCategory === "all" || shortcut.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedShortcuts = categories.slice(1).reduce(
    (acc, category) => {
      acc[category] = filteredShortcuts.filter((s) => s.category === category);
      return acc;
    },
    {} as Record<string, KeyboardShortcut[]>
  );

  const handleEditShortcut = (shortcut: KeyboardShortcut) => {
    setEditingShortcut(shortcut.id);
  };

  const handleSaveShortcut = (
    shortcut: KeyboardShortcut,
    newKeyBinding: string
  ) => {
    if (!newKeyBinding) return;

    // Validate the new keybinding
    const conflict = validateKeybinding(
      newKeyBinding as ShortcutKey,
      shortcut.action
    );
    if (conflict) {
      toast.error(
        `Key "${newKeyBinding}" is already bound to "${conflict.existingAction}"`
      );
      return;
    }

    // Remove old keybindings for this action
    const oldKeys = getKeybindingsForAction(shortcut.action);
    oldKeys.forEach((key) => removeKeybinding(key));

    // Add new keybinding
    updateKeybinding(newKeyBinding as ShortcutKey, shortcut.action);

    setEditingShortcut(null);
    toast.success("Keybinding updated successfully");
  };

  const handleCancelEdit = () => {
    setEditingShortcut(null);
  };

  const handleRemoveShortcut = (shortcut: KeyboardShortcut) => {
    const keys = getKeybindingsForAction(shortcut.action);
    keys.forEach((key) => removeKeybinding(key));
    toast.success("Keybinding removed");
  };

  const handleResetToDefaults = () => {
    resetToDefaults();
    setShowResetDialog(false);
    toast.success("Keybindings reset to defaults");
  };

  const handleExportKeybindings = () => {
    const config = exportKeybindings();
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "opencut-keybindings.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Keybindings exported");
  };

  const handleImportKeybindings = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string);
        if (!config || typeof config !== "object") {
          throw new Error("Invalid configuration format");
        }

        for (const [key, action] of Object.entries(config)) {
          if (typeof key !== "string" || typeof action !== "string") {
            throw new Error(`Invalid keybinding: ${key} -> ${action}`);
          }
        }
        importKeybindings(config);
        toast.success("Keybindings imported successfully");
      } catch (error) {
        toast.error(`Failed to import keybindings: ${error}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="text" size="sm" className="gap-2">
          <Keyboard className="w-4 h-4" />
          Shortcuts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              <div>
                <DialogTitle>Keyboard Shortcuts</DialogTitle>
                <DialogDescription>
                  View and customize keyboard shortcuts for video editing.
                </DialogDescription>
              </div>
              {isCustomized && (
                <Badge variant="secondary" className="ml-2">
                  Modified
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportKeybindings}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={handleImportKeybindings}
                className="hidden"
                id="import-keybindings"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  document.getElementById("import-keybindings")?.click()
                }
              >
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetDialog(true)}
                disabled={!isCustomized}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex gap-4 items-center">
          <Input
            placeholder="Search shortcuts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList>
              {categories.map((category) => (
                <TabsTrigger key={category} value={category}>
                  {category === "all" ? "All" : category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {selectedCategory === "all" ? (
            <div className="space-y-6">
              {Object.entries(groupedShortcuts).map(
                ([category, categoryShortcuts]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="text-xs text-muted-foreground uppercase tracking-wide font-medium border-b border-border/50 pb-2">
                      {category}
                    </h3>
                    <div className="space-y-1">
                      {categoryShortcuts.map((shortcut) => (
                        <ShortcutRow
                          key={shortcut.id}
                          shortcut={shortcut}
                          isEditing={editingShortcut === shortcut.id}
                          onEdit={() => handleEditShortcut(shortcut)}
                          onCancelEdit={handleCancelEdit}
                          onSave={(newKey) =>
                            handleSaveShortcut(shortcut, newKey)
                          }
                          onRemove={() => handleRemoveShortcut(shortcut)}
                        />
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredShortcuts.map((shortcut) => (
                <ShortcutRow
                  key={shortcut.id}
                  shortcut={shortcut}
                  isEditing={editingShortcut === shortcut.id}
                  onEdit={() => handleEditShortcut(shortcut)}
                  onCancelEdit={handleCancelEdit}
                  onSave={(newKey) => handleSaveShortcut(shortcut, newKey)}
                  onRemove={() => handleRemoveShortcut(shortcut)}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="z-[9999]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Reset Keyboard Shortcuts?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all keyboard shortcuts to their default values.
              Any custom keybindings will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetToDefaults}>
              Reset to Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
