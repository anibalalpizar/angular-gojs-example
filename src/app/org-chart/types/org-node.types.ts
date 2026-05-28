export interface OrgNode {
  key: number;
  name: string;
  title: string;
  dept: string;
  parent?: number;
  level?: number;
  hasChildren?: boolean;
  childrenLoaded?: boolean;
  isTreeExpanded?: boolean;
  isLoadingChildren?: boolean;
}

export interface CreateOrgNodeRequest {
  name: string;
  title: string;
  dept?: string;
  parent?: number;
}

export type UpdateOrgNodeRequest = Partial<Pick<OrgNode, 'name' | 'title' | 'dept' | 'parent'>>;

export interface DeleteOrgNodeResult {
  deletedKeys: number[];
  parentKey?: number;
  parentHasChildren: boolean;
}

export interface OrgChartNodePage<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface SearchResultNode {
  key: number;
  name: string;
  title: string;
  dept: string;
  level?: number;
  isMatch: boolean;
  children: SearchResultNode[];
}

export interface TreeNode extends OrgNode {
  children: TreeNode[];
  expanded: boolean;
}
