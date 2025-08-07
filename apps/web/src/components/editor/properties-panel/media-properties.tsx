import { MediaElement, CropSettings }  from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { Label } from "../../ui/label";
import { Slider } from "../../ui/slider";
import { Button } from "../../ui/button";
import { Switch } from "../../ui/switch";
import { Separator } from "../../ui/separator";
import { PropertyItem, PropertyItemLabel, PropertyItemValue } from "./property-item";
import { Crop, RotateCcw } from "lucide-react";

export function MediaProperties({ element }: { element: MediaElement }) {
    const { updateElementProperties } = useTimelineStore();
    const { mediaItems } = useMediaStore();

    // Find the media item
    const mediaItem = mediaItems.find((item) => item.id === element.mediaId);

    // Get current values with defaults
    const crop = element.crop || {
        enabled: false,
        x: 0,
        y: 0,
        width: 1,
        height: 1,
    };

    const transform = {
        x: element.x || 0,
        y: element.y || 0,
        scale: element.scale || 1,
        rotation: element.rotation || 0,
        opacity: element.opacity || 1,
    };

    const handleCropChange = (newCrop: Partial<CropSettings>) => {
        const updatedCrop = { ...crop, ...newCrop };
        updateElementProperties(element.id, { crop: updatedCrop });
    };

    const handleTransformChange = (property: string, value: number) => {
        updateElementProperties(element.id, { [property]: value });
    };

    const resetCrop = () => {
        handleCropChange({
            enabled: false,
            x: 0,
            y: 0,
            width: 1,
            height: 1,
        });
    };

    const resetTransform = () => {
        updateElementProperties(element.id, {
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            opacity: 1,
        });
    };

    return (
        <div className="space-y-4 p-5">
            {/* Basic Info */}
            <div className="space-y-3">
                <PropertyItem>
                    <PropertyItemLabel>Name:</PropertyItemLabel>
                    <PropertyItemValue>{element.name}</PropertyItemValue>
                </PropertyItem>
                {mediaItem && (
                    <>
                        <PropertyItem>
                            <PropertyItemLabel>Type:</PropertyItemLabel>
                            <PropertyItemValue>{mediaItem.type}</PropertyItemValue>
                        </PropertyItem>
                        {mediaItem.width && mediaItem.height && (
                            <PropertyItem>
                                <PropertyItemLabel>Resolution:</PropertyItemLabel>
                                <PropertyItemValue>{`${mediaItem.width} × ${mediaItem.height}`}</PropertyItemValue>
                            </PropertyItem>
                        )}
                        {mediaItem.duration && (
                            <PropertyItem>
                                <PropertyItemLabel>Duration:</PropertyItemLabel>
                                <PropertyItemValue>{`${mediaItem.duration.toFixed(2)}s`}</PropertyItemValue>
                            </PropertyItem>
                        )}
                    </>
                )}
            </div>

            <Separator />

            {/* Crop Controls */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Crop className="h-4 w-4" />
                        <Label className="text-sm font-medium">Crop</Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={crop.enabled}
                            onCheckedChange={(enabled) =>
                                handleCropChange({ enabled })
                            }
                        />
                        {crop.enabled && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={resetCrop}
                                className="h-6 px-2 text-xs"
                            >
                                Reset
                            </Button>
                        )}
                    </div>
                </div>

                {crop.enabled && (
                    <div className="space-y-3 pl-6">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                                Position X
                            </Label>
                            <Slider
                                value={[crop.x]}
                                min={0}
                                max={1}
                                step={0.01}
                                onValueChange={([value]) =>
                                    handleCropChange({ x: value })
                                }
                                className="w-full"
                            />
                            <div className="text-xs text-muted-foreground text-right">
                                {Math.round(crop.x * 100)}%
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                                Position Y
                            </Label>
                            <Slider
                                value={[crop.y]}
                                min={0}
                                max={1}
                                step={0.01}
                                onValueChange={([value]) =>
                                    handleCropChange({ y: value })
                                }
                                className="w-full"
                            />
                            <div className="text-xs text-muted-foreground text-right">
                                {Math.round(crop.y * 100)}%
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                                Width
                            </Label>
                            <Slider
                                value={[crop.width]}
                                min={0.1}
                                max={1}
                                step={0.01}
                                onValueChange={([value]) =>
                                    handleCropChange({ width: value })
                                }
                                className="w-full"
                            />
                            <div className="text-xs text-muted-foreground text-right">
                                {Math.round(crop.width * 100)}%
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">
                                Height
                            </Label>
                            <Slider
                                value={[crop.height]}
                                min={0.1}
                                max={1}
                                step={0.01}
                                onValueChange={([value]) =>
                                    handleCropChange({ height: value })
                                }
                                className="w-full"
                            />
                            <div className="text-xs text-muted-foreground text-right">
                                {Math.round(crop.height * 100)}%
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Separator />

            {/* Transform Controls */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" />
                        <Label className="text-sm font-medium">Transform</Label>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={resetTransform}
                        className="h-6 px-2 text-xs"
                    >
                        Reset
                    </Button>
                </div>

                <div className="space-y-3 pl-6">
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                            Position X
                        </Label>
                        <Slider
                            value={[transform.x]}
                            min={-500}
                            max={500}
                            step={1}
                            onValueChange={([value]) =>
                                handleTransformChange("x", value)
                            }
                            className="w-full"
                        />
                        <div className="text-xs text-muted-foreground text-right">
                            {transform.x}px
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                            Position Y
                        </Label>
                        <Slider
                            value={[transform.y]}
                            min={-500}
                            max={500}
                            step={1}
                            onValueChange={([value]) =>
                                handleTransformChange("y", value)
                            }
                            className="w-full"
                        />
                        <div className="text-xs text-muted-foreground text-right">
                            {transform.y}px
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                            Scale
                        </Label>
                        <Slider
                            value={[transform.scale]}
                            min={0.1}
                            max={3}
                            step={0.01}
                            onValueChange={([value]) =>
                                handleTransformChange("scale", value)
                            }
                            className="w-full"
                        />
                        <div className="text-xs text-muted-foreground text-right">
                            {Math.round(transform.scale * 100)}%
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                            Rotation
                        </Label>
                        <Slider
                            value={[transform.rotation]}
                            min={-180}
                            max={180}
                            step={1}
                            onValueChange={([value]) =>
                                handleTransformChange("rotation", value)
                            }
                            className="w-full"
                        />
                        <div className="text-xs text-muted-foreground text-right">
                            {transform.rotation}°
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                            Opacity
                        </Label>
                        <Slider
                            value={[transform.opacity]}
                            min={0}
                            max={1}
                            step={0.01}
                            onValueChange={([value]) =>
                                handleTransformChange("opacity", value)
                            }
                            className="w-full"
                        />
                        <div className="text-xs text-muted-foreground text-right">
                            {Math.round(transform.opacity * 100)}%
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
