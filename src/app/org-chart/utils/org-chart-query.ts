import { MAX_SEARCH_RESULTS } from '../constants/org-chart.constants';
import { OrgNode, SearchResultNode, TreeNode } from '../types/org-node.types';

export interface OrgChartSearchResult {
  matches: OrgNode[];
  resultTree: SearchResultNode[];
  total: number;
}

// busca por nombre o cargo dentro de los nodos cargados
export function searchOrgChart(
  nodes: OrgNode[],
  term: string,
  maxResults = MAX_SEARCH_RESULTS
): OrgChartSearchResult {
  const normalizedTerm = term.toLowerCase().trim();

  if (!normalizedTerm) {
    return { matches: [], resultTree: [], total: 0 };
  }

  const matches = nodes.filter(
    (node) =>
      node.name.toLowerCase().includes(normalizedTerm) ||
      node.title.toLowerCase().includes(normalizedTerm)
  );
  const limitedMatches = matches.slice(0, maxResults);

  return {
    matches: limitedMatches,
    resultTree: buildSearchResultTree(nodes, limitedMatches),
    total: matches.length
  };
}

// convierte la lista plana del modelo en un arbol para el panel lateral
export function buildTree(nodes: OrgNode[], previousTree: TreeNode[] = []): TreeNode[] {
  const previousExpanded = new Map<number, boolean>();
  collectExpandedState(previousTree, previousExpanded);

  const nodeMap = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];

  for (const node of nodes) {
    nodeMap.set(node.key, {
      ...node,
      children: [],
      expanded: previousExpanded.get(node.key) ?? node.isTreeExpanded ?? node.parent == null
    });
  }

  for (const node of nodes) {
    const treeNode = nodeMap.get(node.key);

    if (!treeNode) {
      continue;
    }

    if (node.parent != null) {
      nodeMap.get(node.parent)?.children.push(treeNode);
    } else {
      roots.push(treeNode);
    }
  }

  return roots;
}

// filtra el arbol manteniendo los padres de cada resultado
export function filterTree(nodes: TreeNode[], term: string): TreeNode[] {
  const normalizedTerm = term.toLowerCase().trim();

  if (!normalizedTerm) {
    return [...nodes];
  }

  const result: TreeNode[] = [];
  for (const node of nodes) {
    const matches =
      node.name.toLowerCase().includes(normalizedTerm) ||
      node.title.toLowerCase().includes(normalizedTerm);
    const filteredChildren = filterTree(node.children, normalizedTerm);

    if (matches || filteredChildren.length > 0) {
      result.push({ ...node, children: filteredChildren, expanded: true });
    }
  }

  return result;
}

// arma un arbol compacto con coincidencias y sus ancestros
function buildSearchResultTree(nodes: OrgNode[], matches: OrgNode[]): SearchResultNode[] {
  if (matches.length === 0) {
    return [];
  }

  const nodeMap = new Map<number, OrgNode>();
  for (const node of nodes) {
    nodeMap.set(node.key, node);
  }

  const matchKeys = new Set<number>(matches.map((node) => node.key));
  const includedKeys = new Set<number>();

  // incluye cada resultado y el camino completo hasta la raiz
  for (const match of matches) {
    let current: OrgNode | undefined = match;
    while (current) {
      includedKeys.add(current.key);
      current = current.parent != null ? nodeMap.get(current.parent) : undefined;
    }
  }

  const resultMap = new Map<number, SearchResultNode>();
  for (const node of nodes) {
    if (!includedKeys.has(node.key)) {
      continue;
    }

    resultMap.set(node.key, {
      key: node.key,
      name: node.name,
      title: node.title,
      dept: node.dept,
      level: node.level,
      isMatch: matchKeys.has(node.key),
      children: []
    });
  }

  const roots: SearchResultNode[] = [];
  for (const node of nodes) {
    if (!includedKeys.has(node.key)) {
      continue;
    }

    const resultNode = resultMap.get(node.key);
    if (!resultNode) {
      continue;
    }

    if (node.parent != null) {
      resultMap.get(node.parent)?.children.push(resultNode);
    } else {
      roots.push(resultNode);
    }
  }

  return roots;
}

// recuerda que nodos estaban abiertos antes de reconstruir el arbol
function collectExpandedState(nodes: TreeNode[], state: Map<number, boolean>): void {
  for (const node of nodes) {
    state.set(node.key, node.expanded);
    collectExpandedState(node.children, state);
  }
}
