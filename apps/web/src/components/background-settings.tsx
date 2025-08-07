import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { BackgroundIcon } from "./icons";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { colors } from "@/data/colors/solid";
import { useProjectStore } from "@/stores/project-store";
import { PipetteIcon } from "lucide-react";

type BackgroundTab = "color" | "blur";

export function BackgroundSettings() {
  const { activeProject, updateBackgroundType } = useProjectStore();

  // ✅ Good: derive activeTab from activeProject during rendering
  const activeTab = activeProject?.backgroundType || "color";

  const handleColorSelect = (color: string) => {
    updateBackgroundType("color", { backgroundColor: color });
  };

  const handleBlurSelect = (blurIntensity: number) => {
    updateBackgroundType("blur", { blurIntensity });
  };

  const tabs = [
    {
      label: "Color",
      value: "color",
    },
    {
      label: "Blur",
      value: "blur",
    },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="text"
          size="icon"
          className="size-4! border border-muted-foreground"
        >
          <BackgroundIcon className="size-3!" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col items-start w-[20rem] h-64 overflow-hidden p-0">
        <div className="flex items-center justify-between w-full gap-2 z-10 bg-popover p-3">
          <h2 className="text-sm">Background</h2>
          <div className="flex items-center gap-2 text-sm">
            {tabs.map((tab) => (
              <span
                key={tab.value}
                onClick={() => {
                  // Switch to the background type when clicking tabs
                  if (tab.value === "color") {
                    updateBackgroundType("color", {
                      backgroundColor:
                        activeProject?.backgroundColor || "#000000",
                    });
                  } else {
                    updateBackgroundType("blur", {
                      blurIntensity: activeProject?.blurIntensity || 8,
                    });
                  }
                }}
                className={cn(
                  "text-muted-foreground cursor-pointer",
                  activeTab === tab.value && "text-foreground"
                )}
              >
                {tab.label}
              </span>
            ))}
          </div>
        </div>
        {activeTab === "color" ? (
          <ColorView
            selectedColor={activeProject?.backgroundColor || "#000000"}
            onColorSelect={handleColorSelect}
          />
        ) : (
          <BlurView
            selectedBlur={activeProject?.blurIntensity || 8}
            onBlurSelect={handleBlurSelect}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

function ColorView({
  selectedColor,
  onColorSelect,
}: {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}) {
  return (
    <div className="w-full h-full">
      <div className="absolute top-8 left-0 w-[calc(100%-1rem)] h-12 bg-linear-to-b from-popover to-transparent pointer-events-none" />
      <div className="grid grid-cols-4 gap-2 w-full h-full p-3 pt-0 overflow-auto">
        <div className="w-full aspect-square rounded-sm cursor-pointer border border-foreground/15 hover:border-primary flex items-center justify-center">
          <PipetteIcon className="size-4" />
        </div>
        {colors.map((color) => (
          <ColorItem
            key={color}
            color={color}
            isSelected={color === selectedColor}
            onClick={() => onColorSelect(color)}
          />
        ))}
      </div>
    </div>
  );
}

function ColorItem({
  color,
  isSelected,
  onClick,
}: {
  color: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        "w-full aspect-square rounded-sm cursor-pointer hover:border-2 hover:border-primary",
        isSelected && "border-2 border-primary"
      )}
      style={{ backgroundColor: color }}
      onClick={onClick}
    />
  );
}

function BlurView({
  selectedBlur,
  onBlurSelect,
}: {
  selectedBlur: number;
  onBlurSelect: (blurIntensity: number) => void;
}) {
  const blurLevels = [
    { label: "Light", value: 4 },
    { label: "Medium", value: 8 },
    { label: "Heavy", value: 18 },
  ];
  const blurImage =
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

  return (
    <div className="grid grid-cols-3 gap-2 w-full p-3 pt-0">
      {blurLevels.map((blur) => (
        <div
          key={blur.value}
          className={cn(
            "w-full aspect-square rounded-sm cursor-pointer hover:border-2 hover:border-primary relative overflow-hidden",
            selectedBlur === blur.value && "border-2 border-primary"
          )}
          onClick={() => onBlurSelect(blur.value)}
        >
          <Image
            src={blurImage}
            alt={`Blur preview ${blur.label}`}
            fill
            className="object-cover"
            style={{ filter: `blur(${blur.value}px)` }}
          />
          <div className="absolute bottom-1 left-1 right-1 text-center">
            <span className="text-xs text-white bg-black/50 px-1 rounded">
              {blur.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
