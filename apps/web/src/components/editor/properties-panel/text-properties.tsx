import { Textarea } from "@/components/ui/textarea";
import { FontPicker } from "@/components/ui/font-picker";
import { FontFamily } from "@/constants/font-constants";
import { TextElement } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  PropertyItem,
  PropertyItemLabel,
  PropertyItemValue,
} from "./property-item";
import { Toggle } from "@/components/ui/toggle";
import {
  Bold,
  Italic,
  Underline,
  // AlignLeft,
  // AlignCenter,
  // AlignRight,
  // RotateCw,
  // Eye,
} from "lucide-react";
import { TbLetterX, TbLetterY } from "react-icons/tb";

export function TextProperties({
  element,
  trackId,
}: {
  element: TextElement;
  trackId: string;
}) {
  const { updateTextElement } = useTimelineStore();

  return (
    <div className="space-y-6 p-5">
      <Textarea
        placeholder="Name"
        defaultValue={element.content}
        className="min-h-[4.5rem] resize-none bg-background/50"
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
      <PropertyItem direction="column">
        <PropertyItemLabel>Font size</PropertyItemLabel>
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
              className="w-full cursor-pointer"
            />
            <Input
              type="number"
              value={element.fontSize}
              onChange={(e) =>
                updateTextElement(trackId, element.id, {
                  fontSize: parseInt(e.target.value),
                })
              }
              className="w-12 !text-xs h-7 rounded-sm text-center
               [appearance:textfield]
               [&::-webkit-outer-spin-button]:appearance-none
               [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </PropertyItemValue>
      </PropertyItem>
      <PropertyItem direction="row">
        <PropertyItemLabel>Text color</PropertyItemLabel>
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
      <PropertyItem direction="row">
        <PropertyItemLabel>Background</PropertyItemLabel>
        <PropertyItemValue>
          <Input
            type="color"
            value={element.backgroundColor || "#00000000"}
            onChange={(e) =>
              updateTextElement(trackId, element.id, {
                backgroundColor: e.target.value,
              })
            }
            className="w-full cursor-pointer rounded-full"
          />
        </PropertyItemValue>
      </PropertyItem>
      <PropertyItem direction="row">
        <PropertyItemLabel>Style</PropertyItemLabel>
        <PropertyItemValue className="flex gap-2 justify-evenly">
          <Toggle
            pressed={element.fontWeight === "bold"}
            onPressedChange={(v) =>
              updateTextElement(trackId, element.id, {
                fontWeight: v ? "bold" : "normal",
              })
            }
          >
            <Bold size={16} />
          </Toggle>
          <Toggle
            pressed={element.fontStyle === "italic"}
            onPressedChange={(v) =>
              updateTextElement(trackId, element.id, {
                fontStyle: v ? "italic" : "normal",
              })
            }
          >
            <Italic size={16} />
          </Toggle>
          <Toggle
            pressed={element.textDecoration === "underline"}
            onPressedChange={(v) =>
              updateTextElement(trackId, element.id, {
                textDecoration: v ? "underline" : "none",
              })
            }
          >
            <Underline size={16} />
          </Toggle>
        </PropertyItemValue>
      </PropertyItem>
      <PropertyItem direction="row">
        <PropertyItemLabel>Rotation</PropertyItemLabel>
        <PropertyItemValue>
          <Input
            type="number"
            value={element.rotation || 0}
            onChange={(e) =>
              updateTextElement(trackId, element.id, {
                rotation: parseInt(e.target.value),
              })
            }
            className="w-full"
          />
        </PropertyItemValue>
      </PropertyItem>
      <PropertyItem direction="column">
        <PropertyItemLabel>Opacity</PropertyItemLabel>
        <PropertyItemValue className="flex w-full items-center gap-2 justify-between">
          <Slider
            defaultValue={[element.opacity || 1]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={([value]) =>
              updateTextElement(trackId, element.id, { opacity: value })
            }
          />
        </PropertyItemValue>
      </PropertyItem>
      <PropertyItem direction="row">
        <PropertyItemLabel>Position</PropertyItemLabel>
        <PropertyItemValue className="flex gap-2 ">
          <div className="flex w-2/4 flex-row items-center justify-center">
            <span>
              <TbLetterX className="text-base font-bold text-primary" />
            </span>
            <Input
              type="number"
              value={element.x ?? 0}
              onChange={(e) =>
                updateTextElement(trackId, element.id, {
                  x: parseInt(e.target.value),
                })
              }
              className="w-14"
              placeholder="X"
            />
          </div>
          <div className="flex w-2/4 flex-row items-center justify-center">
            <span>
              <TbLetterY className="text-base font-bold text-primary" />
            </span>
            <Input
              type="number"
              value={element.y ?? 0}
              onChange={(e) =>
                updateTextElement(trackId, element.id, {
                  y: parseInt(e.target.value),
                })
              }
              className="w-14"
              placeholder="Y"
            />
          </div>
        </PropertyItemValue>
      </PropertyItem>
    </div>
  );
}
