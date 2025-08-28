import { useCallback, useMemo, useRef } from "react";
import useDeepCompareEffect from "use-deep-compare-effect";

import { useRafLoop } from "@/hooks/use-raf-loop";
import { SceneNode } from "@/lib/renderer/nodes/scene-node";
import { SceneRenderer } from "@/lib/renderer/scene-renderer";
import { useMediaStore } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useRendererStore } from "@/stores/renderer-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useProjectStore } from "@/stores/project-store";
import { buildScene } from "@/lib/renderer/build-scene";

// TODO: get preview size in a better way
function usePreviewSize() {
  const { activeProject } = useProjectStore();
  return {
    width: activeProject?.canvasSize?.width || 600,
    height: activeProject?.canvasSize?.height || 320,
  };
}

function RendererSceneController() {
  const setScene = useRendererStore((s) => s.setScene);

  const tracks = useTimelineStore((s) => s.tracks);
  const mediaItems = useMediaStore((s) => s.mediaItems);

  const getTotalDuration = useTimelineStore((s) => s.getTotalDuration);

  useDeepCompareEffect(() => {
    const scene = buildScene({
      tracks,
      mediaItems,
      duration: getTotalDuration(),
    });

    setScene(scene);
  }, [tracks, mediaItems, getTotalDuration]);

  return null;
}

function PreviewCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const lastFrameRef = useRef(0);
  const lastSceneRef = useRef<SceneNode | null>(null);

  const { width, height } = usePreviewSize();

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
