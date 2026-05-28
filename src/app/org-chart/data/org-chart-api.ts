import { CreateOrgNodeRequest, OrgChartNodePage, OrgNode, UpdateOrgNodeRequest } from '../types/org-node.types';

const SOURCE_JSON_FILE = 'org-chart-data/org-chart-data.json';
const INITIAL_LOAD_DEPTH = 3;
const DEFAULT_PAGE_SIZE = 50;

let sourceNodes: OrgNode[] = [];
let sourceNodesRequest: Promise<OrgNode[]> | undefined;
let childrenByParent = new Map<number | undefined, OrgNode[]>();
let nodesByKey = new Map<number, OrgNode>();
let levelsByKey = new Map<number, number>();

// replace these functions with HTTP calls when the real API exists.
export async function getInitialOrgChartNodes(): Promise<OrgNode[]> {
  await ensureSourceNodes();

  return sourceNodes
    .filter((node) => getNodeLevel(node) <= INITIAL_LOAD_DEPTH)
    .map((node) => toLazyNode(node, getNodeLevel(node) < INITIAL_LOAD_DEPTH));
}

export async function getOrgChartChildren(
  parentKey: number,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<OrgChartNodePage<OrgNode>> {
  await ensureSourceNodes();

  const children = childrenByParent.get(parentKey) ?? [];
  const safePage = Math.max(page, 1);
  const safePageSize = Math.max(pageSize, 1);
  const start = (safePage - 1) * safePageSize;
  const items = children.slice(start, start + safePageSize).map((node) => toLazyNode(node, false));

  return {
    items,
    page: safePage,
    pageSize: safePageSize,
    total: children.length,
    hasMore: start + safePageSize < children.length
  };
}

export async function getOrgChartChildrenItems(parentKey: number): Promise<OrgNode[]> {
  const page = await getOrgChartChildren(parentKey);
  return page.items;
}

export async function createOrgChartNode(request: CreateOrgNodeRequest): Promise<OrgNode> {
  await ensureSourceNodes();

  const parent = request.parent == null ? undefined : nodesByKey.get(request.parent);
  const newNode: OrgNode = {
    key: getNextSourceKey(),
    name: request.name,
    title: request.title,
    dept: request.dept ?? parent?.dept ?? 'Direccion',
    ...(request.parent == null ? {} : { parent: request.parent })
  };

  sourceNodes = [...sourceNodes, newNode].sort((left, right) => left.key - right.key);
  rebuildIndexes();

  return toLazyNode(newNode, false);
}

export async function updateOrgChartNode(
  key: number,
  changes: UpdateOrgNodeRequest
): Promise<OrgNode | undefined> {
  await ensureSourceNodes();

  const node = nodesByKey.get(key);
  if (!node) {
    return undefined;
  }

  Object.assign(node, changes);
  rebuildIndexes();

  return toLazyNode(node, false);
}

async function ensureSourceNodes(): Promise<OrgNode[]> {
  if (!sourceNodesRequest) {
    sourceNodesRequest = fetchSourceNodes().then((nodes) => {
      sourceNodes = nodes.sort((left, right) => left.key - right.key);
      rebuildIndexes();

      return sourceNodes;
    });
  }

  return sourceNodesRequest;
}

async function fetchSourceNodes(): Promise<OrgNode[]> {
  const urls = [
    new URL(SOURCE_JSON_FILE, document.baseURI).toString(),
    `/${SOURCE_JSON_FILE}`,
    SOURCE_JSON_FILE
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return ((await response.json()) as OrgNode[]).map(stripRuntimeState);
      }
    } catch (error) {
      console.warn(`No se pudo cargar ${url}`, error);
    }
  }

  throw new Error(`No se pudo cargar ${SOURCE_JSON_FILE}`);
}

function rebuildIndexes(): void {
  levelsByKey = new Map();
  nodesByKey = new Map(sourceNodes.map((node) => [node.key, node]));
  childrenByParent = sourceNodes.reduce((map, node) => {
    const siblings = map.get(node.parent) ?? [];
    siblings.push(node);
    map.set(node.parent, siblings);
    return map;
  }, new Map<number | undefined, OrgNode[]>());
}

function toLazyNode(node: OrgNode, childrenLoaded: boolean): OrgNode {
  const level = getNodeLevel(node);
  const hasChildren = childrenByParent.has(node.key);

  return {
    ...node,
    level,
    hasChildren,
    childrenLoaded: hasChildren ? childrenLoaded : true,
    isTreeExpanded: hasChildren ? childrenLoaded && level < INITIAL_LOAD_DEPTH : true
  };
}

function getNodeLevel(node: OrgNode): number {
  const existingLevel = levelsByKey.get(node.key);
  if (existingLevel) {
    return existingLevel;
  }

  const parent = node.parent == null ? undefined : nodesByKey.get(node.parent);
  const level = parent ? getNodeLevel(parent) + 1 : 1;
  levelsByKey.set(node.key, level);

  return level;
}

function getNextSourceKey(): number {
  return Math.max(...sourceNodes.map((node) => node.key), 0) + 1;
}

function stripRuntimeState(node: OrgNode): OrgNode {
  return {
    key: node.key,
    name: node.name,
    title: node.title,
    dept: node.dept,
    ...(node.parent == null ? {} : { parent: node.parent })
  };
}
