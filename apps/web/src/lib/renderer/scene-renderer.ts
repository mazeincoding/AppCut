import { BaseNode } from "./nodes/base-node";

export type SceneRendererParams = {
  width: number;
  height: number;
  fps: number;
};

export class SceneRenderer {
  canvas: OffscreenCanvas;
  context: OffscreenCanvasRenderingContext2D;

  width: number;
  height: number;
  fps: number;

  constructor(params: SceneRendererParams) {
    this.width = params.width;
    this.height = params.height;
    this.fps = params.fps;

    this.canvas = new OffscreenCanvas(params.width, params.height);

    const context = this.canvas.getContext("2d");

    if (!context) {
      throw new Error("Failed to get canvas context");
    }

    this.context = context;
  }

  setSize(width: number, height: number) {
    this.canvas = new OffscreenCanvas(width, height);
    this.width = width;
    this.height = height;
  }

  private clear() {
    this.context.fillStyle = "black";
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  async render(node: BaseNode, frame: number) {
    this.clear();
    await node.render(this, frame / this.fps);
  }

  async renderToCanvas(
    node: BaseNode,
    frame: number,
    canvas: HTMLCanvasElement
  ) {
    await this.render(node, frame);

    const ctx = canvas.getContext("2d")!;

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    ctx.drawImage(this.canvas, 0, 0, canvas.width, canvas.height);
  }
}
