"use client";

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdjustmentStore } from '@/stores/adjustment-store';
import { 
  ImageIcon, 
  SplitSquareVertical, 
  Eye,
  Maximize2
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
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">Preview</h3>
            {currentEdit && (
              <Badge variant="outline" className="text-xs">
                {currentEdit.model} • {currentEdit.processingTime}s
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Preview Mode Toggle */}
            <div className="flex bg-muted rounded-md p-1">
              <Button
                variant={previewMode === 'side-by-side' ? 'default' : 'outline'}
                size="sm"
                className="h-6 px-2"
                onClick={() => setPreviewMode('side-by-side')}
              >
                <SplitSquareVertical className="size-3" />
              </Button>
              <Button
                variant={previewMode === 'single' ? 'default' : 'outline'}
                size="sm"
                className="h-6 px-2"
                onClick={() => setPreviewMode('single')}
              >
                <Eye className="size-3" />
              </Button>
            </div>

            {/* Fullscreen */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFullscreen(true)}
              className="h-6 px-2"
            >
              <Maximize2 className="size-3" />
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 min-h-0">
          {previewMode === 'side-by-side' ? (
            <div className="h-full flex gap-4">
              {/* Original */}
              <div className="flex-1 flex flex-col">
                <div className="text-xs font-medium mb-2 text-muted-foreground">
                  Original
                </div>
                <div className="flex-1 bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center overflow-hidden">
                  <img
                    src={originalImageUrl}
                    alt="Original"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>

              {/* Edited */}
              <div className="flex-1 flex flex-col">
                <div className="text-xs font-medium mb-2 text-muted-foreground">
                  {hasEdit ? 'Edited' : 'Edit Preview'}
                </div>
                <div className="flex-1 bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center overflow-hidden">
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
                      <p className="text-xs">Upload an image and add a prompt to start</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <Tabs value={hasEdit ? 'edited' : 'original'} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="original" className="text-xs">
                  Original
                </TabsTrigger>
                <TabsTrigger value="edited" disabled={!hasEdit} className="text-xs">
                  Edited {hasEdit && <Badge variant="secondary" className="ml-1 text-xs">New</Badge>}
                </TabsTrigger>
              </TabsList>

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
                      <ImageIcon className="size-12 mx-auto mb-4" />
                      <p>No edited image yet</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

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
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
        >
          <div className="max-w-full max-h-full">
            <img
              src={hasEdit ? currentEditedUrl : originalImageUrl}
              alt="Fullscreen preview"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <Button
            variant="secondary"
            className="absolute top-4 right-4"
            onClick={() => setFullscreen(false)}
          >
            Close
          </Button>
        </div>
      )}
    </Card>
  );
}