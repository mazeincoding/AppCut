"use client";

import { create } from "zustand";
import { Action } from "@/constants/actions";

interface KeybindingsState {
  keybindings: Record<string, Action>;
  updateKeybinding: (key: string, action: Action) => void;
  removeKeybinding: (key: string) => void;
  getKeybindingString: (event: KeyboardEvent) => string;
  validateKeybinding: (key: string, action: Action) => { existingAction: string } | null;
  getKeybindingsForAction: (action: Action) => string[];
}

// Default keybindings based on existing implementation
const defaultKeybindings: Record<string, Action> = {
  // Playback
  "space": "toggle-play",
  "k": "toggle-play",
  "j": "seek-backward",
  "l": "seek-forward",
  
  // Navigation
  "left": "frame-step-backward",
  "right": "frame-step-forward",
  "shift+left": "jump-backward",
  "shift+right": "jump-forward",
  "home": "goto-start",
  "end": "goto-end",
  
  // Editing
  "s": "split-element",
  "n": "toggle-snapping",
  "delete": "delete-selected",
  "backspace": "delete-selected",
  
  // Selection
  "ctrl+a": "select-all",
  "cmd+a": "select-all",
  "ctrl+d": "duplicate-selected",
  "cmd+d": "duplicate-selected",
  
  // History
  "ctrl+z": "undo",
  "cmd+z": "undo",
  "ctrl+shift+z": "redo",
  "cmd+shift+z": "redo",
  "ctrl+y": "redo",
  "cmd+y": "redo",
};

export const useKeybindingsStore = create<KeybindingsState>((set, get) => ({
  keybindings: defaultKeybindings,

  updateKeybinding: (key: string, action: Action) => {
    set((state) => ({
      keybindings: {
        ...state.keybindings,
        [key]: action,
      },
    }));
  },

  removeKeybinding: (key: string) => {
    set((state) => {
      const newKeybindings = { ...state.keybindings };
      delete newKeybindings[key];
      return { keybindings: newKeybindings };
    });
  },

  getKeybindingString: (event: KeyboardEvent): string => {
    const parts: string[] = [];

    if (event.ctrlKey || event.metaKey) {
      parts.push(event.metaKey ? "cmd" : "ctrl");
    }
    if (event.shiftKey) parts.push("shift");
    if (event.altKey) parts.push("alt");

    let key = event.key.toLowerCase();
    
    // Handle special keys
    if (key === " ") key = "space";
    if (key === "arrowleft") key = "left";
    if (key === "arrowright") key = "right";
    if (key === "arrowup") key = "up";
    if (key === "arrowdown") key = "down";

    // Don't add modifier keys as the main key
    if (!["control", "meta", "shift", "alt"].includes(key)) {
      parts.push(key);
    }

    return parts.join("+");
  },

  validateKeybinding: (key: string, action: Action) => {
    const { keybindings } = get();
    const existingAction = keybindings[key];
    
    if (existingAction && existingAction !== action) {
      return { existingAction };
    }
    
    return null;
  },

  getKeybindingsForAction: (action: Action): string[] => {
    const { keybindings } = get();
    return Object.entries(keybindings)
      .filter(([_, actionValue]) => actionValue === action)
      .map(([key]) => key);
  },
}));