import calcTree from "relatives-tree";
import type { Node } from "relatives-tree/lib/types";
import { connectedComponents, type Adjacency } from "@/lib/graph";

const SIZE = 2;
const TREE_GAP = 3;
const ISOLATE_GAP = 1;

export type ForestNode = {
  id: string;
  left: number;
  top: number;
  placeholder?: boolean;
};

export type ForestLayout = {
  nodes: ForestNode[];
  canvas: { width: number; height: number };
};

function pickRoot(ids: string[], nodesById: Map<string, Node>, focusId: string) {
  if (ids.includes(focusId)) return focusId;
  const withoutParents = ids.filter(
    (id) => (nodesById.get(id)?.parents.length ?? 0) === 0,
  );
  const candidates = withoutParents.length > 0 ? withoutParents : ids;
  return [...candidates].sort((a, b) => {
    const byChildren =
      (nodesById.get(b)?.children.length ?? 0) -
      (nodesById.get(a)?.children.length ?? 0);
    if (byChildren !== 0) return byChildren;
    return a.localeCompare(b);
  })[0];
}

type LaidTree = {
  canvas: { width: number; height: number };
  nodes: Array<{ id: string; left: number; top: number; placeholder?: boolean }>;
};

function layoutComponent(nodes: Node[], ids: string[], rootId: string): LaidTree {
  try {
    const tree = calcTree(nodes, { rootId });
    return {
      canvas: { width: tree.canvas.width, height: tree.canvas.height },
      nodes: tree.nodes.map((node) => ({
        id: node.id,
        left: node.left,
        top: node.top,
        placeholder: node.placeholder,
      })),
    };
  } catch {
    return {
      canvas: { width: SIZE, height: Math.max(SIZE, ids.length * SIZE) },
      nodes: ids.map((id, index) => ({
        id,
        left: 0,
        top: index * SIZE,
        placeholder: false,
      })),
    };
  }
}

export function layoutForest(
  nodes: Node[],
  adjacency: Adjacency,
  focusId: string,
): ForestLayout {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const components = connectedComponents(adjacency);
  const focusComponent = components.find((group) => group.includes(focusId));
  const rest = components.filter((group) => group !== focusComponent);
  const families = rest.filter((group) => group.length > 1);
  const isolates = rest.filter((group) => group.length === 1);

  const placed: ForestNode[] = [];

  function place(tree: LaidTree, originX: number, originY: number) {
    for (const node of tree.nodes) {
      placed.push({
        id: node.id,
        left: node.left + originX,
        top: node.top + originY,
        placeholder: node.placeholder,
      });
    }
    return tree.canvas;
  }

  let cursorX = 0;
  let rowHeight = 0;
  let rowWidth = 0;

  const firstRow = [...(focusComponent ? [focusComponent] : []), ...families];
  for (const group of firstRow) {
    const root = pickRoot(group, nodesById, focusId);
    const canvas = place(layoutComponent(nodes, group, root), cursorX, 0);
    cursorX += canvas.width + TREE_GAP;
    rowWidth = Math.max(rowWidth, cursorX);
    rowHeight = Math.max(rowHeight, canvas.height);
  }

  if (isolates.length > 0) {
    const originY = firstRow.length > 0 ? rowHeight + TREE_GAP : 0;
    const cellW = SIZE + ISOLATE_GAP;
    const cellH = SIZE + ISOLATE_GAP;
    const cols = Math.max(3, Math.floor(Math.max(rowWidth, cellW * 3) / cellW));
    isolates.forEach((group, index) => {
      const root = pickRoot(group, nodesById, focusId);
      const col = index % cols;
      const row = Math.floor(index / cols);
      place(layoutComponent(nodes, group, root), col * cellW, originY + row * cellH);
    });
  }

  const width = Math.max(SIZE, ...placed.map((node) => node.left + SIZE));
  const height = Math.max(SIZE, ...placed.map((node) => node.top + SIZE));
  return { nodes: placed, canvas: { width, height } };
}
