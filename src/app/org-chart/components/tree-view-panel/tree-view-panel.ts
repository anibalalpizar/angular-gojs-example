import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideChevronRight, LucideSearch, LucideX } from '@lucide/angular';
import * as go from 'gojs';
import { getDiagramNodes, loadDiagramNodeChildren, selectNodeByKey } from '../../factories/org-chart-diagram.factory';
import { getOrgChartChildrenItems } from '../../data/org-chart-api';
import { TreeNode } from '../../types/org-node.types';
import { buildTree, filterTree } from '../../utils/org-chart-query';
import { getDepartmentColor, getInitials } from '../../utils/org-chart-formatters';

@Component({
  selector: 'app-tree-view-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideChevronRight, LucideSearch, LucideX],
  templateUrl: './tree-view-panel.html',
  styleUrl: './tree-view-panel.css'
})
export class TreeViewPanelComponent implements OnChanges {
  @Input() diagram: go.Diagram | undefined;
  @Input() isOpen = false;
  @Output() isOpenChange = new EventEmitter<boolean>();

  searchTerm = '';
  treeData: TreeNode[] = [];
  filteredData: TreeNode[] = [];

  close(): void {
    this.isOpenChange.emit(false);
  }

  ngOnChanges(changes: SimpleChanges): void {
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

  async toggleNode(node: TreeNode): Promise<void> {
    if (this.diagram && node.hasChildren && !node.childrenLoaded) {
      await loadDiagramNodeChildren(this.diagram, node.key, getOrgChartChildrenItems);
      this.buildTree(node.key);
      return;
    }

    node.expanded = !node.expanded;
  }

  navigateTo(key: number): void {
    selectNodeByKey(this.diagram, key);
  }

  getDeptColor(dept: string): string {
    return getDepartmentColor(dept);
  }

  getInitials(name: string): string {
    return getInitials(name);
  }

  private buildTree(expandedNodeKey?: number): void {
    if (!this.diagram) {
      this.treeData = [];
      this.filteredData = [];
      return;
    }

    this.treeData = buildTree(getDiagramNodes(this.diagram), this.treeData);
    if (expandedNodeKey != null) {
      this.expandTreeNode(this.treeData, expandedNodeKey);
    }
    this.applyFilter();
  }

  private applyFilter(): void {
    this.filteredData = filterTree(this.treeData, this.searchTerm);
  }

  private expandTreeNode(nodes: TreeNode[], key: number): boolean {
    for (const node of nodes) {
      if (node.key === key) {
        node.expanded = true;
        return true;
      }

      if (this.expandTreeNode(node.children, key)) {
        return true;
      }
    }

    return false;
  }
}
