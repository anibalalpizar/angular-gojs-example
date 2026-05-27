import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { LucideMaximize2, LucideZoomIn, LucideZoomOut } from '@lucide/angular';
import * as go from 'gojs';

interface OrgNode {
  key: number;
  name: string;
  title: string;
  dept: string;
  parent?: number;
}

@Component({
  selector: 'app-root',
  imports: [LucideMaximize2, LucideZoomIn, LucideZoomOut],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('diagramHost', { static: true })
  private diagramHost?: ElementRef<HTMLDivElement>;

  @ViewChild('overviewHost', { static: true })
  private overviewHost?: ElementRef<HTMLDivElement>;

  private diagram?: go.Diagram;
  private overview?: go.Overview;

  ngAfterViewInit(): void {
    if (
      !this.diagramHost ||
      !this.overviewHost ||
      !this.hasBrowserCanvas(this.diagramHost.nativeElement)
    ) {
      return;
    }

    this.diagram = this.createDiagram(this.diagramHost.nativeElement);
    this.overview = new go.Overview(this.overviewHost.nativeElement, {
      observed: this.diagram,
      contentAlignment: go.Spot.Center
    });

    requestAnimationFrame(() => this.fitDiagram());
  }

  ngOnDestroy(): void {
    if (this.overview) {
      this.overview.div = null;
    }

    if (this.diagram) {
      this.diagram.div = null;
    }
  }

  fitDiagram(): void {
    this.diagram?.commandHandler.zoomToFit();
  }

  zoomIn(): void {
    this.diagram?.commandHandler.increaseZoom(1.2);
  }

  zoomOut(): void {
    this.diagram?.commandHandler.decreaseZoom(1.2);
  }

  private createDiagram(host: HTMLDivElement): go.Diagram {
    const $ = go.GraphObject.make;
    const diagram = new go.Diagram(host, {
      allowCopy: false,
      allowLink: false,
      initialAutoScale: go.AutoScale.Uniform,
      maxSelectionCount: 1,
      padding: new go.Margin(48, 48, 96, 48),
      validCycle: go.CycleMode.DestinationTree,
      layout: new go.TreeLayout({
        angle: 90,
        layerSpacing: 44,
        nodeSpacing: 22,
        arrangementSpacing: new go.Size(28, 28)
      }),
      grid: $(
        go.Panel,
        'Grid',
        { gridCellSize: new go.Size(24, 24) },
        $(go.Shape, 'LineH', { stroke: '#e7edf5', strokeWidth: 0.7 }),
        $(go.Shape, 'LineV', { stroke: '#e7edf5', strokeWidth: 0.7 })
      ),
      'draggingTool.dragsTree': true,
      'undoManager.isEnabled': true,
      model: new go.TreeModel(this.orgData())
    });

    diagram.nodeTemplate = this.createNodeTemplate($);
    diagram.linkTemplate = $(
      go.Link,
      {
        routing: go.Routing.Orthogonal,
        corner: 12,
        selectable: false
      },
      $(go.Shape, { stroke: '#aab8c9', strokeWidth: 1.5 })
    );

    return diagram;
  }

  private hasBrowserCanvas(host: HTMLElement): boolean {
    const view = host.ownerDocument.defaultView;

    return !!view && !view.navigator.userAgent.includes('jsdom');
  }

  private createNodeTemplate($: typeof go.GraphObject.make): go.Node {
    return $(
      go.Node,
      'Auto',
      {
        selectionObjectName: 'CARD',
        fromSpot: go.Spot.Bottom,
        toSpot: go.Spot.Top,
        mouseDragEnter: (event, node) => this.setReparentTarget(event, node as go.Node, true),
        mouseDragLeave: (event, node) => this.setReparentTarget(event, node as go.Node, false),
        mouseDrop: (event, node) => this.reparentSelection(event, node as go.Node),
        contextMenu: this.createNodeMenu($)
      },
      $(
        go.Shape,
        'RoundedRectangle',
        {
          name: 'CARD',
          fill: '#ffffff',
          stroke: '#d7e0ea',
          strokeWidth: 1,
          parameter1: 8,
          spot1: go.Spot.TopLeft,
          spot2: go.Spot.BottomRight
        }
      ),
      $(
        go.Panel,
        'Vertical',
        { stretch: go.Stretch.Horizontal },
        $(
          go.Shape,
          'Rectangle',
          {
            stretch: go.Stretch.Horizontal,
            height: 7,
            strokeWidth: 0
          },
          new go.Binding('fill', 'dept', (dept: string) => this.departmentColor(dept))
        ),
        $(
          go.Panel,
          'Table',
          {
            margin: new go.Margin(12, 14, 13, 14),
            minSize: new go.Size(238, 84),
            maxSize: new go.Size(258, NaN),
            defaultAlignment: go.Spot.Left
          },
          $(go.RowColumnDefinition, { column: 0, width: 48 }),
          $(go.RowColumnDefinition, { column: 1, width: 168 }),
          $(
            go.Shape,
            'Circle',
            {
              row: 0,
              column: 0,
              rowSpan: 3,
              width: 40,
              height: 40,
              strokeWidth: 0
            },
            new go.Binding('fill', 'dept', (dept: string) => this.departmentColor(dept))
          ),
          $(
            go.TextBlock,
            {
              row: 0,
              column: 0,
              rowSpan: 3,
              width: 40,
              textAlign: 'center',
              verticalAlignment: go.Spot.Center,
              stroke: '#ffffff',
              font: '700 12px Arial, Helvetica, sans-serif'
            },
            new go.Binding('text', 'name', (name: string) => this.initials(name))
          ),
          $(
            go.TextBlock,
            {
              name: 'nameText',
              row: 0,
              column: 1,
              editable: true,
              isMultiline: false,
              stroke: '#122033',
              font: '700 14px Arial, Helvetica, sans-serif',
              maxLines: 1,
              overflow: go.TextOverflow.Ellipsis
            },
            new go.Binding('text', 'name').makeTwoWay()
          ),
          $(
            go.TextBlock,
            {
              row: 1,
              column: 1,
              editable: true,
              isMultiline: false,
              margin: new go.Margin(4, 0, 0, 0),
              stroke: '#526173',
              font: '12px Arial, Helvetica, sans-serif',
              maxLines: 1,
              overflow: go.TextOverflow.Ellipsis
            },
            new go.Binding('text', 'title').makeTwoWay()
          ),
          $(
            go.TextBlock,
            {
              row: 2,
              column: 1,
              editable: true,
              isMultiline: false,
              margin: new go.Margin(8, 0, 0, 0),
              stroke: '#697789',
              font: '600 11px Arial, Helvetica, sans-serif',
              maxLines: 1,
              overflow: go.TextOverflow.Ellipsis
            },
            new go.Binding('text', 'dept').makeTwoWay()
          ),
          $('TreeExpanderButton', {
            row: 0,
            column: 2,
            alignment: go.Spot.TopRight,
            margin: new go.Margin(0, 0, 0, 8)
          })
        )
      )
    );
  }

  private createNodeMenu($: typeof go.GraphObject.make): go.Adornment {
    return $(
      'ContextMenu',
      $(
        'ContextMenuButton',
        $(go.TextBlock, 'Agregar reporte', { margin: new go.Margin(7, 12, 7, 12) }),
        {
          click: (_event, button) => {
            const node = (button.part as go.Adornment).adornedPart as go.Node | null;
            this.addDirectReport(node);
          }
        }
      )
    );
  }

  private setReparentTarget(event: go.InputEvent, target: go.Node, isActive: boolean): void {
    const dragged = event.diagram.selection.first() as go.Node | null;
    const card = target.findObject('CARD') as go.Shape | null;

    if (!card || !this.canReparent(dragged, target)) {
      return;
    }

    card.stroke = isActive ? '#0f8f7f' : '#d7e0ea';
    card.strokeWidth = isActive ? 2 : 1;
  }

  private reparentSelection(event: go.InputEvent, target: go.Node): void {
    const dragged = event.diagram.selection.first() as go.Node | null;

    this.setReparentTarget(event, target, false);

    if (!this.canReparent(dragged, target)) {
      return;
    }

    event.diagram.model.setDataProperty(dragged!.data, 'parent', target.data.key);
  }

  private canReparent(dragged: go.Node | null, target: go.Node): boolean {
    return !!dragged && dragged !== target && !target.findTreeParentChain().has(dragged);
  }

  private addDirectReport(node: go.Node | null): void {
    const diagram = this.diagram;

    if (!diagram || !node) {
      return;
    }

    const model = diagram.model as go.TreeModel;
    const boss = node.data as OrgNode;
    const newEmployee: OrgNode = {
      key: this.nextKey(model),
      name: 'Nuevo colaborador',
      title: 'Cargo',
      dept: boss.dept,
      parent: boss.key
    };

    diagram.startTransaction('add direct report');
    model.addNodeData(newEmployee);
    diagram.commitTransaction('add direct report');

    const addedNode = diagram.findNodeForData(newEmployee);
    if (addedNode) {
      diagram.select(addedNode);
      diagram.commandHandler.scrollToPart(addedNode);
      diagram.commandHandler.editTextBlock(addedNode.findObject('nameText') as go.TextBlock);
    }
  }

  private nextKey(model: go.TreeModel): number {
    return Math.max(...model.nodeDataArray.map((node) => Number(node['key'])), 0) + 1;
  }

  private initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  private departmentColor(dept: string): string {
    const colors: Record<string, string> = {
      Direccion: '#0f8f7f',
      Operaciones: '#2f6fed',
      Producto: '#7c5cff',
      Comercial: '#e28a22',
      Finanzas: '#617386',
      Soporte: '#199a5a'
    };

    return colors[dept] ?? '#5b6b7c';
  }

  private orgData(): OrgNode[] {
    return [
      { key: 1, name: 'Ana Morales', title: 'Directora General', dept: 'Direccion' },
      { key: 2, name: 'Carlos Vega', title: 'Director de Operaciones', dept: 'Operaciones', parent: 1 },
      { key: 3, name: 'Maria Solano', title: 'Directora de Producto', dept: 'Producto', parent: 1 },
      { key: 4, name: 'Sofia Ruiz', title: 'Directora Comercial', dept: 'Comercial', parent: 1 },
      { key: 5, name: 'Luis Herrera', title: 'Coordinador de Logistica', dept: 'Operaciones', parent: 2 },
      { key: 6, name: 'Valeria Castro', title: 'Lider de Calidad', dept: 'Operaciones', parent: 2 },
      { key: 7, name: 'Diego Arias', title: 'UX Lead', dept: 'Producto', parent: 3 },
      { key: 8, name: 'Natalia Mora', title: 'Engineering Lead', dept: 'Producto', parent: 3 },
      { key: 9, name: 'Andres Rojas', title: 'Ventas Enterprise', dept: 'Comercial', parent: 4 },
      { key: 10, name: 'Paola Leon', title: 'Customer Success', dept: 'Soporte', parent: 4 },
      { key: 11, name: 'Marco Jimenez', title: 'Finanzas', dept: 'Finanzas', parent: 1 }
    ];
  }
}
