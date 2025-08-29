import {
  Input,
  ALL_FORMATS,
  BlobSource,
  CanvasSink,
  WrappedCanvas,
} from "mediabunny";

import { SceneRenderer } from "../scene-renderer";
import { BaseNode } from "./base-node";

const VIDEO_EPSILON = 1 / 1000;
const TIME_FORWARD = 0.5;

export type VideoNodeParams = {
  video: string;
  duration: number;
  timeOffset: number;
  trimStart: number;
  trimEnd: number;
};

export class VideoNode extends BaseNode<VideoNodeParams> {
  sink?: CanvasSink;
  frameIterator?: AsyncGenerator<WrappedCanvas, void, unknown>;
  currentFrame?: WrappedCanvas;

  readyPromise: Promise<void>;

  constructor(params: VideoNodeParams) {
    super(params);
    this.readyPromise = this.load(params.video);
  }

  async load(url: string) {
    const blob = await fetch(url).then((res) => res.blob());
    const source = new BlobSource(blob);
    const input = new Input({
      source,
      formats: ALL_FORMATS,
    });
    const videoTrack = await input.getPrimaryVideoTrack();

    if (!videoTrack) {
      throw new Error("No video track found");
    }

    if (!(await videoTrack.canDecode())) {
      throw new Error("Unable to decode the video track.");
    }

    this.sink = new CanvasSink(videoTrack, {
      poolSize: 2,
      fit: "contain",
      rotation: 90,
    });
  }

  async startFrameIterator(videoTime: number) {
    console.log("starting frame iterator", videoTime);

    if (!this.sink) {
      throw new Error("Sink not initialized");
    }

    // Clear previous iterator
    if (this.frameIterator) {
      await this.frameIterator.return();
    }

    this.frameIterator = this.sink.canvases(videoTime);

    // Return the first frame
    const { value: frame } = await this.frameIterator.next();

    if (!frame) {
      throw new Error("No frame found");
    }

    this.currentFrame = frame;
    return frame;
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

  async getFrameAt(videoTime: number) {
    // If not iterator, start one
    if (!this.frameIterator) {
      return this.startFrameIterator(videoTime);
    }

    // If it's current frame, return it
    if (
      this.currentFrame &&
      videoTime >= this.currentFrame.timestamp &&
      videoTime < this.currentFrame.timestamp + this.currentFrame.duration
    ) {
      return this.currentFrame;
    }

    // If frame near in the iterator, iterate until it
    if (
      this.currentFrame &&
      videoTime >= this.currentFrame.timestamp &&
      videoTime < this.currentFrame.timestamp + TIME_FORWARD
    ) {
      while (true) {
        const { value: frame } = await this.frameIterator.next();
        if (!frame) {
          break;
        }

        this.currentFrame = frame;

        if (frame.timestamp >= videoTime) {
          return frame;
        }
      }
    }

    // Otherwise, start a new iterator
    return this.startFrameIterator(videoTime);
  }

  async render(renderer: SceneRenderer, time: number) {
    await super.render(renderer, time);

    if (!this.isInRange(time)) {
      return;
    }

    await this.readyPromise;

    if (!this.sink) {
      throw new Error("Sink not initialized");
    }

    const videoTime = this.getVideoTime(time);
    const frame = await this.getFrameAt(videoTime);

    if (frame) {
      renderer.context.drawImage(frame.canvas, 0, 0);
    }
  }
}
