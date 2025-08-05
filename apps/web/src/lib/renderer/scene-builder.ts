import { SceneNode } from "./nodes/scene-node";
import { ColorNode } from "./nodes/color-node";
import { VideoNode } from "./nodes/video-node";
import { TimeOffsetNode } from "./nodes/time-offset-node";
import { TimecodeNode } from "./nodes/timecode-node";
import { BaseNode } from "./nodes/base-node";

// Registry of node constructors
const nodeConstructors = {
  scene: SceneNode,
  color: ColorNode,
  video: VideoNode,
  timeOffset: TimeOffsetNode,
  timecode: TimecodeNode,
} as const;

type NodeType = keyof typeof nodeConstructors;

type NodeParams<T extends NodeType> = ConstructorParameters<
  (typeof nodeConstructors)[T]
>[0];

type NodeDefinition<T extends NodeType = NodeType> = {
  type: T;
  params?: NodeParams<T>;
  children?: NodeDefinition[];
};

export const buildNode = <T extends NodeType>(
  definition: NodeDefinition<T>
): BaseNode => {
  const NodeConstructor = nodeConstructors[definition.type];
  const node = new NodeConstructor(definition.params || ({} as any));
  if (definition.children) {
    for (const child of definition.children) {
      node.add(buildNode(child));
    }
  }
  return node;
};

export const buildScene = (definition: NodeDefinition<"scene">): SceneNode => {
  return buildNode(definition) as SceneNode;
};
