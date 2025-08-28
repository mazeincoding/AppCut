import { type TimelineTrack } from "@/types/timeline";
import { type MediaItem } from "@/stores/media-store";

import { SceneNode } from "./nodes/scene-node";
import { VideoNode } from "./nodes/video-node";
import { TimecodeNode } from "./nodes/timecode-node";

export type BuildSceneParams = {
  tracks: TimelineTrack[];
  mediaItems: MediaItem[];
  duration: number;
};

export function buildScene(params: BuildSceneParams) {
  const { tracks, mediaItems, duration } = params;

  const scene = new SceneNode({ duration });

  const elements = tracks
    .slice()
    .reverse()
    .filter((track) => track.muted !== true)
    .flatMap((track) => track.elements);

  for (const element of elements) {
    if (element.type === "media") {
      const media = mediaItems.find((m) => m.id === element.mediaId);
      console.log(element);
      if (media && media.url) {
        scene.add(
          new VideoNode({
            video: media.url,
            duration: element.duration,
            timeOffset: element.startTime,
            trimStart: element.trimStart,
            trimEnd: element.trimEnd,
          })
        );
      }
    }
  }

  scene.add(new TimecodeNode());

  return scene;
}
