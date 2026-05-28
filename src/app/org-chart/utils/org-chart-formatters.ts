import { FALLBACK_LEVEL_COLOR, LEVEL_COLORS } from '../constants/org-chart.constants';

// devuelve el color configurado para cada nivel del arbol
export function getLevelColor(level?: number): string {
  return LEVEL_COLORS[level ?? 0] ?? FALLBACK_LEVEL_COLOR;
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
