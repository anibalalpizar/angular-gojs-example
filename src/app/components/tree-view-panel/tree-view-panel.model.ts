import { OrgNode } from '../../models/org-node.model';

export interface TreeNode extends OrgNode {
  children: TreeNode[];
  expanded: boolean;
}

export type { OrgNode };
