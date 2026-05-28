import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import * as go from 'gojs';
import { firstValueFrom } from 'rxjs';
import {
  canUseBrowserCanvas,
  createOrgChartDiagram,
  disposeDiagram,
  setInitialDiagramView
} from '../../factories/org-chart-diagram.factory';
import {
  createOrgChartNode,
  deleteOrgChartNode,
  getInitialOrgChartNodes,
  getOrgChartChildrenItems,
  updateOrgChartNode
} from '../../data/org-chart-api';
import {
  DeleteNodeConfirmationDialogComponent,
  DeleteNodeConfirmationDialogData
} from '../delete-node-confirmation-dialog/delete-node-confirmation-dialog';
import { OrgNode } from '../../types/org-node.types';

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

  constructor(private readonly dialog: MatDialog) {}

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
      confirmDeleteNode: (node) => this.confirmDeleteNode(node),
      deleteNode: deleteOrgChartNode,
      updateNode: updateOrgChartNode
    });
    this.diagramReady.emit(this.diagram);

    requestAnimationFrame(() => setInitialDiagramView(this.diagram));
  }

  private async confirmDeleteNode(node: OrgNode): Promise<boolean> {
    const confirmedImpact = await this.openDeleteConfirmation({
      title: 'Eliminar nodo',
      message: `¿Está seguro de eliminar el nodo "${node.name}"? Si este nodo es padre, sus nodos hijos también se eliminarán.`,
      confirmLabel: 'Sí, continuar',
      isDanger: true
    });

    if (!confirmedImpact) {
      return false;
    }

    return this.openDeleteConfirmation({
      title: 'Confirmar eliminación',
      message: '¿Está seguro de proceder con la eliminación? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      isDanger: true
    });
  }

  private async openDeleteConfirmation(data: DeleteNodeConfirmationDialogData): Promise<boolean> {
    const dialogRef = this.dialog.open(DeleteNodeConfirmationDialogComponent, {
      width: '440px',
      maxWidth: 'calc(100vw - 32px)',
      restoreFocus: true,
      data
    });

    return (await firstValueFrom(dialogRef.afterClosed())) === true;
  }
}
