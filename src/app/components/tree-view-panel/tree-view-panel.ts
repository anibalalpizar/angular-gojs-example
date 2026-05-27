import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as go from 'gojs';
import { OrgNode, TreeNode } from './tree-view-panel.model';
import { DEPT_COLORS } from '../../models/org-node.model';

@Component({
  selector: 'app-tree-view-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tree-view-panel.html',
  styleUrl: './tree-view-panel.css'
})
export class TreeViewPanelComponent implements OnChanges {
  @Input() diagram: go.Diagram | undefined;
  @Input() isOpen = false;
  @Output() isOpenChange = new EventEmitter<boolean>();

  close(): void {
    this.isOpenChange.emit(false);
  }

  searchTerm = '';
  treeData: TreeNode[] = [];
  filteredData: TreeNode[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    // Rebuild whenever diagram arrives or panel opens (picks up new nodes)
    if (changes['diagram'] || (changes['isOpen'] && this.isOpen)) {
      this.buildTree();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.searchTerm = '';
      this.applyFilter();
    }
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  toggleNode(node: TreeNode): void {
    node.expanded = !node.expanded;
  }

  navigateTo(key: number): void {
    if (!this.diagram) return;
    const node = this.diagram.findNodeForKey(key);
    if (node) {
      this.diagram.select(node);
      this.diagram.commandHandler.scrollToPart(node);
      this.diagram.centerRect(node.actualBounds);
    }
  }

  getDeptColor(dept: string): string {
    return DEPT_COLORS[dept] ?? '#5b6b7c';
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0])
      .join('')
      .toUpperCase();
  }

  private buildTree(): void {
    if (!this.diagram) {
      this.treeData = [];
      this.filteredData = [];
      return;
    }

    const nodes = (this.diagram.model as go.TreeModel).nodeDataArray as OrgNode[];

    // Preserve expand/collapse state across rebuilds
    const prevExpanded = new Map<number, boolean>();
    this.collectExpandedState(this.treeData, prevExpanded);

    const map = new Map<number, TreeNode>();
    const roots: TreeNode[] = [];

    for (const n of nodes) {
      map.set(n.key, {
        ...n,
        children: [],
        expanded: prevExpanded.get(n.key) ?? (n.parent == null)
      });
    }

    for (const n of nodes) {
      const treeNode = map.get(n.key)!;
      if (n.parent != null) {
        map.get(n.parent)?.children.push(treeNode);
      } else {
        roots.push(treeNode);
      }
    }

    this.treeData = roots;
    this.applyFilter();
  }

  private applyFilter(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredData = [...this.treeData];
      return;
    }
    this.filteredData = this.filterNodes(this.treeData, term);
  }

  private filterNodes(nodes: TreeNode[], term: string): TreeNode[] {
    const result: TreeNode[] = [];
    for (const node of nodes) {
      const matches =
        node.name.toLowerCase().includes(term) ||
        node.title.toLowerCase().includes(term);
      const filteredChildren = this.filterNodes(node.children, term);
      if (matches || filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren, expanded: true });
      }
    }
    return result;
  }

  private collectExpandedState(nodes: TreeNode[], state: Map<number, boolean>): void {
    for (const node of nodes) {
      state.set(node.key, node.expanded);
      this.collectExpandedState(node.children, state);
    }
  }
}
