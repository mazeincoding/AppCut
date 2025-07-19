import { DraggableMediaItem } from "@/components/ui/draggable-item";
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";


async function grab_data(searchTerm: string, setNext: Function, next: string = "")
{
    // set the apikey and limit
    var apikey = "ADD_YOUR_TENOR_KEY"; // add your tenor api key
    var clientkey = "openCut";
    var lmt = 20;

    let search_url = "https://tenor.googleapis.com/v2/search?q=" + searchTerm + "&key=" +
            apikey +"&client_key=" + clientkey +  "&limit=" + lmt + "&contentfilter=off";

    if (next) search_url += "&pos=" + next;
    

    try {
        const response = await fetch(search_url)
        if (!response.ok) return Promise.reject(new Error("NOTE: make sure you've put your tenor api key."))

        const data = await response.json()

        const gifs = data.results.map((gif: any) => gif.media_formats.gif.url);
        const next = data.next // this will be used to load more gifs when scrolling down
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

export function StickerView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [gifs, setGifs] = useState<string[]>([]);
  const [next, setNext] = useState("");

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

        <div
          className="gifs grid p-4 mt-5"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            justifyContent: 'center',
            gap: '1rem',
            maxHeight: '50vh',
            overflowY: 'auto',
          }}
        >
          {gifs.length === 0 ? (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', margin: '2rem 0', fontWeight: 'bold', color: '#888' }}>
              NO GIFS
            </p>
          ) : null}
            {gifs.map((URL, index) => {
                return (
                    <div className="sticker w-1/2 sm:w-1/2 md:w-1/5 lg:w-1/6 xl:w-1/8 flex-grow-0 flex-shrink-0 ml-5" key={index} style={{ boxSizing: "border-box" }}>
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

