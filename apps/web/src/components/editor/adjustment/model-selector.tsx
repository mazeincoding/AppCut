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
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Model Selection</label>
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
          {models.map((model) => {
            const isSelected = selectedModel === model.id;
            
            return (
              <button
                key={model.id}
                className={cn(
                  "w-full h-6 px-2 rounded-md border text-left cursor-pointer transition-all duration-200 flex items-center justify-between",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card hover:bg-muted/50 border-muted-foreground/20 hover:border-muted-foreground/40"
                )}
                onClick={() => setSelectedModel(model.id as any)}
              >
                <span className="text-xs font-medium truncate">{model.name}</span>
                <span className={cn(
                  "text-[10px] font-medium ml-2 flex-shrink-0",
                  isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {model.estimatedCost}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}