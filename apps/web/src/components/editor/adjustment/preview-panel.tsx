"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdjustmentStore } from '@/stores/adjustment-store';
import { 
  ImageIcon, 
  SplitSquareVertical, 
  Eye,
  Maximize2,
  X,
  ArrowLeft
} from 'lucide-react';

export function PreviewPanel() {
  const { 
    originalImageUrl, 
    currentEditedUrl, 
    previewMode, 
    setPreviewMode,
    editHistory,
    currentHistoryIndex
  } = useAdjustmentStore();

  const [fullscreen, setFullscreen] = useState(false);

  const hasEdit = currentEditedUrl;
  const currentEdit = editHistory[currentHistoryIndex];

  // Close fullscreen on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && fullscreen) {
        setFullscreen(false);
      }
    };

    if (fullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [fullscreen]);

  if (!originalImageUrl) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <ImageIcon className="size-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No image to preview</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-3 flex-1 flex flex-col">
        {/* Single Image Preview with Toggle */}
        <Tabs value={hasEdit ? 'edited' : 'original'} className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Preview</h3>
              {currentEdit && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                  {currentEdit.model}
                </Badge>
              )}
            </div>
            
            <TabsList className="grid grid-cols-2 h-6">
              <TabsTrigger value="original" className="text-[10px] px-2 h-5">
                Original
              </TabsTrigger>
              <TabsTrigger value="edited" disabled={!hasEdit} className="text-[10px] px-2 h-5">
                {hasEdit ? 'Edited' : 'No Edit'}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="original" className="flex-1 mt-0">
            <div className="h-full bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center overflow-hidden">
              <img
                src={originalImageUrl}
                alt="Original"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </TabsContent>

          <TabsContent value="edited" className="flex-1 mt-0">
            <div className="h-full bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center overflow-hidden">
              {hasEdit ? (
                <img
                  src={currentEditedUrl}
                  alt="Edited"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="size-8 mx-auto mb-2" />
                  <p className="text-sm">No edits yet</p>
                  <p className="text-xs">Generate an edit to see results</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Image Info */}
        {currentEdit && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="text-xs text-muted-foreground">
              <strong>Prompt:</strong> {currentEdit.prompt}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Model: {currentEdit.model}</span>
              <span>Time: {currentEdit.processingTime}s</span>
            </div>
          </div>
        )}
      </CardContent>

      {/* Fullscreen Modal */}
      {fullscreen && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          {/* Header with close options */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
            <div className="text-white text-sm opacity-75">
              Press ESC or click outside image to close
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                onClick={() => setFullscreen(false)}
              >
                <X className="size-4 mr-1" />
                Close
              </Button>
            </div>
          </div>

          {/* Image container */}
          <div className="max-w-full max-h-full">
            <img
              src={hasEdit ? currentEditedUrl : originalImageUrl}
              alt="Fullscreen preview"
              className="max-w-full max-h-full object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </Card>
  );
}