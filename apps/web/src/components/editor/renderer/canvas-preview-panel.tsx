import { useCallback, useMemo, useRef } from "react";
import useDeepCompareEffect from "use-deep-compare-effect";

import { useRafLoop } from "@/hooks/use-raf-loop";
import { SceneNode } from "@/lib/renderer/nodes/scene-node";
import { TimeOffsetNode } from "@/lib/renderer/nodes/time-offset-node";
import { TimecodeNode } from "@/lib/renderer/nodes/timecode-node";
import { VideoNode } from "@/lib/renderer/nodes/video-node";
import { SceneRenderer } from "@/lib/renderer/scene-renderer";
import { useEditorStore } from "@/stores/editor-store";
import { useMediaStore } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useRendererStore } from "@/stores/renderer-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { TimelineElement } from "@/types/timeline";

function useActiveElements(): TimelineElement[] {
  const tracks = useTimelineStore((s) => s.tracks);
  return tracks.flatMap((track) => track.elements);
}

function RendererSceneController() {
  const setScene = useRendererStore((s) => s.setScene);
  const mediaItems = useMediaStore((s) => s.mediaItems);
  const elements = useActiveElements();

  const getTotalDuration = useTimelineStore((s) => s.getTotalDuration);

  useDeepCompareEffect(() => {
    const scene = new SceneNode({ duration: getTotalDuration() });

    for (const element of elements) {
      if (element.type === "media") {
        const media = mediaItems.find((m) => m.id === element.mediaId);
        if (media && media.url) {
          scene.add(
            new TimeOffsetNode({ timeOffset: element.startTime }).add(
              new VideoNode({ video: media.url })
            )
          );
        }
      }
    }

    scene.add(new TimecodeNode());
    setScene(scene);
  }, [elements, mediaItems, getTotalDuration]);

  return null;
}

function PreviewCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const lastFrameRef = useRef(0);
  const lastSceneRef = useRef<SceneNode | null>(null);

  const { width, height } = useEditorStore((s) => s.canvasSize);

  const renderer = useMemo(() => {
    return new SceneRenderer({
      width: width / 2,
      height: height / 2,
      fps: 30, // TODO: get fps from project
    });
  }, [width, height]);

  const scene = useRendererStore((s) => s.scene);

  const render = useCallback(() => {
    if (ref.current && scene) {
      const time = usePlaybackStore.getState().currentTime;
      const frame = Math.floor(time * renderer.fps);

      if (frame !== lastFrameRef.current || scene !== lastSceneRef.current) {
        console.log("rendering", frame);
        renderer.renderToCanvas(scene, frame, ref.current);
        lastSceneRef.current = scene;
        lastFrameRef.current = frame;
      }
    }
  }, [renderer, scene]);

  useRafLoop(render);

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      className="max-w-full max-h-full block border"
    />
  );
}

export function CanvasPreviewPanel() {
  return (
    <div className="h-full w-full flex flex-col min-h-0 min-w-0 bg-panel rounded-sm relative">
      <div className="flex flex-1 items-center justify-center min-h-0 min-w-0 p-2">
        <PreviewCanvas />
        <RendererSceneController />
      </div>
    </div>
  );
}
