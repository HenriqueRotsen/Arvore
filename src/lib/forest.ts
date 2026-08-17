import type { Node } from "relatives-tree/lib/types";
import { connectedComponents, type Adjacency } from "@/lib/graph";

const SIZE = 2;
const TREE_GAP = 3;
const ISOLATE_GAP = 1;
const UNIT_GAP = 1;

export type ForestNode = {
  id: string;
  left: number;
  top: number;
  placeholder?: boolean;
};

export type ForestLayout = {
  nodes: ForestNode[];
  canvas: { width: number; height: number };
  largestRootId: string | null;
};

function neighborIds(
  adjacency: Adjacency,
  id: string,
  kind: "parent" | "child" | "spouse",
) {
  return (adjacency[id] ?? [])
    .filter((neighbor) => neighbor.kind === kind)
    .map((neighbor) => neighbor.id);
}

function shareAParent(adjacency: Adjacency, a: string, b: string) {
  const parentsA = new Set(neighborIds(adjacency, a, "parent"));
  return neighborIds(adjacency, b, "parent").some((id) => parentsA.has(id));
}

function pickGenealogicalRoot(
  ids: string[],
  nodesById: Map<string, Node>,
  adjacency: Adjacency,
) {
  const withoutParents = ids.filter(
    (id) => neighborIds(adjacency, id, "parent").length === 0,
  );
  const candidates = withoutParents.length > 0 ? withoutParents : ids;
  return [...candidates].sort((a, b) => {
    const byChildren =
      neighborIds(adjacency, b, "child").length -
      neighborIds(adjacency, a, "child").length;
    if (byChildren !== 0) return byChildren;
    const byNodeChildren =
      (nodesById.get(b)?.children.length ?? 0) -
      (nodesById.get(a)?.children.length ?? 0);
    if (byNodeChildren !== 0) return byNodeChildren;
    return a.localeCompare(b);
  })[0];
}

type LaidTree = {
  canvas: { width: number; height: number };
  nodes: ForestNode[];
};

type FamilyUnit = {
  id: string;
  members: string[];
  generation: number;
  width: number;
  left: number;
};

function layoutComponent(ids: string[], adjacency: Adjacency): LaidTree {
  const idSet = new Set(ids);
  const unionParent = new Map(ids.map((id) => [id, id]));

  function find(id: string): string {
    const parent = unionParent.get(id) ?? id;
    if (parent === id) return id;
    const root = find(parent);
    unionParent.set(id, root);
    return root;
  }

  function union(a: string, b: string) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) unionParent.set(rootB, rootA);
  }

  for (const id of ids) {
    for (const spouseId of neighborIds(adjacency, id, "spouse")) {
      if (!idSet.has(spouseId) || shareAParent(adjacency, id, spouseId)) continue;
      union(id, spouseId);
    }
  }

  const membersByRoot = new Map<string, string[]>();
  for (const id of ids) {
    const root = find(id);
    const members = membersByRoot.get(root) ?? [];
    members.push(id);
    membersByRoot.set(root, members);
  }

  const units: FamilyUnit[] = [...membersByRoot].map(([id, members]) => {
    const anchor = [...members].sort((a, b) => {
      const scoreA =
        neighborIds(adjacency, a, "child").length * 3 +
        neighborIds(adjacency, a, "parent").length * 2 +
        neighborIds(adjacency, a, "spouse").length;
      const scoreB =
        neighborIds(adjacency, b, "child").length * 3 +
        neighborIds(adjacency, b, "parent").length * 2 +
        neighborIds(adjacency, b, "spouse").length;
      return scoreB - scoreA || a.localeCompare(b);
    })[0];
    const partners = members
      .filter((memberId) => memberId !== anchor)
      .sort();
    const ordered =
      partners.length > 1
        ? [partners[0], anchor, ...partners.slice(1)]
        : [anchor, ...partners];
    return {
      id,
      members: ordered,
      generation: 0,
      width: (ordered.length - 1) * SIZE + SIZE,
      left: 0,
    };
  });

  const unitByPerson = new Map<string, FamilyUnit>();
  for (const unit of units) {
    for (const id of unit.members) unitByPerson.set(id, unit);
  }

  for (let pass = 0; pass < units.length + 1; pass += 1) {
    let changed = false;
    for (const parentId of ids) {
      const parentUnit = unitByPerson.get(parentId);
      if (!parentUnit) continue;
      for (const childId of neighborIds(adjacency, parentId, "child")) {
        const childUnit = unitByPerson.get(childId);
        if (!childUnit || childUnit === parentUnit) continue;
        const next = parentUnit.generation + 1;
        if (childUnit.generation < next) {
          childUnit.generation = next;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  const positionByPerson = new Map<string, number>();
  const maxGeneration = Math.max(0, ...units.map((unit) => unit.generation));

  function recordPositions(unit: FamilyUnit) {
    for (let index = 0; index < unit.members.length; index += 1) {
      positionByPerson.set(unit.members[index], unit.left + index * SIZE);
    }
  }

  type UnitBlock = {
    key: string;
    units: FamilyUnit[];
    target: number;
    width: number;
    left: number;
  };

  function packBlocks(blocks: UnitBlock[]) {
    blocks.sort((a, b) => a.target - b.target || a.key.localeCompare(b.key));
    let cursor = Number.NEGATIVE_INFINITY;
    for (const block of blocks) {
      const ideal = block.target - block.width / 2;
      block.left = Number.isFinite(cursor)
        ? Math.max(ideal, cursor + UNIT_GAP)
        : ideal;
      cursor = block.left + block.width;
    }
    if (blocks.length > 0) {
      const correction =
        blocks.reduce(
          (sum, block) =>
            sum + (block.target - (block.left + block.width / 2)),
          0,
        ) / blocks.length;
      for (const block of blocks) block.left += correction;
    }
    for (const block of blocks) {
      let left = block.left;
      for (const unit of block.units) {
        unit.left = left;
        recordPositions(unit);
        left += unit.width + UNIT_GAP;
      }
    }
  }

  function forwardGeneration(generation: number) {
    const level = units.filter((unit) => unit.generation === generation);
    if (generation === 0) {
      let left = 0;
      for (const unit of level.sort((a, b) => a.id.localeCompare(b.id))) {
        unit.left = left;
        recordPositions(unit);
        left += unit.width + TREE_GAP;
      }
      return;
    }

    const byParents = new Map<string, FamilyUnit[]>();
    for (const unit of level) {
      const parentIds = [
        ...new Set(
          unit.members.flatMap((id) =>
            neighborIds(adjacency, id, "parent").filter((parentId) =>
              positionByPerson.has(parentId),
            ),
          ),
        ),
      ].sort();
      const key = parentIds.length > 0 ? parentIds.join("|") : `root:${unit.id}`;
      const group = byParents.get(key) ?? [];
      group.push(unit);
      byParents.set(key, group);
    }

    const blocks: UnitBlock[] = [...byParents].map(([key, blockUnits]) => {
      const parentIds = key.startsWith("root:") ? [] : key.split("|");
      const target =
        parentIds.length > 0
          ? parentIds.reduce(
              (sum, id) => sum + (positionByPerson.get(id) ?? 0),
              0,
            ) / parentIds.length
          : 0;
      const ordered = [...blockUnits].sort((a, b) => a.id.localeCompare(b.id));
      return {
        key,
        units: ordered,
        target,
        width:
          ordered.reduce((sum, unit) => sum + unit.width, 0) +
          Math.max(0, ordered.length - 1) * UNIT_GAP,
        left: 0,
      };
    });
    packBlocks(blocks);
  }

  function backwardGeneration(generation: number) {
    const level = units.filter((unit) => unit.generation === generation);
    const blocks: UnitBlock[] = level.map((unit) => {
      const childPositions = unit.members.flatMap((id) =>
        neighborIds(adjacency, id, "child").flatMap((childId) => {
          const position = positionByPerson.get(childId);
          return position === undefined ? [] : [position];
        }),
      );
      const currentCenter = unit.left + unit.width / 2;
      return {
        key: unit.id,
        units: [unit],
        target:
          childPositions.length > 0
            ? childPositions.reduce((sum, value) => sum + value, 0) /
              childPositions.length
            : currentCenter,
        width: unit.width,
        left: 0,
      };
    });
    packBlocks(blocks);
  }

  for (let generation = 0; generation <= maxGeneration; generation += 1) {
    forwardGeneration(generation);
  }
  for (let generation = maxGeneration - 1; generation >= 0; generation -= 1) {
    backwardGeneration(generation);
  }

  const nodes = ids.map((id) => {
    const unit = unitByPerson.get(id)!;
    return {
      id,
      left: positionByPerson.get(id) ?? 0,
      top: unit.generation * SIZE,
      placeholder: false,
    };
  });
  const minLeft = Math.min(0, ...nodes.map((node) => node.left));
  if (minLeft < 0) {
    for (const node of nodes) node.left -= minLeft;
  }

  return {
    nodes,
    canvas: {
      width: Math.max(SIZE, ...nodes.map((node) => node.left + SIZE)),
      height: Math.max(SIZE, ...nodes.map((node) => node.top + SIZE)),
    },
  };
}

export function layoutForest(
  nodes: Node[],
  adjacency: Adjacency,
  focusId: string,
): ForestLayout {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const components = connectedComponents(adjacency);
  const largest = [...components].sort((a, b) => b.length - a.length)[0];
  const largestRootId = largest
    ? pickGenealogicalRoot(largest, nodesById, adjacency)
    : null;
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
    const canvas = place(layoutComponent(group, adjacency), cursorX, 0);
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
      const col = index % cols;
      const row = Math.floor(index / cols);
      place(
        layoutComponent(group, adjacency),
        col * cellW,
        originY + row * cellH,
      );
    });
  }

  const width = Math.max(SIZE, ...placed.map((node) => node.left + SIZE));
  const height = Math.max(SIZE, ...placed.map((node) => node.top + SIZE));
  return { nodes: placed, canvas: { width, height }, largestRootId };
}
