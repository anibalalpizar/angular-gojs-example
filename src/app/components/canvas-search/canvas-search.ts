import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as go from 'gojs';

interface OrgNode {
  key: number;
  name: string;
  title: string;
  dept: string;
  parent?: number;
}

interface SearchResultNode {
  key: number;
  name: string;
  title: string;
  dept: string;
  isMatch: boolean;
  children: SearchResultNode[];
}

const DEPT_COLORS: Record<string, string> = {
  Direccion: '#0f8f7f',
  Operaciones: '#2f6fed',
  Producto: '#7c5cff',
  Comercial: '#e28a22',
  Finanzas: '#617386',
  Soporte: '#199a5a'
};

@Component({
  selector: 'app-canvas-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './canvas-search.html',
  styleUrl: './canvas-search.css'
})
export class CanvasSearchComponent implements OnChanges {
  @Input() diagram: go.Diagram | undefined;
  @Input() isOpen = false;

  searchTerm = '';
  resultTree: SearchResultNode[] = [];
  resultsTotal = 0;

  private flatMatches: OrgNode[] = [];
  private readonly MAX_RESULTS = 8;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && !this.isOpen) {
      this.clear();
    }
  }

  onSearch(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term || !this.diagram) {
      this.resultTree = [];
      this.resultsTotal = 0;
      this.flatMatches = [];
      return;
    }
    const allNodes = (this.diagram.model as go.TreeModel).nodeDataArray as OrgNode[];
    const matches = allNodes.filter(
      n =>
        n.name.toLowerCase().includes(term) ||
        n.title.toLowerCase().includes(term)
    );
    this.resultsTotal = matches.length;
    this.flatMatches = matches.slice(0, this.MAX_RESULTS);
    this.resultTree = this.buildSearchResultTree(allNodes, this.flatMatches);
  }

  navigateTo(key: number): void {
    if (!this.diagram) return;
    const node = this.diagram.findNodeForKey(key);
    if (node) {
      this.diagram.select(node);
      this.diagram.commandHandler.scrollToPart(node);
      this.diagram.centerRect(node.actualBounds);
    }
    this.clear();
  }

  selectFirst(): void {
    if (this.flatMatches.length > 0) {
      this.navigateTo(this.flatMatches[0].key);
    }
  }

  clear(): void {
    this.searchTerm = '';
    this.resultTree = [];
    this.resultsTotal = 0;
    this.flatMatches = [];
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

  // ── Tree-building helpers ─────────────────────────────────────────────────

  private buildSearchResultTree(allNodes: OrgNode[], matches: OrgNode[]): SearchResultNode[] {
    if (matches.length === 0) return [];

    const nodeMap = new Map<number, OrgNode>();
    for (const n of allNodes) nodeMap.set(n.key, n);

    const matchKeys = new Set<number>(matches.map(m => m.key));

    // Walk up the ancestor chain for every match to collect all keys to include
    const included = new Set<number>();
    for (const match of matches) {
      let current: OrgNode | undefined = match;
      while (current) {
        included.add(current.key);
        current = current.parent != null ? nodeMap.get(current.parent) : undefined;
      }
    }

    // Build result node map
    const resultMap = new Map<number, SearchResultNode>();
    for (const node of allNodes) {
      if (!included.has(node.key)) continue;
      resultMap.set(node.key, {
        key: node.key,
        name: node.name,
        title: node.title,
        dept: node.dept,
        isMatch: matchKeys.has(node.key),
        children: []
      });
    }

    // Connect parent ↔ child and collect roots
    const roots: SearchResultNode[] = [];
    for (const node of allNodes) {
      if (!included.has(node.key)) continue;
      const rNode = resultMap.get(node.key)!;
      if (node.parent != null) {
        resultMap.get(node.parent)?.children.push(rNode);
      } else {
        roots.push(rNode);
      }
    }

    return roots;
  }
}

