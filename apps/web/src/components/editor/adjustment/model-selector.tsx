"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdjustmentStore } from '@/stores/adjustment-store';
import { getImageEditModels } from '@/lib/image-edit-client';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

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
                    ? "bg-transparent text-[#05c7c7] border-[#05c7c7] shadow-sm"
                    : "bg-card hover:bg-muted/50 border-muted-foreground/20 hover:border-muted-foreground/40"
                )}
                onClick={() => setSelectedModel(model.id as any)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {isSelected && <Check className="w-3 h-3 flex-shrink-0" />}
                  <span className="text-xs font-medium truncate">{model.name}</span>
                </div>
                <span className={cn(
                  "text-[10px] font-medium ml-2 flex-shrink-0 border border-transparent",
                  isSelected ? "text-[#05c7c7]/80" : "text-muted-foreground"
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