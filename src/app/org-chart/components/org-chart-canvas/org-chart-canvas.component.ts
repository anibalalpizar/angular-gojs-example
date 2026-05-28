import { AfterViewInit, Component, ElementRef, EventEmitter, NgZone, OnDestroy, Output, ViewChild } from '@angular/core';
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
  @Output() diagramChanged = new EventEmitter<void>();

  @ViewChild('diagramHost', { static: true })
  private diagramHost?: ElementRef<HTMLDivElement>;

  private diagram?: go.Diagram;
  private isDestroyed = false;

  constructor(
    private readonly dialog: MatDialog,
    private readonly zone: NgZone
  ) {}

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
    this.diagram?.removeModelChangedListener(this.handleDiagramModelChanged);
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
    this.diagram.addModelChangedListener(this.handleDiagramModelChanged);
    this.diagramReady.emit(this.diagram);

    requestAnimationFrame(() => setInitialDiagramView(this.diagram));
  }

  // avisa a angular cuando gojs termina de cambiar el modelo
  private readonly handleDiagramModelChanged = (event: go.ChangedEvent): void => {
    if (!event.isTransactionFinished || this.isDestroyed) {
      return;
    }

    this.zone.run(() => this.diagramChanged.emit());
  };

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
