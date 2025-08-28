import { SceneRenderer } from "../scene-renderer";
import { BaseNode } from "./base-node";

export class TimecodeNode extends BaseNode {
  async render(renderer: SceneRenderer, time: number) {
    renderer.context.fillStyle = "white";
    renderer.context.font = "16px Arial";

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time) % 60;
    const frame = Math.floor(time * renderer.fps) % renderer.fps;

    const minutesStr = minutes.toString().padStart(2, "0");
    const secondsStr = seconds.toString().padStart(2, "0");
    const frameStr = frame.toString().padStart(2, "0");

    const text = `${minutesStr}:${secondsStr}:${frameStr}`;
    renderer.context.fillText(text, 10, 20);
  }
}
