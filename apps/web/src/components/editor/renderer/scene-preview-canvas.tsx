import { SceneRenderer } from "@/lib/renderer/scene-renderer";
import { useEffect, useRef, useState } from "react";
import { SceneNode } from "@/lib/renderer/nodes/scene-node";
import { useProjectStore } from "@/stores/project-store";

const PREVIEW_FPS = 30;

// TODO: get preview size in a better way
function usePreviewSize() {
  const { activeProject } = useProjectStore();
  return {
    width: activeProject?.canvasSize.width || 600,
    height: activeProject?.canvasSize.height || 320,
  };
}

export function ScenePreviewCanvas({
  frame,
  scene,
}: {
  frame: number;
  scene: SceneNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = usePreviewSize();

  const [renderer] = useState<SceneRenderer | null>(() => {
    const renderer = new SceneRenderer({
      width: size.width,
      height: size.height,
      fps: PREVIEW_FPS,
    });

    return renderer;
  });

  useEffect(() => {
    if (renderer && scene && canvasRef.current) {
      renderer.renderToCanvas(scene, frame, canvasRef.current);
    }
  }, [scene, renderer, frame]);

  return (
    <canvas
      width={size.width}
      height={size.height}
      ref={canvasRef}
      className="w-full h-full"
    />
  );
}
