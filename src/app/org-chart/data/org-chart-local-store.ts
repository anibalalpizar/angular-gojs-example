import {
  CreateOrgNodeRequest,
  DeleteOrgNodeResult,
  OrgChartNodePage,
  OrgNode,
  UpdateOrgNodeRequest
} from '../types/org-node.types';

const SOURCE_JSON_FILE = 'org-chart-data/org-chart-data.json';
const INITIAL_LOAD_DEPTH = 3;
const DEFAULT_PAGE_SIZE = 50;

let sourceNodes: OrgNode[] = [];
let sourceNodesRequest: Promise<OrgNode[]> | undefined;
let childrenByParent = new Map<number | undefined, OrgNode[]>();
let nodesByKey = new Map<number, OrgNode>();
let levelsByKey = new Map<number, number>();

// obtiene los nodos iniciales desde el json local
export async function getLocalInitialOrgChartNodes(): Promise<OrgNode[]> {
  await ensureSourceNodes();

  return sourceNodes
    .filter((node) => getNodeLevel(node) <= INITIAL_LOAD_DEPTH)
    .map((node) => toLazyNode(node, getNodeLevel(node) < INITIAL_LOAD_DEPTH));
}

// obtiene hijos por padre simulando una respuesta paginada
export async function getLocalOrgChartChildren(
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

// crea un nodo nuevo solo en memoria para la demo
export async function createLocalOrgChartNode(request: CreateOrgNodeRequest): Promise<OrgNode> {
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

// actualiza un nodo solo en memoria para la demo
export async function updateLocalOrgChartNode(
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

// elimina un nodo y todos sus descendientes solo en memoria para la demo
export async function deleteLocalOrgChartNode(key: number): Promise<DeleteOrgNodeResult | undefined> {
  await ensureSourceNodes();

  const node = nodesByKey.get(key);
  if (!node) {
    return undefined;
  }

  const parentKey = node.parent;
  const deletedKeys = collectSubtreeKeys(key);
  const deletedKeySet = new Set(deletedKeys);

  sourceNodes = sourceNodes.filter((sourceNode) => !deletedKeySet.has(sourceNode.key));
  rebuildIndexes();

  return {
    deletedKeys,
    ...(parentKey == null ? {} : { parentKey }),
    parentHasChildren: parentKey == null ? false : (childrenByParent.get(parentKey)?.length ?? 0) > 0
  };
}

// carga el json una sola vez durante la sesion del navegador
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

// intenta varias rutas para que funcione en serve, build y base href
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

// rehace los mapas despues de crear, mover o editar nodos
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

// agrega estado de ui sin ensuciar el dato original del json
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

// calcula el nivel caminando hacia el padre
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

// genera una llave temporal para la demo local
function getNextSourceKey(): number {
  return Math.max(...sourceNodes.map((node) => node.key), 0) + 1;
}

// junta la llave del nodo seleccionado y la de todos sus hijos reales
function collectSubtreeKeys(rootKey: number): number[] {
  const keys: number[] = [];
  const pendingKeys = [rootKey];

  while (pendingKeys.length > 0) {
    const currentKey = pendingKeys.pop()!;
    keys.push(currentKey);

    const children = childrenByParent.get(currentKey) ?? [];
    for (const child of children) {
      pendingKeys.push(child.key);
    }
  }

  return keys;
}

// remueve estado visual por si el json viene de una sesion anterior
function stripRuntimeState(node: OrgNode): OrgNode {
  return {
    key: node.key,
    name: node.name,
    title: node.title,
    dept: node.dept,
    ...(node.parent == null ? {} : { parent: node.parent })
  };
}
