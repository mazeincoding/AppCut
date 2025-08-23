import { Textarea } from "@/components/ui/textarea";
import { FontPicker } from "@/components/ui/font-picker";
import { FontFamily } from "@/constants/font-constants";
import { TextElement } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch"; // Add Switch import
import { useEffect, useState, useRef } from "react";
import { useProjectStore, DEFAULT_CANVAS_SIZE } from "@/stores/project-store";
import {
  PropertyItem,
  PropertyItemLabel,
  PropertyItemValue,
} from "./property-item";

export function TextProperties({
  element,
  trackId,
}: {
  element: TextElement;
  trackId: string;
}) {
  const { updateTextElement } = useTimelineStore();
  const { activeProject } = useProjectStore();

  const [fontSizeInput, setFontSizeInput] = useState(
    element.fontSize.toString()
  );
  const [opacityInput, setOpacityInput] = useState(
    Math.round(element.opacity * 100).toString()
  );

  const canvasWidth = activeProject?.canvasSize?.width || DEFAULT_CANVAS_SIZE.width;
  const canvasHeight = activeProject?.canvasSize?.height || DEFAULT_CANVAS_SIZE.height;
  const posXMin = -Math.floor(canvasWidth / 2);
  const posXMax = Math.floor(canvasWidth / 2);
  const posYMin = -Math.floor(canvasHeight / 2);
  const posYMax = Math.floor(canvasHeight / 2);

  const [xInput, setXInput] = useState(element.x.toString());
  const [yInput, setYInput] = useState(element.y.toString());
  const [rotationInput, setRotationInput] = useState(element.rotation.toString());

  const lastSelectedColor = useRef("#000000");

  const parseAndValidateNumber = (
    value: string,
    min: number,
    max: number,
    fallback: number
  ): number => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
  };

  useEffect(() => {
    setXInput(element.x.toString());
  }, [element.x]);
  useEffect(() => {
    setYInput(element.y.toString());
  }, [element.y]);
  useEffect(() => {
    setRotationInput(element.rotation.toString());
  }, [element.rotation]);

  const handleXChange = (value: string) => {
    setXInput(value);
    if (value.trim() !== "") {
      const x = parseAndValidateNumber(value, posXMin, posXMax, element.x);
      updateTextElement(trackId, element.id, { x });
    }
  };
  const handleXBlur = () => {
    const x = parseAndValidateNumber(xInput, posXMin, posXMax, element.x);
    setXInput(x.toString());
    updateTextElement(trackId, element.id, { x });
  };

  const handleYChange = (value: string) => {
    setYInput(value);
    if (value.trim() !== "") {
      const y = parseAndValidateNumber(value, posYMin, posYMax, element.y);
      updateTextElement(trackId, element.id, { y });
    }
  };
  const handleYBlur = () => {
    const y = parseAndValidateNumber(yInput, posYMin, posYMax, element.y);
    setYInput(y.toString());
    updateTextElement(trackId, element.id, { y });
  };

  const handleRotationChange = (value: string) => {
    setRotationInput(value);
    if (value.trim() !== "") {
      const rotation = parseAndValidateNumber(value, -180, 180, element.rotation);
      updateTextElement(trackId, element.id, { rotation });
    }
  };
  const handleRotationBlur = () => {
    const rotation = parseAndValidateNumber(
      rotationInput,
      -180,
      180,
      element.rotation
    );
    setRotationInput(rotation.toString());
    updateTextElement(trackId, element.id, { rotation });
  };

  const handleFontSizeChange = (value: string) => {
    setFontSizeInput(value);

    if (value.trim() !== "") {
      const fontSize = parseAndValidateNumber(value, 8, 300, element.fontSize);
      updateTextElement(trackId, element.id, { fontSize });
    }
  };

  const handleFontSizeBlur = () => {
    const fontSize = parseAndValidateNumber(
      fontSizeInput,
      8,
      300,
      element.fontSize
    );
    setFontSizeInput(fontSize.toString());
    updateTextElement(trackId, element.id, { fontSize });
  };

  const handleOpacityChange = (value: string) => {
    setOpacityInput(value);

    if (value.trim() !== "") {
      const opacityPercent = parseAndValidateNumber(
        value,
        0,
        100,
        Math.round(element.opacity * 100)
      );
      updateTextElement(trackId, element.id, { opacity: opacityPercent / 100 });
    }
  };

  const handleOpacityBlur = () => {
    const opacityPercent = parseAndValidateNumber(
      opacityInput,
      0,
      100,
      Math.round(element.opacity * 100)
    );
    setOpacityInput(opacityPercent.toString());
    updateTextElement(trackId, element.id, { opacity: opacityPercent / 100 });
  };

  // Update last selected color when a new color is picked
  const handleColorChange = (color: string) => {
    if (color !== "transparent") {
      lastSelectedColor.current = color;
    }
    updateTextElement(trackId, element.id, { backgroundColor: color });
  };

  // Toggle between transparent and last selected color
  const handleTransparentToggle = (isTransparent: boolean) => {
    const newColor = isTransparent ? "transparent" : lastSelectedColor.current;
    updateTextElement(trackId, element.id, { backgroundColor: newColor });
  };

  return (
    <div className="space-y-6 p-5">
      <Textarea
        placeholder="Name"
        defaultValue={element.content}
        className="min-h-18 resize-none bg-background/50"
        onChange={(e) =>
          updateTextElement(trackId, element.id, { content: e.target.value })
        }
      />
      <PropertyItem direction="row">
        <PropertyItemLabel>Font</PropertyItemLabel>
        <PropertyItemValue>
          <FontPicker
            defaultValue={element.fontFamily}
            onValueChange={(value: FontFamily) =>
              updateTextElement(trackId, element.id, { fontFamily: value })
            }
          />
        </PropertyItemValue>
      </PropertyItem>
      
        <PropertyItem direction="row">
          <PropertyItemLabel>Style</PropertyItemLabel>
          <PropertyItemValue>
            <div className="flex items-center gap-2">
              <Button
                variant={element.fontWeight === "bold" ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  updateTextElement(trackId, element.id, {
                    fontWeight:
                      element.fontWeight === "bold" ? "normal" : "bold",
                  })
                }
                className="h-8 px-3 font-bold"
              >
                B
              </Button>
              <Button
                variant={element.fontStyle === "italic" ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  updateTextElement(trackId, element.id, {
                    fontStyle:
                      element.fontStyle === "italic" ? "normal" : "italic",
                  })
                }
                className="h-8 px-3 italic"
              >
                I
              </Button>
              <Button
                variant={
                  element.textDecoration === "underline" ? "default" : "outline"
                }
                size="sm"
                onClick={() =>
                  updateTextElement(trackId, element.id, {
                    textDecoration:
                      element.textDecoration === "underline"
                        ? "none"
                        : "underline",
                  })
                }
                className="h-8 px-3 underline"
              >
                U
              </Button>
              <Button
                variant={
                  element.textDecoration === "line-through"
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() =>
                  updateTextElement(trackId, element.id, {
                    textDecoration:
                      element.textDecoration === "line-through"
                        ? "none"
                        : "line-through",
                  })
                }
                className="h-8 px-3 line-through"
              >
                S
              </Button>
            </div>
          </PropertyItemValue>
        </PropertyItem>
        <PropertyItem direction="row">
          <PropertyItemLabel>Font size</PropertyItemLabel>
          <PropertyItemValue>
            <div className="flex items-center gap-2">
              <Slider
                value={[element.fontSize]}
                min={8}
                max={300}
                step={1}
                onValueChange={([value]) => {
                  updateTextElement(trackId, element.id, { fontSize: value });
                  setFontSizeInput(value.toString());
                }}
                className="w-full"
              />
              <Input
                type="number"
                value={fontSizeInput}
                min={8}
                max={300}
                onChange={(e) => handleFontSizeChange(e.target.value)}
                onBlur={handleFontSizeBlur}
                className="w-12 !text-xs h-7 rounded-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </PropertyItemValue>
        </PropertyItem>

        <PropertyItem direction="column">
          <PropertyItem direction="row">
            <PropertyItemLabel>Position</PropertyItemLabel>
            <PropertyItemValue>
              <div className="flex items-center gap-3 w-full">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">X</span>
                    <Slider
                      value={[element.x]}
                      min={posXMin}
                      max={posXMax}
                      step={1}
                      onValueChange={([value]) => {
                        updateTextElement(trackId, element.id, { x: value });
                        setXInput(value.toString());
                      }}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      value={xInput}
                      min={posXMin}
                      max={posXMax}
                      onChange={(e) => handleXChange(e.target.value)}
                      onBlur={handleXBlur}
                      className="w-16 !text-xs h-7 rounded-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full mt-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">Y</span>
                    <Slider
                      value={[element.y]}
                      min={posYMin}
                      max={posYMax}
                      step={1}
                      onValueChange={([value]) => {
                        updateTextElement(trackId, element.id, { y: value });
                        setYInput(value.toString());
                      }}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      value={yInput}
                      min={posYMin}
                      max={posYMax}
                      onChange={(e) => handleYChange(e.target.value)}
                      onBlur={handleYBlur}
                      className="w-16 !text-xs h-7 rounded-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              </div>
            </PropertyItemValue>
          </PropertyItem>
        </PropertyItem>

        <PropertyItem direction="column">
          <PropertyItemLabel>Rotation</PropertyItemLabel>
          <PropertyItemValue>
            <div className="flex items-center gap-2">
              <Slider
                value={[element.rotation]}
                min={-180}
                max={180}
                step={1}
                onValueChange={([value]) => {
                  updateTextElement(trackId, element.id, { rotation: value });
                  setRotationInput(value.toString());
                }}
                className="w-full"
              />
              <Input
                type="number"
                value={rotationInput}
                min={-180}
                max={180}
                onChange={(e) => handleRotationChange(e.target.value)}
                onBlur={handleRotationBlur}
                className="w-16 !text-xs h-7 rounded-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </PropertyItemValue>
        </PropertyItem>
        <PropertyItem direction="row">
          <PropertyItemLabel>Color</PropertyItemLabel>
          <PropertyItemValue>
            <Input
              type="color"
              value={element.color || "#ffffff"}
              onChange={(e) =>
                updateTextElement(trackId, element.id, { color: e.target.value })
              }
              className="w-full cursor-pointer rounded-full"
            />
          </PropertyItemValue>
        </PropertyItem>

      <PropertyItem direction="column">
          <div className="flex items-center justify-between">
            <PropertyItemLabel>Background</PropertyItemLabel>
          <div className="flex items-center space-x-2">
            <Switch
              id="transparent-bg-toggle"
              checked={element.backgroundColor === "transparent"}
              onCheckedChange={handleTransparentToggle}
            />
            <label htmlFor="transparent-bg-toggle" className="text-sm font-medium">
              Transparent
            </label>
          </div>
        </div>
        <PropertyItemValue>
          <Input
            type="color"
            value={
              element.backgroundColor === "transparent"
                ? lastSelectedColor.current
                : element.backgroundColor || "#000000"
            }
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-full cursor-pointer rounded-full"
            disabled={element.backgroundColor === "transparent"}
          />
        </PropertyItemValue>
      </PropertyItem>
      <PropertyItem direction="column">
        <PropertyItemLabel>Opacity</PropertyItemLabel>
        <PropertyItemValue>
          <div className="flex items-center gap-2">
            <Slider
              value={[element.opacity * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={([value]) => {
                updateTextElement(trackId, element.id, {
                  opacity: value / 100,
                });
                setOpacityInput(value.toString());
              }}
              className="w-full"
            />
            <Input
              type="number"
              value={opacityInput}
              min={0}
              max={100}
              onChange={(e) => handleOpacityChange(e.target.value)}
              onBlur={handleOpacityBlur}
              className="w-12 !text-xs h-7 rounded-sm text-center
               [appearance:textfield]
               [&::-webkit-outer-spin-button]:appearance-none
               [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </PropertyItemValue>
      </PropertyItem>
    </div>
  );
}
