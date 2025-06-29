'use client';

import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCaptionStore } from "@/stores/caption-store";
import { Caption } from "@/types/editor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface CaptionImportPanelProps {
  onImportSuccess?: () => void;
}

export function CaptionImportPanel({ onImportSuccess }: CaptionImportPanelProps) {
  const addCaptions = useCaptionStore((state) => state.addCaptions);
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [parsedCaptions, setParsedCaptions] = useState<Omit<Caption, "id">[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseTxt = (content: string): Omit<Caption, "id">[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    let currentTime = 0;
    const captions: Omit<Caption, "id">[] = [];
    lines.forEach(line => {
      captions.push({
        text: line.trim(),
        startTime: currentTime,
        endTime: currentTime + 3, // 3 seconds per line
      });
      currentTime += 3;
    });
    return captions;
  };

  const parseCsv = (content: string): Omit<Caption, "id">[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    const captions: Omit<Caption, "id">[] = [];
    lines.forEach((line, index) => {
      const parts = line.split(',');
      if (parts.length === 3) {
        const startTime = parseFloat(parts[0].trim());
        const endTime = parseFloat(parts[1].trim());
        const text = parts[2].trim();
        if (!isNaN(startTime) && !isNaN(endTime) && text) {
          captions.push({ text, startTime, endTime });
        } else {
          console.warn(`Skipping invalid CSV line ${index + 1}: ${line}`);
          toast({
            title: "Import Warning",
            description: `Skipped invalid line in CSV: ${line.substring(0, 50)}...`,
            variant: "destructive",
          });
        }
      } else {
        console.warn(`Skipping malformed CSV line ${index + 1}: ${line}`);
        toast({
          title: "Import Warning",
          description: `Skipped malformed line in CSV: ${line.substring(0, 50)}...`,
          variant: "destructive",
        });
      }
    });
    return captions;
  };

  const srtTimeToSeconds = (srtTime: string): number => {
    const [timePart, msPart] = srtTime.split(',');
    const [hours, minutes, seconds] = timePart.split(':').map(Number);
    const milliseconds = Number(msPart);
    return (hours * 3600) + (minutes * 60) + seconds + (milliseconds / 1000);
  };

  const parseSrt = (content: string): Omit<Caption, "id">[] => {
    const blocks = content.split(/\n\n|\r\n\r\n/).filter(block => block.trim() !== '');
    const captions: Omit<Caption, "id">[] = [];

    blocks.forEach((block, index) => {
      const lines = block.split(/\n|\r\n/).filter(line => line.trim() !== '');
      if (lines.length >= 3) {
        // Expected format: index, timecode, text
        const timecodeLine = lines[1];
        const textLines = lines.slice(2);

        const [startTimeStr, endTimeStr] = timecodeLine.split(' --> ').map(s => s.trim());
        
        try {
          const startTime = srtTimeToSeconds(startTimeStr);
          const endTime = srtTimeToSeconds(endTimeStr);
          const text = textLines.join(' ').trim();

          if (!isNaN(startTime) && !isNaN(endTime) && text) {
            captions.push({ text, startTime, endTime });
          } else {
            console.warn(`Skipping invalid SRT block ${index + 1}: ${block.substring(0, 100)}...`);
            toast({
              title: "Import Warning",
              description: `Skipped invalid SRT block: ${block.substring(0, 50)}...`,
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error(`Error parsing SRT timecode in block ${index + 1}: ${timecodeLine}`, error);
          toast({
            title: "Import Error",
            description: `Failed to parse timecode in SRT block: ${timecodeLine.substring(0, 50)}...`,
            variant: "destructive",
          });
        }
      } else {
        console.warn(`Skipping malformed SRT block ${index + 1}: ${block.substring(0, 100)}...`);
        toast({
          title: "Import Warning",
          description: `Skipped malformed SRT block: ${block.substring(0, 50)}...`,
          variant: "destructive",
        });
      }
    });
    return captions;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to import.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      let parsed: Omit<Caption, "id">[] = [];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      try {
        switch (fileExtension) {
          case 'txt':
            parsed = parseTxt(content);
            break;
          case 'csv':
            parsed = parseCsv(content);
            break;
          case 'srt':
            parsed = parseSrt(content);
            break;
          default:
            toast({
              title: "Unsupported File Type",
              description: "Please upload a .txt, .csv, or .srt file.",
              variant: "destructive",
            });
            return;
        }

        if (parsed.length > 0) {
          setParsedCaptions(parsed);
          setIsModalOpen(true);
        } else {
          toast({
            title: "No Captions Found",
            description: "The selected file did not contain any valid captions.",
            variant: "default",
          });
        }
      } catch (error) {
        console.error("Error parsing file:", error);
        toast({
          title: "Parsing Error",
          description: `Failed to parse file: ${(error as Error).message}`,
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);

    // Reset file input value to allow selecting the same file again after cancellation
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    addCaptions(parsedCaptions);
    setParsedCaptions([]);
    setIsModalOpen(false);
    toast({
      title: "Captions Imported",
      description: `${parsedCaptions.length} captions have been successfully imported.`,
      variant: "default",
    });
    onImportSuccess?.();
  };

  const handleClearPreview = () => {
    setParsedCaptions([]);
    setIsModalOpen(false);
    toast({
      title: "Import Cancelled",
      description: "Caption import has been cancelled.",
    });
  };

  return (
    <>
      <Input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".txt,.csv,.srt"
      />
      <span
        onClick={() => fileInputRef.current?.click()}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium
                  ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
                  h-9 px-3 cursor-pointer text-primary hover:bg-muted/50
                  `}
        title="Import Captions from .txt, .csv, or .srt file"
      >
        Import Captions
      </span>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[800px] h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview Imported Captions</DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-hidden">
            {parsedCaptions.length > 0 ? (
              <ScrollArea className="h-full w-full rounded-md border p-4">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th scope="col" className="px-6 py-3">#</th>
                      <th scope="col" className="px-6 py-3">Start Time</th>
                      <th scope="col" className="px-6 py-3">End Time</th>
                      <th scope="col" className="px-6 py-3">Text</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedCaptions.map((caption, index) => (
                      <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{index + 1}</td>
                        <td className="px-6 py-4">{caption.startTime.toFixed(2)}s</td>
                        <td className="px-6 py-4">{caption.endTime.toFixed(2)}s</td>
                        <td className="px-6 py-4">{caption.text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No captions to preview.
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between mt-4">
            <Button variant="outline" onClick={handleClearPreview}>
              Clear Imported
            </Button>
            <Button onClick={handleConfirmImport} disabled={parsedCaptions.length === 0}>
              Confirm Import ({parsedCaptions.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 