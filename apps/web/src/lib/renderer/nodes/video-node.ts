import { SceneRenderer } from "../scene-renderer";
import { BaseNode } from "./base-node";

const VIDEO_EPSILON = 1 / 500;

export type VideoNodeParams = {
  video: HTMLVideoElement | string;
  duration: number;
  timeOffset: number;
  trimStart: number;
  trimEnd: number;
};

export class VideoNode extends BaseNode<VideoNodeParams> {
  videoElement: HTMLVideoElement;

  readyPromise: Promise<void>;

  constructor(params: VideoNodeParams) {
    super(params);

    if (typeof params.video === "string") {
      this.videoElement = document.createElement("video");
      this.videoElement.src = params.video;
      this.videoElement.muted = true;
    } else {
      this.videoElement = params.video;
    }

    this.readyPromise = new Promise((resolve) => {
      this.videoElement.addEventListener("canplay", () => {
        resolve();
      });
    });
  }

  async seek(videoTime: number) {
    await this.readyPromise;
    return new Promise<void>((resolve) => {
      const handleSeeked = () => {
        this.videoElement.removeEventListener("seeked", handleSeeked);
        resolve();
      };
      this.videoElement.addEventListener("seeked", handleSeeked);
      this.videoElement.currentTime = videoTime;
    });
  }

  getVideoTime(time: number) {
    return time - this.params.timeOffset + this.params.trimStart;
  }

  isInRange(time: number) {
    const videoTime = this.getVideoTime(time);
    return (
      videoTime >= this.params.trimStart - VIDEO_EPSILON &&
      videoTime < this.params.duration - this.params.trimEnd
    );
  }

  async render(renderer: SceneRenderer, time: number) {
    await super.render(renderer, time);

    if (!this.isInRange(time)) {
      return;
    }

    const videoTime = this.getVideoTime(time);
    await this.seek(videoTime);

    renderer.context.drawImage(
      this.videoElement,
      0,
      0,
      renderer.width,
      renderer.height
    );
  }
}
