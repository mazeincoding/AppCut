import { isAppleDevice, isDOMElement, isTypableElement } from "@/lib/utils";
import { useEffect } from "react";
import { ActionWithOptionalArgs, invokeAction } from "./actions";

/**
 * This variable keeps track whether keybindings are being accepted
 * true -> Keybindings are checked
 * false -> Key presses are ignored (Keybindings are not checked)
 */
let keybindingsEnabled = true;

/**
 * Alt is also regarded as macOS OPTION (⌥) key
 * Ctrl is also regarded as macOS COMMAND (⌘) key (NOTE: this differs from HTML Keyboard spec where COMMAND is Meta key!)
 */
type ModifierKeys =
  | "ctrl"
  | "alt"
  | "shift"
  | "ctrl-shift"
  | "alt-shift"
  | "ctrl-alt"
  | "ctrl-alt-shift";

/* eslint-disable prettier/prettier */
// prettier-ignore
type Key =
  | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j"
  | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t"
  | "u" | "v" | "w" | "x" | "y" | "z" | "0" | "1" | "2" | "3"
  | "4" | "5" | "6" | "7" | "8" | "9" | "up" | "down" | "left"
  | "right" | "/" | "?" | "." | "enter" | "tab" | "space" | "home"
  | "end" | "delete" | "backspace";
/* eslint-enable */

type ModifierBasedShortcutKey = `${ModifierKeys}-${Key}`;
// Singular keybindings (these will be disabled when an input-ish area has been focused)
type SingleCharacterShortcutKey = `${Key}`;

type ShortcutKey = ModifierBasedShortcutKey | SingleCharacterShortcutKey;

// Base bindings available on all platforms
const baseBindings: {
  [_ in ShortcutKey]?: ActionWithOptionalArgs;
} = {
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

/**
 * Get bindings based on the current kernel mode
 */
function getActiveBindings(): typeof baseBindings {
  return baseBindings;
}

export const bindings = getActiveBindings();

/**
 * A composable that hooks to the caller component's
 * lifecycle and hooks to the keyboard events to fire
 * the appropriate actions based on keybindings
 */
export function useKeybindingsListener() {
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}

function handleKeyDown(ev: KeyboardEvent) {
  // Do not check keybinds if the mode is disabled
  if (!keybindingsEnabled) return;

  const binding = generateKeybindingString(ev);
  if (!binding) return;

  const activeBindings = getActiveBindings();
  const boundAction = activeBindings[binding];
  if (!boundAction) return;

  ev.preventDefault();

  invokeAction(boundAction, undefined, "keypress");
}

function generateKeybindingString(ev: KeyboardEvent): ShortcutKey | null {
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

function getPressedKey(ev: KeyboardEvent): Key | null {
  // Sometimes the property code is not available on the KeyboardEvent object
  const key = (ev.key ?? "").toLowerCase();

  // Check arrow keys
  if (key.startsWith("arrow")) {
    return key.slice(5) as Key;
  }

  // Check for Tab key
  if (key === "tab") return "tab";

  // Check for special keys
  if (key === "home") return "home";
  if (key === "end") return "end";
  if (key === "delete") return "delete";
  if (key === "backspace") return "backspace";

  // Check letter keys
  const isLetter = key.length === 1 && key >= "a" && key <= "z";
  if (isLetter) return key as Key;

  // Check if number keys
  const isDigit = key.length === 1 && key >= "0" && key <= "9";
  if (isDigit) return key as Key;

  // Check if slash, period or enter
  if (key === "/" || key === "." || key === "enter") return key;

  // If no other cases match, this is not a valid key
  return null;
}

function getActiveModifier(ev: KeyboardEvent): ModifierKeys | null {
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

  return activeModifier === "" ? null : (activeModifier as ModifierKeys);
}

/**
 * This composable allows for the UI component to be disabled if the component in question is mounted
 */
export function useKeybindingDisabler() {
  // TODO: Move to a lock based system that keeps the bindings disabled until all locks are lifted
  const disableKeybindings = () => {
    keybindingsEnabled = false;
  };

  const enableKeybindings = () => {
    keybindingsEnabled = true;
  };

  return {
    disableKeybindings,
    enableKeybindings,
  };
}
