import EventEmitter from "eventemitter3";

import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  CanvasSource,
} from "mediabunny";

import { SceneNode } from "./nodes/scene-node";
import { SceneRenderer } from "./scene-renderer";

type ExportParams = {
  width: number;
  height: number;
  fps: number;
  bitrate?: number;
};

const DEFAULT_BITRATE = 4_000_000;

export type SceneExporterEvents = {
  progress: [progress: number];
  complete: [blob: Blob];
  error: [error: Error];
  cancelled: [];
};

export class SceneExporter extends EventEmitter<SceneExporterEvents> {
  private renderer: SceneRenderer;
  private bitrate: number;

  private cancelled = false;

  constructor(params: ExportParams) {
    super();
    this.renderer = new SceneRenderer({
      width: params.width,
      height: params.height,
      fps: params.fps,
    });

    this.bitrate = params.bitrate ?? DEFAULT_BITRATE;
  }

  cancel() {
    this.cancelled = true;
  }

  async export(scene: SceneNode) {
    const { fps } = this.renderer;
    const frameCount = Math.ceil(scene.duration * fps);

    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget(),
    });

    const videoSource = new CanvasSource(this.renderer.canvas, {
      codec: "avc",
      bitrate: this.bitrate,
    });

    output.addVideoTrack(videoSource);

    await output.start();

    for (let i = 0; i < frameCount; i++) {
      if (this.cancelled) {
        await output.cancel();
        this.emit("cancelled");
        return;
      }

      await this.renderer.render(scene, i);
      await videoSource.add(i / fps, 1 / fps);
      this.emit("progress", i / frameCount);
    }

    await output.finalize();
    this.emit("progress", 1);

    const buffer = output.target.buffer;
    if (!buffer) {
      this.emit("error", new Error("Failed to export video"));
      return null;
    }

    const blob = new Blob([buffer], { type: "video/mp4" });
    this.emit("complete", blob);
    return blob;
  }
}
