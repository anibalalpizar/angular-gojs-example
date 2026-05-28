import {
  CreateOrgNodeRequest,
  DeleteOrgNodeResult,
  OrgChartNodePage,
  OrgNode,
  UpdateOrgNodeRequest
} from '../types/org-node.types';
import {
  createLocalOrgChartNode,
  deleteLocalOrgChartNode,
  getLocalInitialOrgChartNodes,
  getLocalOrgChartChildren,
  updateLocalOrgChartNode
} from './org-chart-local-store';

// esta fachada mantiene limpia la forma que tendra el api real
export function getInitialOrgChartNodes(): Promise<OrgNode[]> {
  return getLocalInitialOrgChartNodes();
}

// obtiene hijos por padre como lo haria un endpoint paginado
export function getOrgChartChildren(
  parentKey: number,
  page?: number,
  pageSize?: number
): Promise<OrgChartNodePage<OrgNode>> {
  return getLocalOrgChartChildren(parentKey, page, pageSize);
}

// atajo para gojs cuando solo necesita los nodos
export async function getOrgChartChildrenItems(parentKey: number): Promise<OrgNode[]> {
  const page = await getOrgChartChildren(parentKey);
  return page.items;
}

// crea un nodo usando la fuente actual de datos
export function createOrgChartNode(request: CreateOrgNodeRequest): Promise<OrgNode> {
  return createLocalOrgChartNode(request);
}

// actualiza un nodo usando la fuente actual de datos
export function updateOrgChartNode(
  key: number,
  changes: UpdateOrgNodeRequest
): Promise<OrgNode | undefined> {
  return updateLocalOrgChartNode(key, changes);
}

// elimina un nodo usando la fuente actual de datos
export function deleteOrgChartNode(key: number): Promise<DeleteOrgNodeResult | undefined> {
  return deleteLocalOrgChartNode(key);
}
