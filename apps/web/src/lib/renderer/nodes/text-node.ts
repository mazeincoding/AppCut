import { SceneRenderer } from "../scene-renderer";
import { BaseNode } from "./base-node";

export type TextNodeParams = {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  fontStyle: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  color: string;
  opacity: number;

  x: number;
  y: number;

  timeStart: number;
  duration: number;
};

export class TextNode extends BaseNode<TextNodeParams> {
  isInRange(time: number) {
    return (
      time >= this.params.timeStart &&
      time < this.params.timeStart + this.params.duration
    );
  }

  async render(renderer: SceneRenderer, time: number) {
    if (!this.isInRange(time)) {
      return;
    }

    renderer.context.save();

    renderer.context.font = `${this.params.fontStyle} ${this.params.fontWeight} ${this.params.fontSize}px ${this.params.fontFamily}`;
    renderer.context.textAlign = this.params.textAlign;
    renderer.context.textBaseline = this.params.textBaseline;
    renderer.context.fillStyle = this.params.color;

    const prevAlpha = renderer.context.globalAlpha;
    renderer.context.globalAlpha = this.params.opacity;

    renderer.context.fillText(this.params.text, this.params.x, this.params.y);

    renderer.context.globalAlpha = prevAlpha;
    renderer.context.restore();
  }
}
