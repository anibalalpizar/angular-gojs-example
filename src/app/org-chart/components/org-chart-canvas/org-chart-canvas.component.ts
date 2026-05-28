import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import * as go from 'gojs';
import {
  canUseBrowserCanvas,
  createOrgChartDiagram,
  disposeDiagram,
  fitDiagram
} from '../../factories/org-chart-diagram.factory';
import {
  createOrgChartNode,
  getInitialOrgChartNodes,
  getOrgChartChildrenItems,
  updateOrgChartNode
} from '../../data/org-chart-api';

@Component({
  selector: 'app-org-chart-canvas',
  templateUrl: './org-chart-canvas.component.html',
  styleUrl: './org-chart-canvas.component.css'
})
export class OrgChartCanvasComponent implements AfterViewInit, OnDestroy {
  @Output() diagramReady = new EventEmitter<go.Diagram>(true);

  @ViewChild('diagramHost', { static: true })
  private diagramHost?: ElementRef<HTMLDivElement>;

  private diagram?: go.Diagram;
  private isDestroyed = false;

  // crea el diagrama cuando el contenedor ya existe en pantalla
  ngAfterViewInit(): void {
    if (!this.diagramHost || !canUseBrowserCanvas(this.diagramHost.nativeElement)) {
      return;
    }

    void this.initializeDiagram(this.diagramHost.nativeElement);
  }

  // libera el canvas de gojs cuando angular destruye el componente
  ngOnDestroy(): void {
    this.isDestroyed = true;
    disposeDiagram(this.diagram);
  }

  // carga los nodos iniciales y conecta las acciones de datos
  private async initializeDiagram(host: HTMLDivElement): Promise<void> {
    const initialNodes = await getInitialOrgChartNodes();

    if (this.isDestroyed) {
      return;
    }

    this.diagram = createOrgChartDiagram(host, {
      initialNodes,
      getChildren: getOrgChartChildrenItems,
      createNode: createOrgChartNode,
      updateNode: updateOrgChartNode
    });
    this.diagramReady.emit(this.diagram);

    requestAnimationFrame(() => fitDiagram(this.diagram));
  }
}
