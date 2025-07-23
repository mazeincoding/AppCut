import {
  CaptionsIcon,
  ArrowLeftRightIcon,
  SparklesIcon,
  StickerIcon,
  MusicIcon,
  VideoIcon,
  BlendIcon,
  SlidersHorizontalIcon,
  LucideIcon,
  TypeIcon,
  BotIcon,
  ImageIcon,
} from "lucide-react";
import { create } from "zustand";

export type Tab =
  | "media"
  | "audio"
  | "text"
  | "text2image"
  | "stickers"
  | "effects"
  | "transitions"
  | "captions"
  | "filters"
  | "adjustment"
  | "ai";

export const tabs: { [key in Tab]: { icon: LucideIcon; label: string } } = {
  ai: {
    icon: BotIcon,
    label: "AI",
  },
  media: {
    icon: VideoIcon,
    label: "Media",
  },
  adjustment: {
    icon: SlidersHorizontalIcon,
    label: "Adjustment",
  },
  audio: {
    icon: MusicIcon,
    label: "Audio",
  },
  text: {
    icon: TypeIcon,
    label: "Text",
  },
  text2image: {
    icon: ImageIcon,
    label: "Text2Image",
  },
  stickers: {
    icon: StickerIcon,
    label: "Stickers",
  },
  effects: {
    icon: SparklesIcon,
    label: "Effects",
  },
  transitions: {
    icon: ArrowLeftRightIcon,
    label: "Transitions",
  },
  captions: {
    icon: CaptionsIcon,
    label: "Captions",
  },
  filters: {
    icon: BlendIcon,
    label: "Filters",
  },
};

interface MediaPanelStore {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  // AI-specific tab state (separate from main tabs)
  aiActiveTab: "text" | "image";
  setAiActiveTab: (tab: "text" | "image") => void;
}

export const useMediaPanelStore = create<MediaPanelStore>((set) => ({
  activeTab: "media",
  setActiveTab: (tab) => set({ activeTab: tab }),
  aiActiveTab: "text",
  setAiActiveTab: (tab) => set({ aiActiveTab: tab }),
}));
