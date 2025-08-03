"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PropertyItem,
  PropertyItemLabel,
  PropertyItemValue,
  PropertyGroup,
} from "../../properties-panel/property-item";
import { FPS_PRESETS } from "@/constants/timeline-constants";
import { useProjectStore } from "@/stores/project-store";
import { useEditorStore } from "@/stores/editor-store";
import { useAspectRatio } from "@/hooks/use-aspect-ratio";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { colors } from "@/data/colors/solid";
import { patternCraftGradients } from "@/data/colors/pattern-craft";
import { PipetteIcon } from "lucide-react";
import { useMemo, memo, useCallback } from "react";
import { syntaxUIGradients } from "@/data/colors/syntax-ui";

export function SettingsView() {
  return <ProjectSettingsTabs />;
}

function ProjectSettingsTabs() {
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="project-info" className="flex flex-col h-full">
        <div className="px-3 pt-4 pb-0">
          <TabsList>
            <TabsTrigger value="project-info">Project info</TabsTrigger>
            <TabsTrigger value="background">Background</TabsTrigger>
          </TabsList>
        </div>
        <Separator className="my-4" />
        <ScrollArea className="flex-1">
          <TabsContent value="project-info" className="p-5 pt-0 mt-0">
            <ProjectInfoView />
          </TabsContent>
          <TabsContent value="background" className="p-4 pt-0">
            <BackgroundView />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function ProjectInfoView() {
  const { activeProject, updateProjectFps } = useProjectStore();
  const { canvasPresets, setCanvasSize } = useEditorStore();
  const { getDisplayName } = useAspectRatio();

  const handleAspectRatioChange = (value: string) => {
    const preset = canvasPresets.find((p) => p.name === value);
    if (preset) {
      setCanvasSize({ width: preset.width, height: preset.height });
    }
  };

  const handleFpsChange = (value: string) => {
    const fps = parseFloat(value);
    updateProjectFps(fps);
  };

  return (
    <div className="flex flex-col gap-4">
      <PropertyItem direction="column">
        <PropertyItemLabel>Name</PropertyItemLabel>
        <PropertyItemValue>
          {activeProject?.name || "Untitled project"}
        </PropertyItemValue>
      </PropertyItem>

      <PropertyItem direction="column">
        <PropertyItemLabel>Aspect ratio</PropertyItemLabel>
        <PropertyItemValue>
          <Select
            value={getDisplayName()}
            onValueChange={handleAspectRatioChange}
          >
            <SelectTrigger className="bg-panel-accent">
              <SelectValue placeholder="Select an aspect ratio" />
            </SelectTrigger>
            <SelectContent>
              {canvasPresets.map((preset) => (
                <SelectItem key={preset.name} value={preset.name}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyItemValue>
      </PropertyItem>

      <PropertyItem direction="column">
        <PropertyItemLabel>Frame rate</PropertyItemLabel>
        <PropertyItemValue>
          <Select
            value={(activeProject?.fps || 30).toString()}
            onValueChange={handleFpsChange}
          >
            <SelectTrigger className="bg-panel-accent">
              <SelectValue placeholder="Select a frame rate" />
            </SelectTrigger>
            <SelectContent>
              {FPS_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyItemValue>
      </PropertyItem>
    </div>
  );
}

const BlurPreview = memo(
  ({
    blur,
    isSelected,
    onSelect,
  }: {
    blur: { label: string; value: number };
    isSelected: boolean;
    onSelect: () => void;
  }) => (
    <div
      className={cn(
        "w-full aspect-square rounded-sm cursor-pointer border border-foreground/15 hover:border-primary relative overflow-hidden",
        isSelected && "border-2 border-primary"
      )}
      onClick={onSelect}
    >
      <Image
        src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        alt={`Blur preview ${blur.label}`}
        fill
        className="object-cover"
        style={{ filter: `blur(${blur.value}px)` }}
        loading="eager"
      />
      <div className="absolute bottom-1 left-1 right-1 text-center">
        <span className="text-xs text-white bg-black/50 px-1 rounded">
          {blur.label}
        </span>
      </div>
    </div>
  )
);

BlurPreview.displayName = "BlurPreview";

const BackgroundPreviews = memo(
  ({
    backgrounds,
    currentBackgroundColor,
    isColorBackground,
    handleColorSelect,
    useBackgroundColor = false,
  }: {
    backgrounds: string[];
    currentBackgroundColor: string;
    isColorBackground: boolean;
    handleColorSelect: (bg: string) => void;
    useBackgroundColor?: boolean;
  }) => {
    return useMemo(
      () =>
        backgrounds.map((bg) => (
          <div
            key={bg}
            className={cn(
              "w-full aspect-square rounded-sm cursor-pointer border border-foreground/15 hover:border-primary",
              isColorBackground &&
                bg === currentBackgroundColor &&
                "border-2 border-primary"
            )}
            style={
              useBackgroundColor
                ? { backgroundColor: bg }
                : {
                    background: bg,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }
            }
            onClick={() => handleColorSelect(bg)}
          />
        )),
      [
        backgrounds,
        isColorBackground,
        currentBackgroundColor,
        handleColorSelect,
        useBackgroundColor,
      ]
    );
  }
);

BackgroundPreviews.displayName = "BackgroundPreviews";

function BackgroundView() {
  const { activeProject, updateBackgroundType } = useProjectStore();

  const blurLevels = useMemo(
    () => [
      { label: "Light", value: 4 },
      { label: "Medium", value: 8 },
      { label: "Heavy", value: 18 },
    ],
    []
  );

  const handleBlurSelect = useCallback(
    async (blurIntensity: number) => {
      await updateBackgroundType("blur", { blurIntensity });
    },
    [updateBackgroundType]
  );

  const handleColorSelect = useCallback(
    async (color: string) => {
      await updateBackgroundType("color", { backgroundColor: color });
    },
    [updateBackgroundType]
  );

  const currentBlurIntensity = activeProject?.blurIntensity || 8;
  const isBlurBackground = activeProject?.backgroundType === "blur";
  const currentBackgroundColor = activeProject?.backgroundColor || "#000000";
  const isColorBackground = activeProject?.backgroundType === "color";

  const blurPreviews = useMemo(
    () =>
      blurLevels.map((blur) => (
        <BlurPreview
          key={blur.value}
          blur={blur}
          isSelected={isBlurBackground && currentBlurIntensity === blur.value}
          onSelect={() => handleBlurSelect(blur.value)}
        />
      )),
    [blurLevels, isBlurBackground, currentBlurIntensity, handleBlurSelect]
  );

  return (
    <div className="flex flex-col gap-5">
      <PropertyGroup title="Blur" defaultExpanded={false}>
        <div className="grid grid-cols-4 gap-2 w-full">{blurPreviews}</div>
      </PropertyGroup>

      <PropertyGroup title="Colors" defaultExpanded={false}>
        <div className="grid grid-cols-4 gap-2 w-full">
          <div className="w-full aspect-square rounded-sm cursor-pointer border border-foreground/15 hover:border-primary flex items-center justify-center">
            <PipetteIcon className="size-4" />
          </div>
          <BackgroundPreviews
            backgrounds={colors}
            currentBackgroundColor={currentBackgroundColor}
            isColorBackground={isColorBackground}
            handleColorSelect={handleColorSelect}
            useBackgroundColor={true}
          />
        </div>
      </PropertyGroup>

      <PropertyGroup title="Pattern Craft" defaultExpanded={false}>
        <div className="grid grid-cols-4 gap-2 w-full">
          <BackgroundPreviews
            backgrounds={patternCraftGradients}
            currentBackgroundColor={currentBackgroundColor}
            isColorBackground={isColorBackground}
            handleColorSelect={handleColorSelect}
          />
        </div>
      </PropertyGroup>

      <PropertyGroup title="Syntax UI" defaultExpanded={false}>
        <div className="grid grid-cols-4 gap-2 w-full">
          <BackgroundPreviews
            backgrounds={syntaxUIGradients}
            currentBackgroundColor={currentBackgroundColor}
            isColorBackground={isColorBackground}
            handleColorSelect={handleColorSelect}
          />
        </div>
      </PropertyGroup>
    </div>
  );
}
