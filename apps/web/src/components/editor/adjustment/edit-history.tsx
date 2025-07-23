"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdjustmentStore } from '@/stores/adjustment-store';
import { 
  History, 
  Undo2, 
  Redo2, 
  Trash2, 
  Download,
  Clock,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { downloadImage } from '@/lib/image-utils';
import { toast } from 'sonner';

export function EditHistory() {
  const { 
    editHistory, 
    currentHistoryIndex, 
    goToHistoryItem, 
    clearHistory, 
    canUndo, 
    canRedo, 
    undo, 
    redo,
    toggleHistory
  } = useAdjustmentStore();

  const handleDownloadEdit = async (item: any, index: number) => {
    try {
      const timestamp = new Date(item.timestamp).toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `edit-${index + 1}-${item.model}-${timestamp}.png`;
      await downloadImage(item.editedUrl, filename);
      toast.success(`Edit ${index + 1} downloaded!`);
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  if (editHistory.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="size-4" />
              Edit History
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleHistory}
              className="h-6 w-6 p-0"
            >
              <X className="size-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <History className="size-8 mx-auto mb-2" />
            <p className="text-sm">No edits yet</p>
            <p className="text-xs">Start editing to build history</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="size-4" />
            Edit History
            <Badge variant="secondary" className="text-xs">
              {editHistory.length}
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleHistory}
            className="h-6 w-6 p-0"
          >
            <X className="size-3" />
          </Button>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={!canUndo()}
            className="flex-1 h-7"
          >
            <Undo2 className="size-3 mr-1" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={!canRedo()}
            className="flex-1 h-7"
          >
            <Redo2 className="size-3 mr-1" />
            Redo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearHistory}
            className="h-7 px-2"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-3 pt-0">
        <ScrollArea className="h-full">
          <div className="space-y-2">
            {editHistory.map((item, index) => {
              const isActive = index === currentHistoryIndex;
              const isFuture = index > currentHistoryIndex;
              
              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all group",
                    isActive
                      ? "bg-primary/10 border-primary"
                      : isFuture
                      ? "bg-muted/30 border-muted opacity-60"
                      : "hover:bg-muted/50 hover:border-muted-foreground/20"
                  )}
                  onClick={() => goToHistoryItem(index)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={isActive ? "default" : "outline"} 
                        className="text-xs"
                      >
                        #{index + 1}
                      </Badge>
                      <span className="text-xs font-medium">
                        {item.model}
                      </span>
                    </div>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadEdit(item, index);
                        }}
                        className="h-5 w-5 p-0"
                      >
                        <Download className="size-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Thumbnail */}
                  <div className="aspect-video bg-muted/20 rounded border mb-2 overflow-hidden">
                    <img
                      src={item.editedUrl}
                      alt={`Edit ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Prompt */}
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {item.prompt}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="size-3" />
                      <span>
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <span>
                      {item.processingTime}s
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}