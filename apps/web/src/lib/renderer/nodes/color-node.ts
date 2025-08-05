import { SceneRenderer } from "../scene-renderer";
import { BaseNode } from "./base-node";

export type ColorNodeParams = {
  color: string;
};

export class ColorNode extends BaseNode<ColorNodeParams> {
  private color: string;

  constructor(params: ColorNodeParams) {
    super(params);
    this.color = params.color;
  }

  async render(renderer: SceneRenderer, time: number) {
    renderer.context.fillStyle = this.color;
    renderer.context.fillRect(0, 0, renderer.width, renderer.height);
  }
}
