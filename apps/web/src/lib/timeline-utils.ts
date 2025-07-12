import { useTimelineStore } from "@/stores/timeline-store";
import { type MediaItem } from "@/stores/media-store";
import { toast } from "sonner";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { DragData, TextElement } from "@/types/timeline";


const findOrCreateTrack = (trackType: "media" | "audio" | "text") => {
  const timelineStore = useTimelineStore.getState();
  
  // Always create new text track to allow multiple text elements
  if (trackType === "text") {
    return timelineStore.addTrack(trackType);
  }
  
  const existingTrack = timelineStore.tracks.find(track => track.type === trackType);
  return existingTrack ? existingTrack.id : timelineStore.addTrack(trackType);
};


const checkOverlap = (trackId: string, startTime: number, duration: number, excludeElementId?: string) => {
  const timelineStore = useTimelineStore.getState();
  const targetTrack = timelineStore.tracks.find(track => track.id === trackId);
  
  if (!targetTrack) {
    return true; 
  }

  const elementEnd = startTime + duration;

  return targetTrack.elements.some((existingElement) => {
    if (excludeElementId && existingElement.id === excludeElementId) {
      return false;
    }
    
    const existingStart = existingElement.startTime;
    const existingEnd = existingElement.startTime + 
      (existingElement.duration - existingElement.trimStart - existingElement.trimEnd);

    return startTime < existingEnd && elementEnd > existingStart;
  });
};

const addMediaElement = (trackId: string, item: MediaItem, startTime: number) => {
  const timelineStore = useTimelineStore.getState();
  
  timelineStore.addElementToTrack(trackId, {
    type: "media",
    mediaId: item.id,
    name: item.name,
    duration: item.duration || TIMELINE_CONSTANTS.DEFAULT_IMAGE_DURATION,
    startTime,
    trimStart: 0,
    trimEnd: 0,
  });
};

const addTextElement = (trackId: string, item: TextElement | DragData, startTime: number) => {
  const timelineStore = useTimelineStore.getState();
  
  timelineStore.addElementToTrack(trackId, {
    type: "text",
    name: item.name,
    content: ("content" in item ? item.content : "Default Text"),
    duration: TIMELINE_CONSTANTS.DEFAULT_TEXT_DURATION,
    startTime,
    trimStart: ("trimStart" in item ? item.trimStart : 0),
    trimEnd: ("trimEnd" in item ? item.trimEnd : 0),
    fontSize: ("fontSize" in item ? item.fontSize : 48),
    fontFamily: ("fontFamily" in item ? item.fontFamily : "Arial"),
    color: ("color" in item ? item.color : "#ffffff"),
    backgroundColor: ("backgroundColor" in item ? item.backgroundColor : "transparent"),
    textAlign: ("textAlign" in item ? item.textAlign : "center"),
    fontWeight: ("fontWeight" in item ? item.fontWeight : "normal"),
    fontStyle: ("fontStyle" in item ? item.fontStyle : "normal"),
    textDecoration: ("textDecoration" in item ? item.textDecoration : "none"),
    x: ("x" in item ? item.x : 0),
    y: ("y" in item ? item.y : 0),
    rotation: ("rotation" in item ? item.rotation : 0),
    opacity: ("opacity" in item && item.opacity !== undefined ? item.opacity : 1),
  });
};


// Adds a media item to the timeline at the specified time
export const addMediaToTimeline = (item: MediaItem, currentTime: number = 0) => {
  const trackType = item.type === "audio" ? "audio" : "media";
  const targetTrackId = findOrCreateTrack(trackType);
  
  const duration = item.duration || TIMELINE_CONSTANTS.DEFAULT_IMAGE_DURATION;
  
  if (checkOverlap(targetTrackId, currentTime, duration)) {
    toast.error("Cannot place element here - it would overlap with existing elements");
    return;
  }

  addMediaElement(targetTrackId, item, currentTime);
};

// Adds a text item to the timeline at the specified time
export const addTextToTimeline = (item: TextElement, currentTime: number = 0) => {
  const targetTrackId = findOrCreateTrack("text");
  addTextElement(targetTrackId, item, currentTime);
};

// Adds a media item to timeline
export const addMediaToNewTrack = (item: MediaItem) => {
  const trackType = item.type === "audio" ? "audio" : "media";
  const targetTrackId = findOrCreateTrack(trackType);
  addMediaElement(targetTrackId, item, 0);
};

// Adds a text item to timeline
export const addTextToNewTrack = (item: TextElement | DragData) => {
  const targetTrackId = findOrCreateTrack("text");
  addTextElement(targetTrackId, item, 0);
};
