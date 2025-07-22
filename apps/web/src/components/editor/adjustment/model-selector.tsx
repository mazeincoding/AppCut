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
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full mt-0.5 transition-colors",
                      isSelected ? "bg-primary" : "bg-muted-foreground/30"
                    )}></div>
                    <div>
                      <h4 className="text-xs font-semibold">{model.name}</h4>
                      <p className="text-[10px] text-muted-foreground font-medium">{model.provider}</p>
                    </div>
                  </div>
                  <Badge 
                    variant={isSelected ? "default" : "secondary"} 
                    className={cn("text-[10px] font-medium h-4 px-1.5", isSelected && "bg-primary/20 text-primary-foreground")}
                  >
                    {model.estimatedCost}
                  </Badge>
                </div>
                
                <p className="text-[10px] text-muted-foreground mb-2 leading-tight">
                  {model.description}
                </p>
                
                <div className="flex flex-wrap gap-1">
                  {model.features.map((feature) => (
                    <span
                      key={feature}
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full font-medium transition-colors",
                        isSelected 
                          ? "bg-primary/15 text-primary-foreground/90"
                          : "bg-muted/70 text-muted-foreground"
                      )}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}