export type UnitSystem = 'metric' | 'imperial';

export function kgToLb(kg: number): number {
  return kg * 2.20462262185;
}

export function lbToKg(lb: number): number {
  return lb / 2.20462262185;
}

export function formatWeight(kg: number, unit: UnitSystem, decimals = 1): string {
  if (unit === 'imperial') return `${kgToLb(kg).toFixed(decimals)} lb`;
  return `${kg.toFixed(decimals)} kg`;
}

export function weightStep(unit: UnitSystem): number {
  return unit === 'imperial' ? 0.2 : 0.1;
}

export const CUP_SIZES_ML = [150, 200, 250, 330, 500];

export function formatMl(ml: number): string {
  return `${ml} ml`;
}
