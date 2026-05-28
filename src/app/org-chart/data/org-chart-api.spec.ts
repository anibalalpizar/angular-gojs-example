import {
  createOrgChartNode,
  getInitialOrgChartNodes,
  getOrgChartChildren,
  updateOrgChartNode
} from './org-chart-api';
import { OrgNode } from '../types/org-node.types';

describe('org-chart-api local adapter', () => {
  beforeAll(() => {
    const sourceNodes: OrgNode[] = [
      { key: 1, name: 'Root', title: 'CEO', dept: 'Direccion' },
      { key: 2, name: 'Area', title: 'Director', dept: 'Producto', parent: 1 },
      { key: 3, name: 'Team', title: 'Manager', dept: 'Producto', parent: 2 },
      { key: 4, name: 'Contributor', title: 'Analyst', dept: 'Producto', parent: 3 }
    ];

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => sourceNodes
      }))
    );
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('gets initial nodes, paged children, creates nodes, and updates nodes', async () => {
    const initialNodes = await getInitialOrgChartNodes();
    expect(initialNodes.map((node) => node.key)).toEqual([1, 2, 3]);
    expect(initialNodes.at(-1)?.childrenLoaded).toBe(false);

    const childrenPage = await getOrgChartChildren(3, 1, 1);
    expect(childrenPage.items.map((node) => node.key)).toEqual([4]);
    expect(childrenPage.total).toBe(1);

    const createdNode = await createOrgChartNode({
      name: 'New teammate',
      title: 'Designer',
      parent: 3
    });
    expect(createdNode.key).toBe(5);
    expect(createdNode.dept).toBe('Producto');

    const updatedNode = await updateOrgChartNode(createdNode.key, { name: 'Updated teammate' });
    expect(updatedNode?.name).toBe('Updated teammate');

    const updatedChildrenPage = await getOrgChartChildren(3, 1, 10);
    expect(updatedChildrenPage.items.map((node) => node.name)).toContain('Updated teammate');
  });
});
