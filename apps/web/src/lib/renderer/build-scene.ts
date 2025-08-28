import { type TimelineTrack } from "@/types/timeline";
import { type MediaItem } from "@/stores/media-store";

import { SceneNode } from "./nodes/scene-node";
import { VideoNode } from "./nodes/video-node";
import { TimecodeNode } from "./nodes/timecode-node";
import { TextNode } from "./nodes/text-node";

export type BuildSceneParams = {
  canvasSize: { width: number; height: number };
  tracks: TimelineTrack[];
  mediaItems: MediaItem[];
  duration: number;
};

export function buildScene(params: BuildSceneParams) {
  const { tracks, mediaItems, duration, canvasSize } = params;

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

    if (element.type === "text") {
      console.log(element);
      scene.add(
        new TextNode({
          text: element.content,
          fontSize: element.fontSize,
          fontFamily: element.fontFamily,
          fontWeight: element.fontWeight === "bold" ? 700 : 400,
          fontStyle: element.fontStyle === "italic" ? "italic" : "normal",
          textAlign: element.textAlign,
          textBaseline: "middle",
          color: element.color,
          opacity: element.opacity,
          timeStart: element.startTime,
          duration: element.duration - element.trimEnd - element.trimStart,
          x: element.x + canvasSize.width / 2,
          y: element.y + canvasSize.height / 2,
        })
      );
    }
  }

  scene.add(new TimecodeNode());

  return scene;
}
