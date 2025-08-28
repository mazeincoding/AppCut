import { SceneRenderer } from "../scene-renderer";

export type BaseNodeParams = Record<string, unknown> | undefined;

export class BaseNode<Params extends BaseNodeParams = BaseNodeParams> {
  params: Params;

  constructor(params?: Params) {
    this.params = params ?? ({} as Params);
  }

  children: BaseNode[] = [];

  add(child: BaseNode) {
    this.children.push(child);
    return this;
  }

  remove(child: BaseNode) {
    this.children = this.children.filter((c) => c !== child);
    return this;
  }

  async render(renderer: SceneRenderer, time: number): Promise<void> {
    for (const child of this.children) {
      await child.render(renderer, time);
    }
  }
}
