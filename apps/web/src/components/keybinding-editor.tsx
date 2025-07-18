"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useKeybindingsStore } from "@/stores/keybindings-store";
import { Action } from "@/constants/actions";
import { KeyboardShortcut } from "@/hooks/use-keyboard-shortcuts-help";
import {
  Settings,
  RotateCcw,
  Download,
  Upload,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface KeybindingEditorProps {
  shortcuts: KeyboardShortcut[];
  onClose: () => void;
}

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
        className="font-mono text-sm"
        onClick={handleStartRecording}
      />
      {isRecording ? (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleConfirm}
            disabled={!recordedKey}
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={handleStartRecording}>
          Record
        </Button>
      )}
    </div>
  );
};

export const KeybindingEditor = ({
  shortcuts,
  onClose,
}: KeybindingEditorProps) => {
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

  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [newKeyBinding, setNewKeyBinding] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

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

  const handleEditShortcut = (shortcut: KeyboardShortcut) => {
    setEditingShortcut(shortcut.id);
    setNewKeyBinding(shortcut.keys[0] || "");
  };

  const handleSaveShortcut = () => {
    if (!editingShortcut || !newKeyBinding) return;

    const shortcut = shortcuts.find((s) => s.id === editingShortcut);
    if (!shortcut) return;

    // Validate the new keybinding
    const conflict = validateKeybinding(newKeyBinding, shortcut.action);
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
    updateKeybinding(newKeyBinding, shortcut.action);

    setEditingShortcut(null);
    setNewKeyBinding("");
    toast.success("Keybinding updated successfully");
  };

  const handleCancelEdit = () => {
    setEditingShortcut(null);
    setNewKeyBinding("");
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
        // Validate config structure
        if (!config || typeof config !== "object") {
          throw new Error("Invalid configuration format");
        }

        // Validate each keybinding
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          <h2 className="text-xl font-semibold">
            Customize Keyboard Shortcuts
          </h2>
          {isCustomized && (
            <Badge variant="secondary" className="ml-2">
              Modified
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportKeybindings}>
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
            Reset to Defaults
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </div>

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

      <div className="space-y-4">
        {filteredShortcuts.map((shortcut) => (
          <Card key={shortcut.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-medium">{shortcut.description}</h3>
                      <p className="text-sm text-muted-foreground">
                        {shortcut.category}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {editingShortcut === shortcut.id ? (
                      <KeyRecorder
                        value={newKeyBinding}
                        onValueChange={setNewKeyBinding}
                        onCancel={handleCancelEdit}
                      />
                    ) : (
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="font-mono text-xs"
                          >
                            {key}
                          </Badge>
                        ))}
                        {shortcut.keys.length === 0 && (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            No binding
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingShortcut === shortcut.id ? (
                      <>
                        <Button size="sm" onClick={handleSaveShortcut}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditShortcut(shortcut)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveShortcut(shortcut)}
                          disabled={shortcut.keys.length === 0}
                        >
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
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
    </div>
  );
};
