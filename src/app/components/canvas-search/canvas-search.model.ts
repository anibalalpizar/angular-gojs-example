import { OrgNode } from '../../models/org-node.model';

export interface SearchResultNode {
  key: number;
  name: string;
  title: string;
  dept: string;
  isMatch: boolean;
  children: SearchResultNode[];
}

export type { OrgNode };
