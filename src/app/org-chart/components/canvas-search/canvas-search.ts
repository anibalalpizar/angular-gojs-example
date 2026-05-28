import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideSearch, LucideX } from '@lucide/angular';
import * as go from 'gojs';
import { MAX_SEARCH_RESULTS } from '../../constants/org-chart.constants';
import { getDiagramNodes, selectNodeByKey } from '../../factories/org-chart-diagram.factory';
import { OrgNode, SearchResultNode } from '../../types/org-node.types';
import { searchOrgChart } from '../../utils/org-chart-query';
import { getInitials, getLevelColor } from '../../utils/org-chart-formatters';

@Component({
  selector: 'app-canvas-search',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideSearch, LucideX],
  templateUrl: './canvas-search.html',
  styleUrl: './canvas-search.css'
})
export class CanvasSearchComponent implements OnChanges {
  @Input() diagram: go.Diagram | undefined;
  @Input() isOpen = false;

  readonly maxResults = MAX_SEARCH_RESULTS;
  searchTerm = '';
  resultTree: SearchResultNode[] = [];
  resultsTotal = 0;

  private flatMatches: OrgNode[] = [];

  // limpia la busqueda cuando se cierra el panel
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && !this.isOpen) {
      this.clear();
    }
  }

  // busca sobre los nodos que ya estan cargados en el diagrama
  onSearch(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term || !this.diagram) {
      this.clearResults();
      return;
    }

    const nodes = getDiagramNodes(this.diagram);
    const result = searchOrgChart(nodes, term, this.maxResults);

    this.resultsTotal = result.total;
    this.flatMatches = result.matches;
    this.resultTree = result.resultTree;
  }

  // centra el nodo elegido y cierra la busqueda
  navigateTo(key: number): void {
    selectNodeByKey(this.diagram, key);
    this.clear();
  }

  // permite saltar rapido al primer resultado
  selectFirst(): void {
    if (this.flatMatches.length > 0) {
      this.navigateTo(this.flatMatches[0].key);
    }
  }

  // borra el texto y los resultados visibles
  clear(): void {
    this.searchTerm = '';
    this.clearResults();
  }

  getNodeColor(level?: number): string {
    return getLevelColor(level);
  }

  getInitials(name: string): string {
    return getInitials(name);
  }

  // deja el panel sin resultados activos
  private clearResults(): void {
    this.resultTree = [];
    this.resultsTotal = 0;
    this.flatMatches = [];
  }
}

