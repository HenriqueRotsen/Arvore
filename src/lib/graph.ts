import type { FamilyGraph } from "@/lib/relationships";

export type EdgeKind = "parent" | "child" | "spouse";

export type GraphNeighbor = {
  id: string;
  weight: 1;
  kind: EdgeKind;
};

export type Adjacency = Record<string, GraphNeighbor[]>;

export type PathStep = {
  fromId: string;
  toId: string;
  kind: EdgeKind;
};

export type KinshipRelation = "self" | "blood" | "affinity";

export type KinshipResult = {
  relation: KinshipRelation;
  distance: number;
  line?: "straight" | "collateral";
  up: number;
  down: number;
  ancestorIds: string[];
  nodeIds: string[];
  steps: PathStep[];
};

function addEdge(
  adjacency: Adjacency,
  from: string,
  to: string,
  kind: EdgeKind,
) {
  const list = adjacency[from] ?? [];
  if (!list.some((item) => item.id === to && item.kind === kind)) {
    list.push({ id: to, weight: 1, kind });
    adjacency[from] = list;
  }
}

export function toUndirectedEdges(adjacency: Adjacency) {
  const edges: Array<{ from: string; to: string; kind: "parent-child" | "spouse" }> =
    [];
  const seenSpouse = new Set<string>();

  for (const [from, neighbors] of Object.entries(adjacency)) {
    for (const neighbor of neighbors) {
      if (neighbor.kind === "child") {
        edges.push({ from, to: neighbor.id, kind: "parent-child" });
      }
      if (neighbor.kind === "spouse") {
        const key = [from, neighbor.id].sort().join(":");
        if (seenSpouse.has(key)) continue;
        seenSpouse.add(key);
        edges.push({ from, to: neighbor.id, kind: "spouse" });
      }
    }
  }

  return edges;
}

export function toAdjacency(graph: FamilyGraph): Adjacency {
  const adjacency: Adjacency = {};

  for (const id of graph.people.keys()) {
    adjacency[id] = adjacency[id] ?? [];
  }

  for (const [childId, parentIds] of graph.parentsOf) {
    for (const parentId of parentIds) {
      addEdge(adjacency, parentId, childId, "child");
      addEdge(adjacency, childId, parentId, "parent");
    }
  }

  for (const [personId, spouses] of graph.spousesOf) {
    for (const spouse of spouses) {
      addEdge(adjacency, personId, spouse.id, "spouse");
    }
  }

  return adjacency;
}

function stepsFromNodes(adjacency: Adjacency, nodeIds: string[]): PathStep[] {
  const steps: PathStep[] = [];
  for (let index = 0; index < nodeIds.length - 1; index += 1) {
    const fromId = nodeIds[index];
    const toId = nodeIds[index + 1];
    const kind =
      adjacency[fromId]?.find((neighbor) => neighbor.id === toId)?.kind ?? "parent";
    steps.push({ fromId, toId, kind });
  }
  return steps;
}

function climbAncestors(adjacency: Adjacency, start: string) {
  const depth = new Map<string, number>([[start, 0]]);
  const viaChild = new Map<string, string>();
  const queue = [start];

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const currentDepth = depth.get(current) ?? 0;
    for (const neighbor of adjacency[current] ?? []) {
      if (neighbor.kind !== "parent" || depth.has(neighbor.id)) continue;
      depth.set(neighbor.id, currentDepth + 1);
      viaChild.set(neighbor.id, current);
      queue.push(neighbor.id);
    }
  }

  return { depth, viaChild };
}

function pathUp(
  viaChild: Map<string, string>,
  start: string,
  ancestor: string,
) {
  const nodes = [ancestor];
  let cursor = ancestor;
  while (cursor !== start) {
    const child = viaChild.get(cursor);
    if (!child) return null;
    nodes.push(child);
    cursor = child;
  }
  nodes.reverse();
  return nodes;
}

function bloodKinship(
  adjacency: Adjacency,
  source: string,
  target: string,
): KinshipResult | null {
  const fromA = climbAncestors(adjacency, source);
  const fromB = climbAncestors(adjacency, target);

  let bestDegree = Number.POSITIVE_INFINITY;
  const ancestorIds: string[] = [];

  for (const [id, depthA] of fromA.depth) {
    const depthB = fromB.depth.get(id);
    if (depthB === undefined) continue;
    const degree = depthA + depthB;
    if (degree < bestDegree) {
      bestDegree = degree;
      ancestorIds.length = 0;
      ancestorIds.push(id);
    } else if (degree === bestDegree) {
      ancestorIds.push(id);
    }
  }

  if (!Number.isFinite(bestDegree) || ancestorIds.length === 0) return null;

  const ancestorId = ancestorIds[0];
  const pathA = pathUp(fromA.viaChild, source, ancestorId);
  const pathB = pathUp(fromB.viaChild, target, ancestorId);
  if (!pathA || !pathB) return null;

  const nodeIds = [...pathA, ...pathB.slice(0, -1).reverse()];
  const depthA = fromA.depth.get(ancestorId) ?? 0;
  const depthB = fromB.depth.get(ancestorId) ?? 0;

  return {
    relation: "blood",
    distance: bestDegree,
    line: depthA === 0 || depthB === 0 ? "straight" : "collateral",
    up: depthA,
    down: depthB,
    ancestorIds,
    nodeIds,
    steps: stepsFromNodes(adjacency, nodeIds),
  };
}

function affinityPath(
  adjacency: Adjacency,
  source: string,
  target: string,
): KinshipResult | null {
  const dist = new Map<string, number>([[source, 0]]);
  const prev = new Map<string, string>();
  const queue = [source];

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current === target) break;
    const currentDist = dist.get(current) ?? 0;
    for (const neighbor of adjacency[current] ?? []) {
      if (dist.has(neighbor.id)) continue;
      dist.set(neighbor.id, currentDist + 1);
      prev.set(neighbor.id, current);
      queue.push(neighbor.id);
    }
  }

  if (!dist.has(target)) return null;

  const nodeIds = [target];
  let cursor = target;
  while (cursor !== source) {
    const incoming = prev.get(cursor);
    if (!incoming) return null;
    nodeIds.unshift(incoming);
    cursor = incoming;
  }

  return {
    relation: "affinity",
    distance: dist.get(target) ?? nodeIds.length - 1,
    up: 0,
    down: 0,
    ancestorIds: [],
    nodeIds,
    steps: stepsFromNodes(adjacency, nodeIds),
  };
}

export function findKinship(
  adjacency: Adjacency,
  source: string,
  target: string,
): KinshipResult | null {
  if (!adjacency[source] || !adjacency[target]) return null;
  if (source === target) {
    return {
      relation: "self",
      distance: 0,
      up: 0,
      down: 0,
      ancestorIds: [source],
      nodeIds: [source],
      steps: [],
    };
  }

  return bloodKinship(adjacency, source, target) ?? affinityPath(adjacency, source, target);
}

export function edgeKindLabel(kind: EdgeKind) {
  switch (kind) {
    case "parent":
      return "filho(a) de";
    case "child":
      return "pai/mãe de";
    case "spouse":
      return "cônjuge de";
  }
}

export function kinshipLabel(distance: number) {
  if (distance === 0) return "a mesma pessoa";
  if (distance === 1) return "1º grau";
  return `${distance}º grau`;
}

export function kinshipLineLabel(line: "straight" | "collateral") {
  return line === "straight" ? "linha reta" : "linha colateral";
}

function inflect(gender: string | undefined, male: string, female: string, other: string) {
  if (gender === "female") return female;
  if (gender === "male") return male;
  return other;
}

const ASCENDANTS = [
  ["pai", "mãe", "pai/mãe"],
  ["avô", "avó", "avô/avó"],
  ["bisavô", "bisavó", "bisavô/bisavó"],
  ["trisavô", "trisavó", "trisavô/trisavó"],
  ["tetravô", "tetravó", "tetravô/tetravó"],
] as const;

const DESCENDANTS = [
  ["filho", "filha", "filho(a)"],
  ["neto", "neta", "neto(a)"],
  ["bisneto", "bisneta", "bisneto(a)"],
  ["trineto", "trineta", "trineto(a)"],
  ["tetraneto", "tetraneta", "tetraneto(a)"],
] as const;

function bloodRoleLabel(
  up: number,
  down: number,
  gender: string | undefined,
  sharedParents: number,
) {
  if (up === 0 && down === 0) return "a mesma pessoa";

  if (up === 0) {
    const term = DESCENDANTS[down - 1];
    if (term) return inflect(gender, term[0], term[1], term[2]);
    return `descendente em ${down}º grau`;
  }

  if (down === 0) {
    const term = ASCENDANTS[up - 1];
    if (term) return inflect(gender, term[0], term[1], term[2]);
    return `ascendente em ${up}º grau`;
  }

  if (up === 1 && down === 1) {
    if (sharedParents < 2) {
      return inflect(gender, "meio-irmão", "meia-irmã", "meio-irmão(ã)");
    }
    return inflect(gender, "irmão", "irmã", "irmão(ã)");
  }

  if (down === 1 && up >= 2) {
    if (up === 2) return inflect(gender, "tio", "tia", "tio(a)");
    if (up === 3) return inflect(gender, "tio-avô", "tia-avó", "tio-avô(ó)");
    return `${inflect(gender, "tio", "tia", "tio(a)")} em ${up}º grau`;
  }

  if (up === 1 && down >= 2) {
    if (down === 2) return inflect(gender, "sobrinho", "sobrinha", "sobrinho(a)");
    if (down === 3) return inflect(gender, "sobrinho-neto", "sobrinha-neta", "sobrinho-neto(a)");
    return `${inflect(gender, "sobrinho", "sobrinha", "sobrinho(a)")} em ${down}º grau`;
  }

  if (up === down) {
    const cousinDegree = up - 1;
    const cousin = inflect(gender, "primo", "prima", "primo(a)");
    return cousinDegree === 1 ? cousin : `${cousin} de ${cousinDegree}º grau`;
  }

  const closer = Math.min(up, down);
  const removed = Math.abs(up - down);
  const cousinDegree = closer - 1;
  const cousin = inflect(gender, "primo", "prima", "primo(a)");
  if (cousinDegree === 1 && removed === 1) {
    return down > up
      ? inflect(gender, "primo-sobrinho", "prima-sobrinha", "primo-sobrinho(a)")
      : inflect(gender, "primo-tio", "prima-tia", "primo-tio(a)");
  }
  const base = cousinDegree <= 1 ? cousin : `${cousin} de ${cousinDegree}º grau`;
  return removed === 1 ? `${base} (uma vez removido)` : `${base} (${removed} vezes removido)`;
}

function affinityRoleLabel(steps: PathStep[], gender: string | undefined) {
  const kinds = steps.map((step) => step.kind).join(",");
  switch (kinds) {
    case "spouse":
      return inflect(gender, "marido", "esposa", "cônjuge");
    case "spouse,parent":
      return inflect(gender, "sogro", "sogra", "sogro(a)");
    case "parent,spouse":
      return inflect(gender, "padrasto", "madrasta", "padrasto/madrasta");
    case "spouse,child":
      return inflect(gender, "enteado", "enteada", "enteado(a)");
    case "child,spouse":
      return inflect(gender, "genro", "nora", "genro/nora");
    case "spouse,parent,child":
    case "parent,child,spouse":
      return inflect(gender, "cunhado", "cunhada", "cunhado(a)");
    default:
      return "parente por afinidade";
  }
}

export function kinshipRoleLabel(
  result: KinshipResult,
  targetGender?: string,
) {
  if (result.relation === "self") return "a mesma pessoa";
  if (result.relation === "affinity") {
    return affinityRoleLabel(result.steps, targetGender);
  }
  return bloodRoleLabel(
    result.up,
    result.down,
    targetGender,
    result.ancestorIds.length,
  );
}
