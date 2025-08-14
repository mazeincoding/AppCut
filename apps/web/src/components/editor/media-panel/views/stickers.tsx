"use client";

import { useEffect, useState, useMemo } from "react";
import { useStickersStore } from "@/stores/stickers-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import {
  Search,
  Loader2,
  Download,
  Grid3X3,
  Hash,
  Smile,
  ArrowLeft,
  Clock,
  X,
  Sparkles,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  getIconSvgUrl,
  buildIconSvgUrl,
  ICONIFY_HOSTS,
  POPULAR_COLLECTIONS,
} from "@/lib/iconify-api";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface StickerItemProps {
  iconName: string;
  onAdd: (iconName: string) => void;
  isAdding?: boolean;
}

function StickerItem({ iconName, onAdd, isAdding }: StickerItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [hostIndex, setHostIndex] = useState(0);

  useEffect(() => {
    setImageError(false);
    setHostIndex(0);
  }, [iconName]);

  const displayName = iconName.split(":")[1] || iconName;
  const collectionPrefix = iconName.split(":")[0];

  if (imageError) {
    return (
      <div className="aspect-square rounded-lg border bg-muted flex items-center justify-center p-2">
        <span className="text-xs text-muted-foreground text-center break-all">
          {displayName}
        </span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative group aspect-square rounded-lg border border-border/60 bg-muted/70 overflow-hidden cursor-pointer transition-all",
              "hover:border-primary hover:shadow-lg hover:scale-105",
              "max-w-[200px] mx-auto",
              isAdding && "opacity-50 pointer-events-none"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => !isAdding && onAdd(iconName)}
          >
            <div className="w-full h-full p-4 flex items-center justify-center">
              <Image
                src={
                  hostIndex === 0
                    ? getIconSvgUrl(iconName, { width: 64, height: 64 })
                    : buildIconSvgUrl(
                        ICONIFY_HOSTS[
                          Math.min(hostIndex, ICONIFY_HOSTS.length - 1)
                        ],
                        iconName,
                        { width: 64, height: 64 }
                      )
                }
                alt={displayName}
                width={64}
                height={64}
                className="w-full h-full object-contain"
                onError={() => {
                  const next = hostIndex + 1;
                  if (next < ICONIFY_HOSTS.length) {
                    setHostIndex(next);
                  } else {
                    setImageError(true);
                  }
                }}
                loading="lazy"
                unoptimized
              />
            </div>

            {isHovered && !isAdding && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(iconName);
                  }}
                >
                  <Download className="h-3 w-3" />
                  Add
                </Button>
              </div>
            )}

            {isAdding && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{collectionPrefix}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function StickersView() {
  const { activeProject } = useProjectStore();
  const { addMediaItem } = useMediaStore();
  const {
    searchQuery,
    selectedCategory,
    selectedCollection,
    viewMode,
    collections,
    currentCollection,
    searchResults,
    recentStickers,
    searchInCategory,
    isLoadingCollections,
    isLoadingCollection,
    isSearching,
    setSearchQuery,
    setSelectedCategory,
    setSelectedCollection,
    setSearchInCategory,
    setViewMode,
    loadCollections,
    searchStickers,
    downloadSticker,
    clearRecentStickers,
  } = useStickersStore();

  const [addingSticker, setAddingSticker] = useState<string | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [collectionsToShow, setCollectionsToShow] = useState(20);

  useEffect(() => {
    if (Object.keys(collections).length === 0) {
      loadCollections();
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchQuery !== searchQuery) {
        setSearchQuery(localSearchQuery);
        if (localSearchQuery.trim()) {
          searchStickers(localSearchQuery);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearchQuery]);

  const handleAddSticker = async (iconName: string) => {
    if (!activeProject) {
      toast.error("No active project");
      return;
    }

    setAddingSticker(iconName);

    try {
      const file = await downloadSticker(iconName);

      if (!file) {
        throw new Error("Failed to download sticker");
      }

      const mediaItem = {
        name: iconName.replace(":", "-"),
        type: "image" as const,
        file: file,
        url: URL.createObjectURL(file),
        width: 200,
        height: 200,
      };

      await addMediaItem(activeProject.id, mediaItem);

      toast.success(`Added "${iconName}" to media library`);
    } catch (error) {
      console.error("Failed to add sticker:", error);
      toast.error("Failed to add sticker to media");
    } finally {
      setAddingSticker(null);
    }
  };

  const filteredCollections = useMemo(() => {
    if (selectedCategory === "all") {
      return Object.entries(collections);
    }

    const collectionList =
      POPULAR_COLLECTIONS[selectedCategory as keyof typeof POPULAR_COLLECTIONS];
    if (!collectionList) return [];

    return collectionList
      .map((c) => [c.prefix, collections[c.prefix]] as const)
      .filter(([_, collection]) => collection);
  }, [collections, selectedCategory]);

  const iconsToDisplay = useMemo(() => {
    if (viewMode === "search" && searchResults) {
      return searchResults.icons;
    }

    if (viewMode === "collection" && currentCollection) {
      const icons: string[] = [];

      if (currentCollection.uncategorized) {
        icons.push(
          ...currentCollection.uncategorized.map(
            (name) => `${currentCollection.prefix}:${name}`
          )
        );
      }

      if (currentCollection.categories) {
        Object.values(currentCollection.categories).forEach((categoryIcons) => {
          icons.push(
            ...categoryIcons.map(
              (name) => `${currentCollection.prefix}:${name}`
            )
          );
        });
      }

      return icons.slice(0, 100); // first 100 limit
    }

    return [];
  }, [viewMode, searchResults, currentCollection]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search icons..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {localSearchQuery && (
            <button
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 rounded hover:bg-accent flex items-center justify-center"
              onClick={() => {
                setLocalSearchQuery("");
                setSearchQuery("");
                setViewMode("browse");
              }}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {selectedCategory !== "all" && (
          <div className="flex items-center space-x-2">
            <Switch
              id="search-in-category"
              checked={searchInCategory}
              onCheckedChange={setSearchInCategory}
            />
            <Label
              htmlFor="search-in-category"
              className="text-xs text-muted-foreground"
            >
              Search only in{" "}
              {selectedCategory === "general"
                ? "Icons"
                : selectedCategory === "brands"
                  ? "Brands"
                  : selectedCategory === "emoji"
                    ? "Emoji"
                    : selectedCategory}
            </Label>
            <Filter className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="px-3 pt-2 pb-2">
        <Tabs
          value={selectedCategory}
          onValueChange={(v) => setSelectedCategory(v as any)}
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="gap-1">
              <Grid3X3 className="h-3 w-3" />
              All
            </TabsTrigger>
            <TabsTrigger value="general" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Icons
            </TabsTrigger>
            <TabsTrigger value="brands" className="gap-1">
              <Hash className="h-3 w-3" />
              Brands
            </TabsTrigger>
            <TabsTrigger value="emoji" className="gap-1">
              <Smile className="h-3 w-3" />
              Emoji
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 px-3 pb-3">
        {recentStickers.length > 0 && viewMode === "browse" && (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Recent</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={clearRecentStickers}
                      className="ml-auto h-5 w-5 p-0 rounded hover:bg-accent flex items-center justify-center"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear recent stickers</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))",
              }}
            >
              {recentStickers.slice(0, 12).map((iconName) => (
                <StickerItem
                  key={iconName}
                  iconName={iconName}
                  onAdd={handleAddSticker}
                  isAdding={addingSticker === iconName}
                />
              ))}
            </div>
          </div>
        )}

        {viewMode === "collection" && selectedCollection && (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCollection(null)}
                className="gap-1 -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <span className="text-sm font-medium">
                {collections[selectedCollection]?.name || selectedCollection}
              </span>
              <Badge variant="secondary" className="ml-auto">
                {currentCollection?.total || 0} icons
              </Badge>
            </div>

            {isLoadingCollection ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))",
                }}
              >
                {iconsToDisplay.map((iconName) => (
                  <StickerItem
                    key={iconName}
                    iconName={iconName}
                    onAdd={handleAddSticker}
                    isAdding={addingSticker === iconName}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {viewMode === "search" && (
          <div className="mt-3">
            {searchQuery && (
              <div className="flex items-center justify-between mb-3 p-2 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  Showing results for "{searchQuery}"
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
                  onClick={() => {
                    setSearchQuery("");
                    setLocalSearchQuery("");
                    setViewMode("browse");
                  }}
                >
                  Clear
                </Button>
              </div>
            )}
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults?.icons.length ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">
                    {searchResults.total} results
                  </span>
                </div>
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))",
                  }}
                >
                  {iconsToDisplay.map((iconName) => (
                    <StickerItem
                      key={iconName}
                      iconName={iconName}
                      onAdd={handleAddSticker}
                      isAdding={addingSticker === iconName}
                    />
                  ))}
                </div>
              </>
            ) : searchQuery ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No stickers found for "{searchQuery}"
                </p>
              </div>
            ) : null}
          </div>
        )}

        {viewMode === "browse" && !selectedCollection && (
          <div className="mt-3 space-y-4">
            {isLoadingCollections ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {selectedCategory !== "all" && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      Popular{" "}
                      {selectedCategory === "general"
                        ? "Icon Sets"
                        : selectedCategory === "brands"
                          ? "Brand Icons"
                          : "Emoji Sets"}
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {POPULAR_COLLECTIONS[
                        selectedCategory as keyof typeof POPULAR_COLLECTIONS
                      ]?.map((col) => {
                        const collection = collections[col.prefix];
                        if (!collection) return null;

                        return (
                          <Button
                            key={col.prefix}
                            variant="outline"
                            className="justify-between h-auto py-2"
                            onClick={() => setSelectedCollection(col.prefix)}
                          >
                            <div className="text-left">
                              <p className="font-medium">{col.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {collection.total.toLocaleString()} icons
                              </p>
                            </div>
                            <ArrowLeft className="h-4 w-4 rotate-180" />
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedCategory === "all" &&
                  filteredCollections.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">
                        All Collections
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {filteredCollections
                          .slice(0, collectionsToShow)
                          .map(([prefix, collection]) => (
                            <Button
                              key={prefix}
                              variant="outline"
                              className="justify-between h-auto py-2"
                              onClick={() => setSelectedCollection(prefix)}
                            >
                              <div className="text-left">
                                <p className="font-medium">{collection.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {collection.total.toLocaleString()} icons
                                  {collection.category &&
                                    ` • ${collection.category}`}
                                </p>
                              </div>
                              <ArrowLeft className="h-4 w-4 rotate-180" />
                            </Button>
                          ))}
                      </div>
                      {filteredCollections.length > collectionsToShow && (
                        <div className="mt-3 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setCollectionsToShow((prev) => prev + 20)
                            }
                            className="gap-2"
                          >
                            Load More Collections
                            <span className="text-xs text-muted-foreground">
                              ({collectionsToShow} of{" "}
                              {filteredCollections.length})
                            </span>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
              </>
            )}
          </div>
        )}
        <div className="mt-4">
          <p className="text-[11px] leading-tight text-muted-foreground text-center">
            Stickers powered by{" "}
            <a
              href="https://iconify.design"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline"
            >
              Iconify
            </a>
            . Icons are subject to their respective licenses.
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
