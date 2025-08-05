import { SceneRenderer } from "../scene-renderer";
import { BaseNode } from "./base-node";

export type TimeOffsetNodeParams = {
  timeOffset?: number;
};

export class TimeOffsetNode extends BaseNode<TimeOffsetNodeParams> {
  get timeOffset() {
    return this.params.timeOffset ?? 0;
  }

  async render(renderer: SceneRenderer, time: number) {
    await super.render(renderer, time - this.timeOffset);
  }
}
