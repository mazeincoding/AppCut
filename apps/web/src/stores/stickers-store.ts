import { create } from "zustand";
import {
  getCollections,
  getCollection,
  searchIcons,
  downloadSvgAsText,
  svgToFile,
  type IconSet,
  type CollectionInfo,
  type IconSearchResult,
} from "@/lib/iconify-api";

interface StickersStore {
  searchQuery: string;
  selectedCategory: "all" | "general" | "brands" | "emoji";
  selectedCollection: string | null;
  viewMode: "search" | "browse" | "collection";
  searchInCategory: boolean;

  collections: Record<string, IconSet>;
  currentCollection: CollectionInfo | null;
  searchResults: IconSearchResult | null;
  recentStickers: string[];
  isLoadingCollections: boolean;
  isLoadingCollection: boolean;
  isSearching: boolean;
  isDownloading: boolean;

  setSearchQuery: (query: string) => void;
  setSelectedCategory: (
    category: "all" | "general" | "brands" | "emoji"
  ) => void;
  setSelectedCollection: (collection: string | null) => void;
  setViewMode: (mode: "search" | "browse" | "collection") => void;
  setSearchInCategory: (searchInCategory: boolean) => void;

  loadCollections: () => Promise<void>;
  loadCollection: (prefix: string) => Promise<void>;
  searchStickers: (query: string) => Promise<void>;
  downloadSticker: (iconName: string) => Promise<File | null>;

  addToRecentStickers: (iconName: string) => void;
  clearRecentStickers: () => void;
}

const MAX_RECENT_STICKERS = 50;

export const useStickersStore = create<StickersStore>((set, get) => ({
  searchQuery: "",
  selectedCategory: "all",
  selectedCollection: null,
  viewMode: "browse",
  searchInCategory: false,

  collections: {},
  currentCollection: null,
  searchResults: null,
  recentStickers: [],

  isLoadingCollections: false,
  isLoadingCollection: false,
  isSearching: false,
  isDownloading: false,

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedCategory: (category) =>
    set({
      selectedCategory: category,
      viewMode: "browse",
      selectedCollection: null,
      currentCollection: null,
    }),

  setSelectedCollection: (collection) => {
    set({
      selectedCollection: collection,
      viewMode: collection ? "collection" : "browse",
      currentCollection: null,
    });

    if (collection) {
      get().loadCollection(collection);
    }
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  setSearchInCategory: (searchInCategory) => set({ searchInCategory }),

  loadCollections: async () => {
    set({ isLoadingCollections: true });
    try {
      const collections = await getCollections();
      set({ collections });
    } catch (error) {
      console.error("Failed to load collections:", error);
    } finally {
      set({ isLoadingCollections: false });
    }
  },

  loadCollection: async (prefix: string) => {
    set({ isLoadingCollection: true });
    try {
      const collection = await getCollection(prefix);
      set({ currentCollection: collection });
    } catch (error) {
      console.error(`Failed to load collection ${prefix}:`, error);
      set({ currentCollection: null });
    } finally {
      set({ isLoadingCollection: false });
    }
  },

  searchStickers: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: null, viewMode: "browse" });
      return;
    }

    const { searchInCategory, selectedCategory } = get();

    set({ isSearching: true, viewMode: "search" });
    try {
      let searchParams: any = { limit: 100 };

      if (searchInCategory && selectedCategory !== "all") {
        if (selectedCategory === "general") {
          searchParams.category = "General";
        } else if (selectedCategory === "brands") {
          searchParams.category = "Brands / Social";
        } else if (selectedCategory === "emoji") {
          searchParams.category = "Emoji";
        }
      }

      const results = await searchIcons(
        query,
        searchParams.limit,
        undefined,
        searchParams.category
      );
      set({ searchResults: results });
    } catch (error) {
      console.error("Search failed:", error);
      set({ searchResults: null });
    } finally {
      set({ isSearching: false });
    }
  },

  downloadSticker: async (iconName: string) => {
    set({ isDownloading: true });
    try {
      const svgText = await downloadSvgAsText(iconName, {
        width: 200,
        height: 200,
      });

      const fileName = `${iconName.replace(":", "-")}.svg`;
      const file = svgToFile(svgText, fileName);

      get().addToRecentStickers(iconName);

      return file;
    } catch (error) {
      console.error(`Failed to download sticker ${iconName}:`, error);
      return null;
    } finally {
      set({ isDownloading: false });
    }
  },

  addToRecentStickers: (iconName: string) => {
    set((state) => {
      const recent = [
        iconName,
        ...state.recentStickers.filter((s) => s !== iconName),
      ];
      return {
        recentStickers: recent.slice(0, MAX_RECENT_STICKERS),
      };
    });
  },

  clearRecentStickers: () => set({ recentStickers: [] }),
}));
