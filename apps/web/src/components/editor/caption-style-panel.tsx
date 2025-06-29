'use client';

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Paintbrush, Text, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { Caption } from "@/types/editor";
import { rgbaToHex, hexToRgba } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CaptionStylePanelProps {
  currentCaption: Caption | null;
  onStyleChange: (style: Partial<Caption["style"]>) => void;
  onApplyToAllBelow?: (style: Partial<Caption["style"]>) => void;
}

export function CaptionStylePanel({ currentCaption, onStyleChange, onApplyToAllBelow }: CaptionStylePanelProps) {
  const [isBackgroundTransparent, setIsBackgroundTransparent] = useState(
    currentCaption?.style?.backgroundColor === "transparent"
  );
  const [isApplyingStyle, setIsApplyingStyle] = useState(false);

  // Synchronize isBackgroundTransparent state with currentCaption changes
  useEffect(() => {
    setIsBackgroundTransparent(currentCaption?.style?.backgroundColor === "transparent");
  }, [currentCaption?.id, currentCaption?.style?.backgroundColor]);

  const handleStyleChange = (updates: Partial<NonNullable<Caption["style"]>>) => {
    if (!currentCaption) return;
    
    onStyleChange({
      ...currentCaption.style,
      ...updates,
    });
  };

  const handleApplyToAllBelow = async () => {
    if (!onApplyToAllBelow || !currentCaption) return;
    
    setIsApplyingStyle(true);
    
    // Simulate a small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onApplyToAllBelow(currentCaption.style || {});
    setIsApplyingStyle(false);
  };

  const fonts = [
    "Arial",
    "Verdana",
    "Helvetica",
    "Tahoma",
    "Trebuchet MS",
    "Times New Roman",
    "Georgia",
    "Garamond",
    "Courier New",
    "Brush Script MT",
  ];

  const animations = [
    { label: "None", value: "none" },
    { label: "Fade In", value: "fadeIn" },
    { label: "Bounce In", value: "bounceIn" },
    { label: "Typewriter", value: "typewriter" },
  ];

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full text-card-foreground bg-card rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-primary">Text Styling</h2>

      {/* Font & Size */}
      <div className="space-y-4 p-4 border rounded-md bg-accent/20">
        <h3 className="text-lg font-semibold mb-2">Font Styles</h3>
        <div>
          <Label htmlFor="fontFamily" className="text-sm font-medium">Font Family</Label>
          <Select
            value={currentCaption?.style?.fontFamily || ""}
            onValueChange={(value) => handleStyleChange({ fontFamily: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a font" />
            </SelectTrigger>
            <SelectContent>
              {fonts.map((font) => (
                <SelectItem key={font} value={font}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="fontSize" className="text-sm font-medium">Font Size ({currentCaption?.style?.fontSize || "16px"})</Label>
          <Slider
            min={10}
            max={100}
            step={1}
            value={[parseInt(currentCaption?.style?.fontSize || "16")]}
            onValueChange={(val) => handleStyleChange({ fontSize: `${val[0]}px` })}
            className="mt-2"
          />
          <Input
            id="fontSize"
            type="number"
            value={parseInt(currentCaption?.style?.fontSize || "16")}
            onChange={(e) => handleStyleChange({ fontSize: `${e.target.value}px` })}
            className="mt-2"
          />
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-4 p-4 border rounded-md bg-accent/20">
        <h3 className="text-lg font-semibold mb-2">Colors</h3>
        <div>
          <Label htmlFor="textColor" className="text-sm font-medium">Text Color</Label>
          <Input
            id="textColor"
            type="color"
            value={currentCaption?.style?.color || "#ffffff"}
            onChange={(e) => handleStyleChange({ color: e.target.value })}
            className="w-full h-10 mt-1"
          />
        </div>

        <div>
          <Label htmlFor="backgroundColor" className="text-sm font-medium">Background Color</Label>
          <div className="flex items-center space-x-2 mt-2">
            <Switch
              id="transparent-background"
              checked={isBackgroundTransparent}
              onCheckedChange={(checked) => {
                const newValue = checked ? "transparent" : "rgba(0,0,0,0.7)";
                handleStyleChange({ backgroundColor: newValue });
              }}
            />
            <Label htmlFor="transparent-background">Transparent Background</Label>
          </div>
          <Input
            id="backgroundColor"
            type="color"
            value={currentCaption?.style?.backgroundColor?.startsWith("rgba(") ? 
              rgbaToHex(currentCaption.style.backgroundColor)
              : currentCaption?.style?.backgroundColor || "#000000"
            }
            onChange={(e) => {
              const hex = e.target.value;
              handleStyleChange({ backgroundColor: hexToRgba(hex, 0.7) });
            }}
            className="w-full h-10 mt-1"
            disabled={isBackgroundTransparent} // Disable when transparent
          />
        </div>
      </div>

      {/* Border (Stroke) & Text Shadow */}
      <div className="space-y-4 p-4 border rounded-md bg-accent/20">
        <h3 className="text-lg font-semibold mb-2">Effects</h3>
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {isBackgroundTransparent ? "Text Stroke (Outline)" : "Border"}
          </Label>
          <div>
            <Label htmlFor="borderWidth" className="text-xs text-muted-foreground">Width ({currentCaption?.style?.borderWidth || "0px"})</Label>
            <Slider
              min={0}
              max={10}
              step={0.5}
              value={[parseInt(currentCaption?.style?.borderWidth || "0")]}
              onValueChange={(val) => handleStyleChange({ borderWidth: `${val[0]}px` })}
              className="mt-2"
            />
            <Input
              id="borderWidth"
              type="number"
              value={parseInt(currentCaption?.style?.borderWidth || "0")}
              onChange={(e) => handleStyleChange({ borderWidth: `${e.target.value}px` })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="borderColor" className="text-xs text-muted-foreground">Color</Label>
            <Input
              id="borderColor"
              type="color"
              value={currentCaption?.style?.borderColor || "#ffffff"}
              onChange={(e) => handleStyleChange({ borderColor: e.target.value })}
              className="w-full h-8 mt-1"
            />
          </div>
        </div>
      </div>

      {/* Alignment & Spacing */}
      <div className="space-y-4 p-4 border rounded-md bg-accent/20">
        <h3 className="text-lg font-semibold mb-2">Layout & Spacing</h3>
        <div>
          <Label htmlFor="textAlign" className="text-sm font-medium">Text Alignment</Label>
          <ToggleGroup
            type="single"
            value={currentCaption?.style?.textAlign || "center"}
            onValueChange={(value: "left" | "center" | "right") => handleStyleChange({ textAlign: value })}
            className="mt-2 w-full justify-around"
          >
            <ToggleGroupItem value="left" aria-label="Left align">
              <AlignLeft className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="center" aria-label="Center align">
              <AlignCenter className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="right" aria-label="Right align">
              <AlignRight className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div>
          <Label htmlFor="lineHeight" className="text-sm font-medium">Line Spacing ({currentCaption?.style?.lineHeight || "1.2"})</Label>
          <Slider
            min={0.8}
            max={2.5}
            step={0.1}
            value={[parseFloat(currentCaption?.style?.lineHeight || "1.2")]}
            onValueChange={(val) => handleStyleChange({ lineHeight: `${val[0]}` })}
            className="mt-2"
          />
          <Input
            id="lineHeight"
            type="number"
            step="0.1"
            value={parseFloat(currentCaption?.style?.lineHeight || "1.2")}
            onChange={(e) => handleStyleChange({ lineHeight: e.target.value })}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="letterSpacing" className="text-sm font-medium">Letter Spacing ({currentCaption?.style?.letterSpacing || "0px"})</Label>
          <Slider
            min={-5}
            max={10}
            step={0.5}
            value={[parseFloat(currentCaption?.style?.letterSpacing || "0")]}
            onValueChange={(val) => handleStyleChange({ letterSpacing: `${val[0]}px` })}
            className="mt-2"
          />
          <Input
            id="letterSpacing"
            type="number"
            step="0.5"
            value={parseFloat(currentCaption?.style?.letterSpacing || "0")}
            onChange={(e) => handleStyleChange({ letterSpacing: `${e.target.value}px` })}
            className="mt-2"
          />
        </div>
      </div>

      {/* Animation */}
      <div className="space-y-4 p-4 border rounded-md bg-accent/20">
        <h3 className="text-lg font-semibold mb-2">Animation</h3>
        <div>
          <Label htmlFor="animation" className="text-sm font-medium">Animation</Label>
          <Select
            value={currentCaption?.style?.animation || "none"}
            onValueChange={(value) => handleStyleChange({ animation: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an animation" />
            </SelectTrigger>
            <SelectContent>
              {animations.map((anim) => (
                <SelectItem key={anim.value} value={anim.value}>
                  {anim.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Text Wrapping & Overflow */}
      <div className="space-y-4 p-4 border rounded-md bg-accent/20">
        <h3 className="text-lg font-semibold mb-2">Text Wrapping & Overflow</h3>
        <div className="space-y-3">
          {/* Text Wrapping */}
          <div>
            <Label htmlFor="whiteSpace" className="text-sm font-medium">Text Wrapping</Label>
            <Select
              value={currentCaption?.style?.whiteSpace || "nowrap"}
              onValueChange={(value: "nowrap" | "normal" | "pre-wrap") => handleStyleChange({ whiteSpace: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select text wrapping" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nowrap">No Wrap (Single Line)</SelectItem>
                <SelectItem value="normal">Normal Wrap</SelectItem>
                <SelectItem value="pre-wrap">Preserve Formatting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Overflow Handling */}
          <div>
            <Label htmlFor="overflow" className="text-sm font-medium">Overflow Handling</Label>
            <Select
              value={currentCaption?.style?.overflow || "visible"}
              onValueChange={(value: "visible" | "hidden" | "ellipsis") => handleStyleChange({ overflow: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select overflow handling" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visible">Visible (Show All)</SelectItem>
                <SelectItem value="hidden">Hidden (Cut Off)</SelectItem>
                <SelectItem value="ellipsis">Ellipsis (...)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Max Width */}
          <div>
            <Label htmlFor="maxWidth" className="text-sm font-medium">Maximum Width</Label>
            <Input
              id="maxWidth"
              type="text"
              placeholder="e.g., 300px, 50vw, 80%"
              value={currentCaption?.style?.maxWidth || "80vw"}
              onChange={(e) => handleStyleChange({ maxWidth: e.target.value })}
              className="w-full mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum width for text wrapping (px, vw, %, etc.)
            </p>
          </div>
        </div>
      </div>

      {/* Apply to All Below Button */}
      {onApplyToAllBelow && currentCaption && (
        <div className="space-y-4 p-4 border rounded-md bg-accent/20">
          <h3 className="text-lg font-semibold mb-2">Style Management</h3>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Apply current style to all captions below this one
            </p>
            <Button
              onClick={handleApplyToAllBelow}
              className="w-full"
              variant="outline"
              disabled={isApplyingStyle}
            >
              {isApplyingStyle ? "Applying..." : "Apply to All Below"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
