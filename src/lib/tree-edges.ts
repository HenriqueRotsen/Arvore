import type { Adjacency } from "@/lib/graph";

export type Point = { x: number; y: number };

export type TreeConnector = {
  key: string;
  d: string;
  kind: "parent-child" | "spouse";
  onPath: boolean;
  label: { x: number; y: number; text: string };
};

function pairKey(a: string, b: string) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function neighbors(adjacency: Adjacency, id: string, kind: "parent" | "child" | "spouse") {
  return (adjacency[id] ?? [])
    .filter((item) => item.kind === kind)
    .map((item) => item.id);
}

function uniquePairs(ids: string[]) {
  return [...new Set(ids)];
}

function familyPath(
  attach: Point,
  children: Point[],
  nodeHeight: number,
) {
  const parentBottom = attach.y + nodeHeight / 2;
  const childTops = children.map((child) => child.y - nodeHeight / 2);
  const barY = (parentBottom + Math.min(...childTops)) / 2;
  const xs = [attach.x, ...children.map((child) => child.x)];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  const parts = [`M ${attach.x} ${parentBottom} L ${attach.x} ${barY}`];
  if (minX !== maxX) {
    parts.push(`M ${minX} ${barY} L ${maxX} ${barY}`);
  }
  for (const child of children) {
    parts.push(`M ${child.x} ${barY} L ${child.x} ${child.y - nodeHeight / 2}`);
  }

  return {
    d: parts.join(" "),
    label: { x: attach.x, y: barY - 8 },
  };
}

function spousePath(a: Point, b: Point, nodeWidth: number, nodeHeight: number) {
  if (Math.abs(a.y - b.y) < nodeHeight * 0.4) {
    const left = a.x <= b.x ? a : b;
    const right = a.x <= b.x ? b : a;
    const y = (a.y + b.y) / 2;
    const x1 = left.x + nodeWidth / 2;
    const x2 = right.x - nodeWidth / 2;
    if (x2 - x1 > 8) {
      return {
        d: `M ${x1} ${y} L ${x2} ${y}`,
        label: { x: (x1 + x2) / 2, y: y - 10 },
      };
    }
  }
  const midY = (a.y + b.y) / 2;
  return {
    d: `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`,
    label: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 10 },
  };
}

/**
 * One descent per set of parents (a married couple shares a single stem)
 * and spouse links that do not join the sibling bar of the blood line.
 */
export function treeConnectors(
  adjacency: Adjacency,
  positions: Map<string, Point>,
  size: { nodeWidth: number; nodeHeight: number },
  pathPairs: Set<string>,
): TreeConnector[] {
  const { nodeWidth, nodeHeight } = size;
  const connectors: TreeConnector[] = [];
  const placed = (id: string) => positions.get(id);

  const childrenByParents = new Map<string, { parents: string[]; children: string[] }>();

  for (const id of positions.keys()) {
    const parents = uniquePairs(neighbors(adjacency, id, "parent")).filter((parentId) =>
      positions.has(parentId),
    );
    if (parents.length === 0) continue;
    parents.sort();
    const key = parents.join("|");
    const group = childrenByParents.get(key);
    if (group) {
      group.children.push(id);
    } else {
      childrenByParents.set(key, { parents, children: [id] });
    }
  }

  for (const group of childrenByParents.values()) {
    const childPoints = group.children
      .map((id) => placed(id))
      .filter((point): point is Point => Boolean(point));
    if (childPoints.length === 0) continue;

    const parentPoints = group.parents
      .map((id) => placed(id))
      .filter((point): point is Point => Boolean(point));
    if (parentPoints.length === 0) continue;

    const attach =
      parentPoints.length === 2
        ? {
            x: (parentPoints[0].x + parentPoints[1].x) / 2,
            y: Math.max(parentPoints[0].y, parentPoints[1].y),
          }
        : parentPoints[0];

    const drawn = familyPath(attach, childPoints, nodeHeight);
    const onPath = group.children.some((childId) =>
      group.parents.some((parentId) => pathPairs.has(pairKey(parentId, childId))),
    );

    connectors.push({
      key: `pc:${group.parents.join("-")}:${group.children.join("-")}`,
      d: drawn.d,
      kind: "parent-child",
      onPath,
      label: { ...drawn.label, text: "pai/filho" },
    });
  }

  const seenSpouse = new Set<string>();
  for (const id of positions.keys()) {
    for (const spouseId of neighbors(adjacency, id, "spouse")) {
      const key = pairKey(id, spouseId);
      if (seenSpouse.has(key) || !positions.has(spouseId)) continue;
      seenSpouse.add(key);
      const a = placed(id);
      const b = placed(spouseId);
      if (!a || !b) continue;
      const drawn = spousePath(a, b, nodeWidth, nodeHeight);
      connectors.push({
        key: `spouse:${key}`,
        d: drawn.d,
        kind: "spouse",
        onPath: pathPairs.has(key),
        label: { ...drawn.label, text: "cônjuge" },
      });
    }
  }

  return connectors;
}
