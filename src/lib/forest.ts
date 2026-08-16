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

function sliceNodes(nodes: Node[], ids: Set<string>): Node[] {
  return nodes
    .filter((node) => ids.has(node.id))
    .map((node) => ({
      id: node.id,
      gender: node.gender,
      placeholder: node.placeholder,
      parents: node.parents.filter((rel) => ids.has(rel.id)),
      children: node.children.filter((rel) => ids.has(rel.id)),
      spouses: node.spouses.filter((rel) => ids.has(rel.id)),
      siblings: node.siblings.filter((rel) => ids.has(rel.id)),
    })) as Node[];
}

function restrictAdjacency(adjacency: Adjacency, ids: Set<string>): Adjacency {
  const next: Adjacency = {};
  for (const id of ids) {
    next[id] = (adjacency[id] ?? []).filter((neighbor) => ids.has(neighbor.id));
  }
  return next;
}

function calcLaid(nodes: Node[], ids: string[], rootId: string): LaidTree {
  if (ids.length === 0) {
    return { canvas: { width: SIZE, height: SIZE }, nodes: [] };
  }
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

function boxesOverlap(
  extra: LaidTree,
  originX: number,
  originY: number,
  placed: ForestNode[],
) {
  return extra.nodes.some((node) => {
    if (node.placeholder) return false;
    const left = node.left + originX;
    const top = node.top + originY;
    return placed.some(
      (other) =>
        !other.placeholder &&
        Math.abs(other.left - left) < SIZE &&
        Math.abs(other.top - top) < SIZE,
    );
  });
}

function layoutComponent(
  nodes: Node[],
  ids: string[],
  rootId: string,
  adjacency: Adjacency,
): LaidTree {
  const placed: ForestNode[] = [];
  let width = SIZE;
  let height = SIZE;

  function addTree(tree: LaidTree, originX: number, originY: number) {
    for (const node of tree.nodes) {
      if (
        !node.placeholder &&
        placed.some((other) => other.id === node.id && !other.placeholder)
      ) {
        continue;
      }
      placed.push({
        id: node.id,
        left: node.left + originX,
        top: node.top + originY,
        placeholder: node.placeholder,
      });
    }
    width = Math.max(width, ...placed.map((node) => node.left + SIZE));
    height = Math.max(height, ...placed.map((node) => node.top + SIZE));
  }

  const mainIds = new Set(ids);
  const mainNodes = sliceNodes(nodes, mainIds);
  const mainRoot = mainIds.has(rootId) ? rootId : ids[0];
  addTree(calcLaid(mainNodes, ids, mainRoot), 0, 0);

  const laid = () =>
    new Set(placed.filter((node) => !node.placeholder).map((node) => node.id));

  let guard = 0;
  while (guard < ids.length + 2) {
    guard += 1;
    const missing = ids.filter((id) => !laid().has(id));
    if (missing.length === 0) break;

    const missingSet = new Set(missing);
    const groups = connectedComponents(restrictAdjacency(adjacency, missingSet));
    groups.sort((a, b) => b.length - a.length);

    let attachId: string | undefined;
    let group = groups[0];
    outer: for (const candidate of groups) {
      for (const id of candidate) {
        const anchor = (adjacency[id] ?? []).find(
          (neighbor) =>
            laid().has(neighbor.id) &&
            (neighbor.kind === "parent" || neighbor.kind === "spouse"),
        );
        if (anchor) {
          group = candidate;
          attachId = anchor.id;
          break outer;
        }
      }
    }

    const groupSet = new Set(group);
    const groupNodes = sliceNodes(nodes, groupSet);
    const nodesById = new Map(groupNodes.map((node) => [node.id, node]));
    const groupRoot = attachId
      ? (group.find((id) =>
          (adjacency[id] ?? []).some((neighbor) => neighbor.id === attachId),
        ) ?? pickRoot(group, nodesById, group[0]))
      : pickRoot(group, nodesById, group[0]);

    const extra = calcLaid(groupNodes, group, groupRoot);
    const extraRoot = extra.nodes.find((node) => node.id === groupRoot) ?? extra.nodes[0];

    let originX = width + TREE_GAP;
    let originY = 0;
    if (attachId && extraRoot) {
      const anchor = placed.find((node) => node.id === attachId);
      if (anchor) {
        originX = anchor.left - extraRoot.left;
        originY = anchor.top + SIZE + TREE_GAP - extraRoot.top;
        if (boxesOverlap(extra, originX, originY, placed)) {
          originX = width + TREE_GAP - extraRoot.left;
          originY = anchor.top - extraRoot.top;
        }
        if (boxesOverlap(extra, originX, originY, placed)) {
          originX = extraRoot.left * -1;
          originY = height + TREE_GAP - extraRoot.top;
        }
      }
    }

    addTree(extra, originX, originY);
  }

  return { nodes: placed, canvas: { width, height } };
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
    const canvas = place(layoutComponent(nodes, group, root, adjacency), cursorX, 0);
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
      place(
        layoutComponent(nodes, group, root, adjacency),
        col * cellW,
        originY + row * cellH,
      );
    });
  }

  const width = Math.max(SIZE, ...placed.map((node) => node.left + SIZE));
  const height = Math.max(SIZE, ...placed.map((node) => node.top + SIZE));
  return { nodes: placed, canvas: { width, height } };
}
