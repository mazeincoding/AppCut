import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { usePlaybackStore } from "@/stores/playback-store";

const SPEED_PRESETS = [
  { label: "0.5x", value: 0.5 },
  { label: "1x", value: 1.0 },
  { label: "1.5x", value: 1.5 },
  { label: "2x", value: 2.0 },
];

export function SpeedControl() {
  const { speed, setSpeed } = usePlaybackStore();

  const handleSpeedChange = (value: number[]) => {
    setSpeed(value[0]);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label className="mb-2 block">Playback Speed ({speed.toFixed(1)}x)</Label>
        <div className="flex gap-2 mb-3">
          {SPEED_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              variant={Math.abs(speed - preset.value) < 0.05 ? "default" : "outline"}
              size="sm"
              onClick={() => setSpeed(preset.value)}
              className="flex-1"
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <Slider
          defaultValue={[1.0]}
          value={[speed]}
          min={0.1}
          max={2.0}
          step={0.1}
          onValueChange={handleSpeedChange}
          className="w-full"
        />
      </div>
    </div>
  );
} 