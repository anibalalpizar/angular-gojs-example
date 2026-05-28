import { Component } from '@angular/core';
import * as go from 'gojs';
import { PANEL_GAP, TREE_PANEL_WIDTH } from './constants/org-chart.constants';
import { CanvasSearchComponent } from './components/canvas-search/canvas-search';
import { OrgChartCanvasComponent } from './components/org-chart-canvas/org-chart-canvas.component';
import { OrgChartOverviewComponent } from './components/org-chart-overview/org-chart-overview.component';
import { OrgChartToolbarComponent } from './components/org-chart-toolbar/org-chart-toolbar.component';
import { TreeViewPanelComponent } from './components/tree-view-panel/tree-view-panel';
import { fitDiagram, zoomIn, zoomOut } from './factories/org-chart-diagram.factory';

@Component({
  selector: 'app-org-chart-editor',
  imports: [
    CanvasSearchComponent,
    OrgChartCanvasComponent,
    OrgChartOverviewComponent,
    OrgChartToolbarComponent,
    TreeViewPanelComponent
  ],
  templateUrl: './org-chart-editor.component.html',
  styleUrl: './org-chart-editor.component.css'
})
export class OrgChartEditorComponent {
  diagram?: go.Diagram;
  showCanvasSearch = false;
  showTreeView = false;

  get panelOffset(): number {
    return this.showTreeView ? TREE_PANEL_WIDTH + PANEL_GAP : PANEL_GAP;
  }

  onDiagramReady(diagram: go.Diagram): void {
    this.diagram = diagram;
  }

  fitDiagram(): void {
    fitDiagram(this.diagram);
  }

  zoomIn(): void {
    zoomIn(this.diagram);
  }

  zoomOut(): void {
    zoomOut(this.diagram);
  }
}
