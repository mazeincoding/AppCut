"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAdjustmentStore } from '@/stores/adjustment-store';
import { getImageEditModels } from '@/lib/image-edit-client';
import { RotateCcw } from 'lucide-react';

export function ParameterControls() {
  const { 
    selectedModel, 
    parameters, 
    updateParameter, 
    resetParameters 
  } = useAdjustmentStore();

  const models = getImageEditModels();
  const currentModel = models.find(m => m.id === selectedModel);
  
  if (!currentModel) return null;

  const modelParams = currentModel.parameters;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <Label className="text-sm font-semibold">Parameters</Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetParameters}
            className="h-6 px-2"
          >
            <RotateCcw className="size-3" />
          </Button>
        </div>

        {/* Guidance Scale */}
        {modelParams.guidanceScale && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs">Guidance Scale</Label>
              <span className="text-xs text-muted-foreground">
                {parameters.guidanceScale}
              </span>
            </div>
            <Slider
              value={[parameters.guidanceScale]}
              onValueChange={([value]) => updateParameter('guidanceScale', value)}
              min={modelParams.guidanceScale.min}
              max={modelParams.guidanceScale.max}
              step={modelParams.guidanceScale.step}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Controls how closely the edit follows your prompt
            </p>
          </div>
        )}

        {/* Steps (for FLUX models) */}
        {modelParams.steps && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs">Inference Steps</Label>
              <span className="text-xs text-muted-foreground">
                {parameters.steps}
              </span>
            </div>
            <Slider
              value={[parameters.steps]}
              onValueChange={([value]) => updateParameter('steps', value)}
              min={modelParams.steps.min}
              max={modelParams.steps.max}
              step={modelParams.steps.step}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              More steps = higher quality, slower processing
            </p>
          </div>
        )}

        {/* Safety Tolerance (for FLUX models) */}
        {modelParams.safetyTolerance && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs">Safety Tolerance</Label>
              <span className="text-xs text-muted-foreground">
                {parameters.safetyTolerance}
              </span>
            </div>
            <Slider
              value={[parameters.safetyTolerance]}
              onValueChange={([value]) => updateParameter('safetyTolerance', value)}
              min={modelParams.safetyTolerance.min}
              max={modelParams.safetyTolerance.max}
              step={modelParams.safetyTolerance.step}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Content safety filtering level
            </p>
          </div>
        )}

        {/* Number of Images (for FLUX models) */}
        {modelParams.numImages && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs">Number of Images</Label>
              <span className="text-xs text-muted-foreground">
                {parameters.numImages}
              </span>
            </div>
            <Slider
              value={[parameters.numImages]}
              onValueChange={([value]) => updateParameter('numImages', value)}
              min={modelParams.numImages.min}
              max={modelParams.numImages.max}
              step={modelParams.numImages.step}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Generate multiple variations
            </p>
          </div>
        )}

        {/* Seed */}
        {modelParams.seed && (
          <div className="space-y-2">
            <Label className="text-xs">Seed (Optional)</Label>
            <Input
              type="number"
              value={parameters.seed || ''}
              onChange={(e) => updateParameter('seed', e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Random"
              className="h-8 text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Use same seed for reproducible results
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}