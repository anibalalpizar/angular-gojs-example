import { DEPT_COLORS, FALLBACK_DEPT_COLOR } from '../constants/org-chart.constants';

// devuelve el color configurado para cada departamento
export function getDepartmentColor(dept: string): string {
  return DEPT_COLORS[dept] ?? FALLBACK_DEPT_COLOR;
}

// toma las primeras letras del nombre para el avatar
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
