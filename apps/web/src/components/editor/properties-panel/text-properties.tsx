import { Textarea } from "@/components/ui/textarea";
import { FontPicker } from "@/components/ui/font-picker";
import { FontFamily } from "@/constants/font-constants";
import { TextElement } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Type, Palette } from "lucide-react";
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

  return (
    <div className="space-y-4 p-4">
      {/* Text Content */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4" />
          <span className="text-sm font-medium">Text Content</span>
        </div>
        <Textarea
          placeholder="Enter text..."
          defaultValue={element.content}
          className="min-h-[3rem] resize-none bg-background/50"
          onChange={(e) =>
            updateTextElement(trackId, element.id, { content: e.target.value })
          }
        />
      </div>

      {/* Font Settings */}
      <div className="space-y-3">
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

        <PropertyItem direction="column">
          <PropertyItemLabel>Size</PropertyItemLabel>
          <PropertyItemValue>
            <div className="flex items-center gap-2">
              <Slider
                defaultValue={[element.fontSize]}
                min={8}
                max={300}
                step={1}
                onValueChange={([value]) =>
                  updateTextElement(trackId, element.id, { fontSize: value })
                }
                className="flex-1"
              />
              <Input
                type="number"
                value={element.fontSize}
                onChange={(e) =>
                  updateTextElement(trackId, element.id, {
                    fontSize: parseInt(e.target.value),
                  })
                }
                className="w-16 text-xs h-7 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </PropertyItemValue>
        </PropertyItem>
      </div>

      {/* Text Style */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Style</span>
        <ToggleGroup type="multiple" className="justify-start">
          <ToggleGroupItem
            value="bold"
            pressed={element.fontWeight === "bold"}
            onPressedChange={(pressed) =>
              updateTextElement(trackId, element.id, {
                fontWeight: pressed ? "bold" : "normal",
              })
            }
            size="sm"
          >
            <Bold className="h-3 w-3" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="italic"
            pressed={element.fontStyle === "italic"}
            onPressedChange={(pressed) =>
              updateTextElement(trackId, element.id, {
                fontStyle: pressed ? "italic" : "normal",
              })
            }
            size="sm"
          >
            <Italic className="h-3 w-3" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="underline"
            pressed={element.textDecoration === "underline"}
            onPressedChange={(pressed) =>
              updateTextElement(trackId, element.id, {
                textDecoration: pressed ? "underline" : "none",
              })
            }
            size="sm"
          >
            <Underline className="h-3 w-3" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Text Alignment */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Alignment</span>
        <ToggleGroup
          type="single"
          value={element.textAlign}
          onValueChange={(value) =>
            value && updateTextElement(trackId, element.id, { textAlign: value as any })
          }
          className="justify-start"
        >
          <ToggleGroupItem value="left" size="sm">
            <AlignLeft className="h-3 w-3" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" size="sm">
            <AlignCenter className="h-3 w-3" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" size="sm">
            <AlignRight className="h-3 w-3" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          <span className="text-sm font-medium">Colors</span>
        </div>
        
        <PropertyItem direction="row">
          <PropertyItemLabel>Text</PropertyItemLabel>
          <PropertyItemValue>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={element.color}
                onChange={(e) =>
                  updateTextElement(trackId, element.id, { color: e.target.value })
                }
                className="w-12 h-8 p-1 border rounded"
              />
              <Input
                type="text"
                value={element.color}
                onChange={(e) =>
                  updateTextElement(trackId, element.id, { color: e.target.value })
                }
                className="flex-1 text-xs h-8"
                placeholder="#000000"
              />
            </div>
          </PropertyItemValue>
        </PropertyItem>

        <PropertyItem direction="row">
          <PropertyItemLabel>Background</PropertyItemLabel>
          <PropertyItemValue>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={element.backgroundColor}
                onChange={(e) =>
                  updateTextElement(trackId, element.id, { backgroundColor: e.target.value })
                }
                className="w-12 h-8 p-1 border rounded"
              />
              <Input
                type="text"
                value={element.backgroundColor}
                onChange={(e) =>
                  updateTextElement(trackId, element.id, { backgroundColor: e.target.value })
                }
                className="flex-1 text-xs h-8"
                placeholder="transparent"
              />
            </div>
          </PropertyItemValue>
        </PropertyItem>
      </div>

      {/* Transform */}
      <div className="space-y-3">
        <span className="text-sm font-medium">Transform</span>
        
        <PropertyItem direction="column">
          <PropertyItemLabel>Opacity</PropertyItemLabel>
          <PropertyItemValue>
            <div className="flex items-center gap-2">
              <Slider
                value={[element.opacity * 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) =>
                  updateTextElement(trackId, element.id, { opacity: value / 100 })
                }
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10 text-right">
                {Math.round(element.opacity * 100)}%
              </span>
            </div>
          </PropertyItemValue>
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
                onValueChange={([value]) =>
                  updateTextElement(trackId, element.id, { rotation: value })
                }
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10 text-right">
                {element.rotation}°
              </span>
            </div>
          </PropertyItemValue>
        </PropertyItem>
      </div>
    </div>
  );
}
