import { BaseNode } from "./base-node";

export type SceneNodeParams = {
  duration: number;
};

export class SceneNode extends BaseNode<SceneNodeParams> {
  get duration() {
    return this.params.duration ?? 0;
  }
}
