import * as go from 'gojs';
import {
  COMPACT_VIEWPORT_WIDTH,
  DIAGRAM_ZOOM_STEP,
  INITIAL_DIAGRAM_COMPACT_SCALE,
  INITIAL_DIAGRAM_SCALE
} from '../constants/org-chart.constants';
import {
  CreateOrgNodeRequest,
  DeleteOrgNodeResult,
  OrgNode,
  UpdateOrgNodeRequest
} from '../types/org-node.types';
import { getInitials, getLevelColor } from '../utils/org-chart-formatters';

export type GetOrgChartChildren = (parentKey: number) => Promise<OrgNode[]>;
export type CreateOrgChartNode = (request: CreateOrgNodeRequest) => Promise<OrgNode>;
export type ConfirmDeleteOrgChartNode = (node: OrgNode) => Promise<boolean>;
export type DeleteOrgChartNode = (key: number) => Promise<DeleteOrgNodeResult | undefined>;
export type UpdateOrgChartNode = (key: number, changes: UpdateOrgNodeRequest) => Promise<OrgNode | undefined>;

export interface OrgChartDiagramOptions {
  initialNodes: OrgNode[];
  getChildren: GetOrgChartChildren;
  createNode: CreateOrgChartNode;
  confirmDeleteNode: ConfirmDeleteOrgChartNode;
  deleteNode: DeleteOrgChartNode;
  updateNode: UpdateOrgChartNode;
}

// evita crear gojs cuando angular corre en pruebas sin canvas real
export function canUseBrowserCanvas(host: HTMLElement): boolean {
  const view = host.ownerDocument.defaultView;

  return !!view && !view.navigator.userAgent.includes('jsdom');
}

// arma el diagrama principal con layout, modelo y plantillas de gojs
export function createOrgChartDiagram(host: HTMLDivElement, options: OrgChartDiagramOptions): go.Diagram {
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
    grid: createGrid($),
    'draggingTool.dragsTree': true,
    'undoManager.isEnabled': false,
    model: new go.TreeModel(options.initialNodes)
  });

  diagram.nodeTemplate = createNodeTemplate($, options);
  diagram.linkTemplate = createLinkTemplate($);

  return diagram;
}

// crea el minimapa conectado al diagrama principal
export function createOrgChartOverview(host: HTMLDivElement, diagram: go.Diagram): go.Overview {
  return new go.Overview(host, {
    observed: diagram,
    contentAlignment: go.Spot.Center
  });
}

// suelta el div para que gojs limpie el canvas
export function disposeDiagram(diagram?: go.Diagram): void {
  if (diagram) {
    diagram.div = null;
  }
}

// suelta el div del overview cuando el componente se destruye
export function disposeOverview(overview?: go.Overview): void {
  if (overview) {
    overview.div = null;
  }
}

// encaja todo el organigrama dentro del viewport
export function fitDiagram(diagram?: go.Diagram): void {
  diagram?.commandHandler.zoomToFit();
}

// enfoca la raiz con un zoom mas comodo para la primera carga
export function setInitialDiagramView(diagram?: go.Diagram): void {
  if (!diagram) {
    return;
  }

  const rootData = getDiagramNodes(diagram).find((node) => node.parent == null);
  const rootNode = rootData ? diagram.findNodeForKey(rootData.key) : null;

  if (!rootNode) {
    fitDiagram(diagram);
    return;
  }

  const viewportWidth = diagram.div?.clientWidth ?? diagram.viewportBounds.width;
  diagram.scale = viewportWidth < COMPACT_VIEWPORT_WIDTH ? INITIAL_DIAGRAM_COMPACT_SCALE : INITIAL_DIAGRAM_SCALE;
  diagram.select(rootNode);
  diagram.position = new go.Point(
    rootNode.actualBounds.centerX - diagram.viewportBounds.width / 2,
    rootNode.actualBounds.y - 24
  );
}

// acerca el canvas desde la toolbar
export function zoomIn(diagram?: go.Diagram): void {
  if (diagram) {
    diagram.scale *= DIAGRAM_ZOOM_STEP;
  }
}

// aleja el canvas desde la toolbar
export function zoomOut(diagram?: go.Diagram): void {
  if (diagram) {
    diagram.scale /= DIAGRAM_ZOOM_STEP;
  }
}

// devuelve los nodos que ya estan cargados en el modelo de gojs
export function getDiagramNodes(diagram: go.Diagram): OrgNode[] {
  return (diagram.model as go.TreeModel).nodeDataArray as OrgNode[];
}

// carga hijos para un nodo especifico sin exponer detalles de gojs al panel
export async function loadDiagramNodeChildren(
  diagram: go.Diagram | undefined,
  parentKey: number,
  getChildren: GetOrgChartChildren
): Promise<OrgNode[]> {
  const node = diagram?.findNodeForKey(parentKey);

  if (!diagram || !node) {
    return [];
  }

  return loadNodeChildren(diagram, node, getChildren);
}

// selecciona y centra un nodo en el canvas
export function selectNodeByKey(diagram: go.Diagram | undefined, key: number): void {
  if (!diagram) {
    return;
  }

  const node = diagram.findNodeForKey(key);
  if (!node) {
    return;
  }

  diagram.select(node);
  diagram.commandHandler.scrollToPart(node);
  diagram.centerRect(node.actualBounds);
}

// crea la cuadricula tenue del fondo
function createGrid($: typeof go.GraphObject.make): go.Panel {
  return $(
    go.Panel,
    'Grid',
    { gridCellSize: new go.Size(24, 24) },
    $(go.Shape, 'LineH', { stroke: '#e7edf5', strokeWidth: 0.7 }),
    $(go.Shape, 'LineV', { stroke: '#e7edf5', strokeWidth: 0.7 })
  );
}

// define la linea que conecta padre e hijo
function createLinkTemplate($: typeof go.GraphObject.make): go.Link {
  return $(
    go.Link,
    {
      routing: go.Routing.Orthogonal,
      corner: 12,
      selectable: false
    },
    $(go.Shape, { stroke: '#aab8c9', strokeWidth: 1.5 })
  );
}

// define como se ve y se comporta cada tarjeta del organigrama
function createNodeTemplate($: typeof go.GraphObject.make, options: OrgChartDiagramOptions): go.Node {
  return $(
    go.Node,
    'Auto',
    {
      selectionObjectName: 'CARD',
      fromSpot: go.Spot.Bottom,
      toSpot: go.Spot.Top,
      mouseDragEnter: (event, node) => setReparentTarget(event, node as go.Node, true),
      mouseDragLeave: (event, node) => setReparentTarget(event, node as go.Node, false),
      mouseDrop: (event, node) => reparentSelection(event, node as go.Node, options.updateNode),
      contextMenu: createNodeMenu($, options)
    },
    new go.Binding('isTreeExpanded', 'isTreeExpanded').makeTwoWay(),
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
        new go.Binding('fill', 'level', (level?: number) => getLevelColor(level))
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
          new go.Binding('fill', 'level', (level?: number) => getLevelColor(level))
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
          new go.Binding('text', 'name', (name: string) => getInitials(name))
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
          new go.Binding('text', 'name').makeTwoWay(),
          { textEdited: (textBlock) => persistTextEdit(textBlock, 'name', options.updateNode) }
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
          new go.Binding('text', 'title').makeTwoWay(),
          { textEdited: (textBlock) => persistTextEdit(textBlock, 'title', options.updateNode) }
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
          new go.Binding('text', 'dept').makeTwoWay(),
          { textEdited: (textBlock) => persistTextEdit(textBlock, 'dept', options.updateNode) }
        ),
        createTreeToggleButton($, options.getChildren)
      )
    )
  );
}

// persiste cambios de texto hechos directamente en una tarjeta
function persistTextEdit(
  textBlock: go.TextBlock,
  propertyName: keyof Pick<OrgNode, 'name' | 'title' | 'dept'>,
  updateNode: UpdateOrgChartNode
): void {
  const data = textBlock.part?.data as OrgNode | undefined;

  if (!data) {
    return;
  }

  void updateNode(data.key, { [propertyName]: textBlock.text });
}

// crea el boton que expande, colapsa o dispara lazy loading
function createTreeToggleButton($: typeof go.GraphObject.make, getChildren: GetOrgChartChildren): go.Panel {
  return $(
    'Button',
    {
      row: 0,
      column: 2,
      alignment: go.Spot.TopRight,
      margin: new go.Margin(0, 0, 0, 8),
      width: 22,
      height: 22,
      click: (event, button) => {
        const node = button.part as go.Node | null;
        void toggleTreeNode(event.diagram, node, getChildren);
      }
    },
    new go.Binding('visible', 'hasChildren', (hasChildren: boolean) => hasChildren === true),
    $(
      go.Shape,
      'TriangleRight',
      {
        width: 8,
        height: 8,
        fill: '#627184',
        strokeWidth: 0
      },
      new go.Binding('angle', 'isTreeExpanded', (isExpanded: boolean) => (isExpanded ? 90 : 0)).ofObject()
    )
  );
}

// decide si un nodo se expande, colapsa o primero carga sus hijos
async function toggleTreeNode(
  diagram: go.Diagram,
  node: go.Node | null,
  getChildren: GetOrgChartChildren
): Promise<void> {
  if (!node) {
    return;
  }

  const data = node.data as OrgNode;

  if (data.hasChildren && !data.childrenLoaded) {
    await loadNodeChildren(diagram, node, getChildren);
    node.expandTree(1);
    return;
  }

  if (node.isTreeExpanded) {
    node.collapseTree(1);
  } else {
    node.expandTree(1);
  }
}

// agrega al modelo los hijos que todavia no estan dibujados
async function loadNodeChildren(
  diagram: go.Diagram,
  node: go.Node,
  getChildren: GetOrgChartChildren
): Promise<OrgNode[]> {
  const model = diagram.model as go.TreeModel;
  const parent = node.data as OrgNode;

  if (!parent.hasChildren || parent.childrenLoaded || parent.isLoadingChildren) {
    return [];
  }

  // gojs necesita transacciones para que el modelo y undo queden consistentes
  diagram.startTransaction('mark children loading');
  model.setDataProperty(parent, 'isLoadingChildren', true);
  diagram.commitTransaction('mark children loading');

  try {
    const children = await getChildren(parent.key);

    diagram.startTransaction('load children');
    for (const child of children) {
      if (!model.findNodeDataForKey(child.key)) {
        model.addNodeData({ ...child });
      }
    }
    model.setDataProperty(parent, 'childrenLoaded', true);
    model.setDataProperty(parent, 'hasChildren', children.length > 0);
    model.setDataProperty(parent, 'isTreeExpanded', true);
    diagram.commitTransaction('load children');

    return children;
  } catch (error) {
    console.error(error);
    return [];
  } finally {
    diagram.startTransaction('mark children loaded');
    model.setDataProperty(parent, 'isLoadingChildren', false);
    diagram.commitTransaction('mark children loaded');
  }
}

// crea el menu contextual para acciones sobre una tarjeta
function createNodeMenu($: typeof go.GraphObject.make, options: OrgChartDiagramOptions): go.Adornment {
  return $(
    'ContextMenu',
    $(
      go.Panel,
      'Horizontal',
      $(
        'ContextMenuButton',
        $(go.TextBlock, 'Agregar reporte', { margin: new go.Margin(7, 12, 7, 12) }),
        {
          click: (_event, button) => {
            const node = (button.part as go.Adornment).adornedPart as go.Node | null;
            void addDirectReport(node, options);
          }
        }
      ),
      $(
        'ContextMenuButton',
        $(go.TextBlock, 'Eliminar nodo', {
          margin: new go.Margin(7, 12, 7, 12),
          stroke: '#a62b2b'
        }),
        {
          click: (_event, button) => {
            const node = (button.part as go.Adornment).adornedPart as go.Node | null;
            void deleteNodeWithConfirmation(node, options);
          }
        }
      )
    )
  );
}

// marca visualmente un posible padre mientras se arrastra un nodo
function setReparentTarget(event: go.InputEvent, target: go.Node, isActive: boolean): void {
  const dragged = event.diagram.selection.first() as go.Node | null;
  const card = target.findObject('CARD') as go.Shape | null;

  if (!card || !canReparent(dragged, target)) {
    return;
  }

  card.stroke = isActive ? '#0f8f7f' : '#d7e0ea';
  card.strokeWidth = isActive ? 2 : 1;
}

// cambia el padre del nodo arrastrado y guarda el cambio
function reparentSelection(event: go.InputEvent, target: go.Node, updateNode: UpdateOrgChartNode): void {
  const dragged = event.diagram.selection.first() as go.Node | null;

  setReparentTarget(event, target, false);

  if (!canReparent(dragged, target)) {
    return;
  }

  const draggedData = dragged!.data as OrgNode;
  const targetData = target.data as OrgNode;
  const model = event.diagram.model as go.TreeModel;

  model.setDataProperty(draggedData, 'parent', targetData.key);
  updateLoadedSubtreeLevels(model, draggedData, (targetData.level ?? 1) + 1);
  void updateNode(draggedData.key, { parent: targetData.key });
}

// evita ciclos y que un nodo sea padre de si mismo
function canReparent(dragged: go.Node | null, target: go.Node): boolean {
  return !!dragged && dragged !== target && !target.findTreeParentChain().has(dragged);
}

// refresca niveles cargados para que el color cambie al mover ramas
function updateLoadedSubtreeLevels(model: go.TreeModel, root: OrgNode, level: number): void {
  model.setDataProperty(root, 'level', level);

  const children = (model.nodeDataArray as OrgNode[]).filter((node) => node.parent === root.key);
  for (const child of children) {
    updateLoadedSubtreeLevels(model, child, level + 1);
  }
}

// crea un reporte directo debajo del nodo seleccionado
async function addDirectReport(node: go.Node | null, options: OrgChartDiagramOptions): Promise<void> {
  const diagram = node?.diagram;

  if (!diagram || !node) {
    return;
  }

  const model = diagram.model as go.TreeModel;
  const boss = node.data as OrgNode;

  // si el nodo tiene hijos pendientes, primero los carga para no pisar el arbol
  if (boss.hasChildren && !boss.childrenLoaded) {
    await loadNodeChildren(diagram, node, options.getChildren);
  }

  const newEmployee = await options.createNode({
    name: 'Nuevo colaborador',
    title: 'Cargo',
    dept: boss.dept,
    parent: boss.key
  });

  diagram.startTransaction('add direct report');
  model.setDataProperty(boss, 'hasChildren', true);
  model.setDataProperty(boss, 'childrenLoaded', true);
  model.addNodeData(newEmployee);
  diagram.commitTransaction('add direct report');

  const addedNode = diagram.findNodeForData(newEmployee);
  if (addedNode) {
    diagram.select(addedNode);
    diagram.commandHandler.scrollToPart(addedNode);
    diagram.commandHandler.editTextBlock(addedNode.findObject('nameText') as go.TextBlock);
  }
}

// confirma y elimina el nodo junto con cualquier descendiente en la fuente de datos
async function deleteNodeWithConfirmation(node: go.Node | null, options: OrgChartDiagramOptions): Promise<void> {
  const diagram = node?.diagram;

  if (!diagram || !node) {
    return;
  }

  const model = diagram.model as go.TreeModel;
  const deletedNode = node.data as OrgNode;

  if (!(await options.confirmDeleteNode(deletedNode))) {
    return;
  }

  const result = await options.deleteNode(deletedNode.key);
  if (!result) {
    console.warn(`No se encontro el nodo ${deletedNode.key} para eliminar.`);
    return;
  }

  diagram.startTransaction('delete node subtree');
  removeDeletedNodeData(model, result.deletedKeys);
  updateDeletedParentState(model, result);
  diagram.commitTransaction('delete node subtree');

  selectDeletedParent(diagram, result.parentKey);
}

function removeDeletedNodeData(model: go.TreeModel, deletedKeys: number[]): void {
  const deletedKeySet = new Set(deletedKeys);
  const deletedData = (model.nodeDataArray as OrgNode[]).filter((node) => deletedKeySet.has(node.key));

  model.removeNodeDataCollection(deletedData);
}

function updateDeletedParentState(model: go.TreeModel, result: DeleteOrgNodeResult): void {
  if (result.parentKey == null) {
    return;
  }

  const parentData = model.findNodeDataForKey(result.parentKey) as OrgNode | null;
  if (!parentData) {
    return;
  }

  model.setDataProperty(parentData, 'hasChildren', result.parentHasChildren);
  if (!result.parentHasChildren) {
    model.setDataProperty(parentData, 'childrenLoaded', true);
    model.setDataProperty(parentData, 'isTreeExpanded', true);
  }
}

function selectDeletedParent(diagram: go.Diagram, parentKey: number | undefined): void {
  if (parentKey == null) {
    diagram.clearSelection();
    return;
  }

  selectNodeByKey(diagram, parentKey);
}
