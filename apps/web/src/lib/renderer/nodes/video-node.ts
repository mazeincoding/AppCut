import { SceneRenderer } from "../scene-renderer";
import { BaseNode } from "./base-node";

export type VideoNodeParams = {
  video: HTMLVideoElement | string;
};

export class VideoNode extends BaseNode<VideoNodeParams> {
  private videoElement: HTMLVideoElement;

  constructor(params: VideoNodeParams) {
    super(params);

    if (typeof params.video === "string") {
      this.videoElement = document.createElement("video");
      this.videoElement.src = params.video;
      this.videoElement.muted = true;
    } else {
      this.videoElement = params.video;
    }
  }

  get duration() {
    return this.videoElement.duration;
  }

  async seek(time: number) {
    this.videoElement.currentTime = time;
    return new Promise<void>((resolve) => {
      this.videoElement.onseeked = () => resolve();
    });
  }

  async render(renderer: SceneRenderer, time: number) {
    await super.render(renderer, time);

    if (time < 0 || time > this.duration) {
      return;
    }

    await this.seek(time);
    renderer.context.drawImage(
      this.videoElement,
      0,
      0,
      renderer.width,
      renderer.height
    );
  }
}
