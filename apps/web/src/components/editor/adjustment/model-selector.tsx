"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdjustmentStore } from '@/stores/adjustment-store';
import { getImageEditModels } from '@/lib/image-edit-client';
import { cn } from '@/lib/utils';

export function ModelSelector() {
  const { selectedModel, setSelectedModel } = useAdjustmentStore();
  const models = getImageEditModels();

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          <label className="text-sm font-semibold">AI Model</label>
        </div>
        <div className="space-y-2">
          {models.map((model) => {
            const isSelected = selectedModel === model.id;
            
            return (
              <div
                key={model.id}
                className={cn(
                  "p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md",
                  isSelected
                    ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary shadow-md"
                    : "bg-card hover:bg-muted/30 border-muted-foreground/10 hover:border-muted-foreground/30"
                )}
                onClick={() => setSelectedModel(model.id as any)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full transition-colors",
                      isSelected ? "bg-primary" : "bg-muted-foreground/30"
                    )}></div>
                    <h4 className="text-sm font-semibold">{model.name}</h4>
                  </div>
                  <Badge 
                    variant={isSelected ? "default" : "secondary"} 
                    className={cn("text-xs font-medium", isSelected && "bg-primary/20 text-primary-foreground")}
                  >
                    {model.estimatedCost}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}