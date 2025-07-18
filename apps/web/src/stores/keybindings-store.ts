"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ActionWithOptionalArgs } from "@/constants/actions";
import { isAppleDevice, isDOMElement, isTypableElement } from "@/lib/utils";

export type ShortcutKey = string;

export interface KeybindingConfig {
  [key: ShortcutKey]: ActionWithOptionalArgs;
}

// Default keybindings configuration
export const defaultKeybindings: KeybindingConfig = {
  space: "toggle-play",
  j: "seek-backward",
  k: "toggle-play",
  l: "seek-forward",
  left: "frame-step-backward",
  right: "frame-step-forward",
  "shift-left": "jump-backward",
  "shift-right": "jump-forward",
  home: "goto-start",
  end: "goto-end",
  s: "split-element",
  n: "toggle-snapping",
  "ctrl-a": "select-all",
  "ctrl-d": "duplicate-selected",
  "ctrl-z": "undo",
  "ctrl-shift-z": "redo",
  "ctrl-y": "redo",
  delete: "delete-selected",
  backspace: "delete-selected",
};

export interface KeybindingConflict {
  key: string;
  existingAction: ActionWithOptionalArgs;
  newAction: ActionWithOptionalArgs;
}

interface KeybindingsState {
  keybindings: KeybindingConfig;
  isCustomized: boolean;
  keybindingsEnabled: boolean;

  // Actions
  updateKeybinding: (key: string, action: ActionWithOptionalArgs) => void;
  removeKeybinding: (key: string) => void;
  resetToDefaults: () => void;
  importKeybindings: (config: KeybindingConfig) => void;
  exportKeybindings: () => KeybindingConfig;
  enableKeybindings: () => void;
  disableKeybindings: () => void;

  // Validation
  validateKeybinding: (
    key: string,
    action: ActionWithOptionalArgs
  ) => KeybindingConflict | null;
  getKeybindingsForAction: (action: ActionWithOptionalArgs) => string[];

  // Utility
  getKeybindingString: (ev: KeyboardEvent) => string | null;
}

export const useKeybindingsStore = create<KeybindingsState>()(
  persist(
    (set, get) => ({
      keybindings: { ...defaultKeybindings },
      isCustomized: false,
      keybindingsEnabled: true,

      updateKeybinding: (key: string, action: ActionWithOptionalArgs) => {
        set((state) => {
          const newKeybindings = { ...state.keybindings };
          newKeybindings[key] = action;

          return {
            keybindings: newKeybindings,
            isCustomized: true,
          };
        });
      },

      removeKeybinding: (key: string) => {
        set((state) => {
          const newKeybindings = { ...state.keybindings };
          delete newKeybindings[key];

          return {
            keybindings: newKeybindings,
            isCustomized: true,
          };
        });
      },

      resetToDefaults: () => {
        set({
          keybindings: { ...defaultKeybindings },
          isCustomized: false,
        });
      },

      enableKeybindings: () => {
        set({ keybindingsEnabled: true });
      },

      disableKeybindings: () => {
        set({ keybindingsEnabled: false });
      },

      importKeybindings: (config: KeybindingConfig) => {
        // Validate all keys and actions
        for (const [key, action] of Object.entries(config)) {
          // Validate the key format
          if (typeof key !== "string" || key.length === 0) {
            throw new Error(`Invalid key format: ${key}`);
          }
        }
        set({
          keybindings: { ...config },
          isCustomized: true,
        });
      },

      exportKeybindings: () => {
        return get().keybindings;
      },

      validateKeybinding: (key: string, action: ActionWithOptionalArgs) => {
        const { keybindings } = get();
        const existingAction = keybindings[key];

        if (existingAction && existingAction !== action) {
          return {
            key,
            existingAction,
            newAction: action,
          };
        }

        return null;
      },

      getKeybindingsForAction: (action: ActionWithOptionalArgs) => {
        const { keybindings } = get();
        return Object.keys(keybindings).filter(
          (key) => keybindings[key] === action
        );
      },

      getKeybindingString: (ev: KeyboardEvent) => {
        return generateKeybindingString(ev);
      },
    }),
    {
      name: "opencut-keybindings",
      version: 1,
    }
  )
);

// Utility functions
function generateKeybindingString(ev: KeyboardEvent): string | null {
  const target = ev.target;

  // We may or may not have a modifier key
  const modifierKey = getActiveModifier(ev);

  // We will always have a non-modifier key
  const key = getPressedKey(ev);
  if (!key) return null;

  // All key combos backed by modifiers are valid shortcuts (whether currently typing or not)
  if (modifierKey) {
    // If the modifier is shift and the target is an input, we ignore
    if (
      modifierKey === "shift" &&
      isDOMElement(target) &&
      isTypableElement(target)
    ) {
      return null;
    }

    return `${modifierKey}-${key}`;
  }

  // no modifier key here then we do not do anything while on input
  if (isDOMElement(target) && isTypableElement(target)) return null;

  // single key while not input
  return `${key}`;
}

function getPressedKey(ev: KeyboardEvent): string | null {
  // Sometimes the property code is not available on the KeyboardEvent object
  const key = (ev.key ?? "").toLowerCase();

  // Check arrow keys
  if (key.startsWith("arrow")) {
    return key.slice(5);
  }

  // Check for special keys
  if (key === "tab") return "tab";
  if (key === " " || key === "space") return "space";
  if (key === "home") return "home";
  if (key === "end") return "end";
  if (key === "delete") return "delete";
  if (key === "backspace") return "backspace";

  // Check letter keys
  const isLetter = key.length === 1 && key >= "a" && key <= "z";
  if (isLetter) return key;

  // Check if number keys
  const isDigit = key.length === 1 && key >= "0" && key <= "9";
  if (isDigit) return key;

  // Check if slash, period or enter
  if (key === "/" || key === "." || key === "enter") return key;

  // If no other cases match, this is not a valid key
  return null;
}

function getActiveModifier(ev: KeyboardEvent): string | null {
  const modifierKeys = {
    ctrl: isAppleDevice() ? ev.metaKey : ev.ctrlKey,
    alt: ev.altKey,
    shift: ev.shiftKey,
  };

  // active modifier: ctrl | alt | ctrl-alt | ctrl-shift | ctrl-alt-shift | alt-shift
  // modiferKeys object's keys are sorted to match the above order
  const activeModifier = Object.keys(modifierKeys)
    .filter((key) => modifierKeys[key as keyof typeof modifierKeys])
    .join("-");

  return activeModifier === "" ? null : activeModifier;
}
