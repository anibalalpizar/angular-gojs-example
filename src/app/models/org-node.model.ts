export interface OrgNode {
  key: number;
  name: string;
  title: string;
  dept: string;
  parent?: number;
}

export const DEPT_COLORS: Record<string, string> = {
  Direccion: '#0f8f7f',
  Operaciones: '#2f6fed',
  Producto: '#7c5cff',
  Comercial: '#e28a22',
  Finanzas: '#617386',
  Soporte: '#199a5a'
};
