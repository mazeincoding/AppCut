import { DraggableMediaItem } from "@/components/ui/draggable-item";
import { Search } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MediaItem, useMediaStore } from "@/stores/media-store";

import { useDragDrop } from "@/hooks/use-drag-drop";
import { processMediaFiles } from "@/lib/media-processing";
import { toast } from "sonner";
import { useProjectStore } from "@/stores/project-store";

async function grab_data(searchTerm: string, setNext: Function, next: string = "")
{
    // set the apikey and limit
    var apikey = "AIzaSyBoGh9WszS_hXwaQP3ppEdLESqcyPg7mZs"; // add your tenor api key
    var clientkey = "openCut";
    var lmt = 20;

    let search_url = "https://tenor.googleapis.com/v2/search?q=" + searchTerm + "&key=" +
            apikey +"&client_key=" + clientkey +  "&limit=" + lmt + "&contentfilter=off";

    if (next) search_url += "&pos=" + next;
    

    try {
        const response = await fetch(search_url)
        const data = await response.json()

        console.log(data)
        const gifs = data.results.map((gif: any) => gif.media_formats.gif.url);
        const next = data.next // this will be used to load more gifs when scrolling down
        console.log("Next page token: ", next)
        setNext(next)
        return gifs

    } catch (err) {
        console.log("An error happend while loading stickers: ", err)
        return err
    }

}




function extractGifName(url: string) {
  const baseUrl = "https://media.tenor.com/"
    
  let url2 = url.replace(baseUrl, "")
  const slashIndex = url2.indexOf("/")
  const fileName = url2.slice(slashIndex+1)

  return fileName

}

async function createFileFromUrl(url: string){
  const response = await fetch(url)

  const blob: Blob = await response.blob()
  const gifFileName: string = extractGifName(response.url)

  const file: File = new File([blob], gifFileName, { type: blob.type })

  const objUrl = URL.createObjectURL(file)
  return objUrl

}



export function StickerView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [gifs, setGifs] = useState<string[]>([]);
  const [next, setNext] = useState("");
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const { mediaItems, addMediaItem, removeMediaItem } = useMediaStore();

  useEffect(() => {
    if (searchQuery === "") return;

    const delayDebounce = setTimeout(() => {
      const urls = grab_data(searchQuery, setNext)
      urls.then(urls => setGifs(urls))

    }, 1000); // 1 second delay

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  useEffect(() => {
    const gifsContainer = document.querySelector('.gifs');
    let isFetching = false;

    function handleScroll() {
      if (!gifsContainer) return;

      const isAtBottom =
        gifsContainer.scrollHeight - gifsContainer.scrollTop <= gifsContainer.clientHeight + 10;

      if (isAtBottom && !isFetching && searchQuery !== "" && next) {
        isFetching = true;
        grab_data(searchQuery, setNext, next).then((urls: string[]) => {
            urls.forEach((url: string) => {
                if (!gifs.includes(url)) setGifs(prev => [...prev, url]);
                else console.log("Already included: ", url)

            });

            isFetching = false;

        });
      }
    }

    gifsContainer?.addEventListener('scroll', handleScroll);

    return () => gifsContainer?.removeEventListener('scroll', handleScroll);

  }, [gifs, next, searchQuery]);

  function handleSearch(searchTerm: string) {
    setGifs([])
    setSearchQuery(searchTerm);
  }
  async function processFiles(files: FileList | File[]) {
    const { activeProject } = useProjectStore();
    
    if (!files || files.length === 0) return;
    if (!activeProject) {
      toast.error("No active project");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    try {
      // Process files (extract metadata, generate thumbnails, etc.)
      const processedItems = await processMediaFiles(files, (p) =>
        setProgress(p)
      );

      // Add each processed media item to the store
      for (const item of processedItems) {
        await addMediaItem(activeProject.id, item);
      }
      
    } catch (error) {
      // Show error toast if processing fails
      console.error("Error processing files:", error);
      toast.error("Failed to process files");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };


  const { isDragOver, dragProps } = useDragDrop({
    // When files are dropped, process them
    // onDrop: processFiles,
    onDrop: (files) => {console.log("askdsajdjhsadas")},

  });

  return (
    <>
        <div className="search">
            {/* <input type="text" placeholder="Search GIFs on tenor..." style={searchStyle} /> */}
            <Input
                type="text"
                placeholder="Search GIFs on tenor..."
                className="min-w-[60px] flex-1 h-full text-xs mt-3 ml-2"
                value={searchQuery}
                onChange={(e) => {handleSearch(e.target.value)}}
                style={{ width: "95%" }}
            />

        </div>

        <div   className="gifs flex flex-wrap gap-2 md:gap-10 p-4 ml-14 mt-5"
               style={{
                maxHeight: '50vh',
                overflowY: 'auto', // Use auto instead of scroll for better UX
               }}>
            {gifs.map((URL, index) => {
                return (
                    <div className="sticker w-1/2 sm:w-1/2 md:w-1/5 lg:w-1/6 xl:w-1/8 flex-grow-0 flex-shrink-0" key={index} style={{ boxSizing: "border-box" }}>
                        <DraggableMediaItem
                            name="GIF"
                            preview={
                            <img
                                src={URL}
                                alt="Sticker Preview"
                                className="w-full h-full object-cover rounded tenor-gif" />
                            }
                            dragData={{
                                id: "STICKER",
                                type: "GIF",
                                name: extractGifName(URL),
                                content: URL
                            }}
                            aspectRatio={1}
                            showLabel={false}
                        />
                    </div>
                )})
            }
        </div>

    </>
  );
}

