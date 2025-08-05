import { SceneRenderer } from "@/lib/renderer/scene-renderer";
import { useEffect, useRef, useState } from "react";
import { SceneNode } from "@/lib/renderer/nodes/scene-node";

const PREVIEW_SIZE = { width: 600, height: 320 };
const PREVIEW_FPS = 30;

export function ScenePreviewCanvas({
  frame,
  scene,
}: {
  frame: number;
  scene: SceneNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [renderer] = useState<SceneRenderer | null>(() => {
    const renderer = new SceneRenderer({
      width: PREVIEW_SIZE.width,
      height: PREVIEW_SIZE.height,
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
      width={PREVIEW_SIZE.width}
      height={PREVIEW_SIZE.height}
      ref={canvasRef}
      className="w-full h-full"
    />
  );
}
