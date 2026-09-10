export type FastingPlan = {
  id: string;
  name: string;
  fastHours: number;
  eatHours: number;
  isPreset: boolean;
  level?: string;
  description?: string;
};

export const PRESET_PLANS: FastingPlan[] = [
  {
    id: 'preset-12-12',
    name: '12:12',
    fastHours: 12,
    eatHours: 12,
    isPreset: true,
    level: 'Beginner',
    description: 'A gentle start. Eat within a 12-hour window and fast overnight. An easy way to build the habit.',
  },
  {
    id: 'preset-14-10',
    name: '14:10',
    fastHours: 14,
    eatHours: 10,
    isPreset: true,
    level: 'Beginner+',
    description: 'The most common starting plan. A 14-hour fast with a comfortable 10-hour eating window.',
  },
  {
    id: 'preset-16-8',
    name: '16:8',
    fastHours: 16,
    eatHours: 8,
    isPreset: true,
    level: 'Intermediate',
    description: 'The classic. Skip breakfast or dinner and eat within an 8-hour window.',
  },
  {
    id: 'preset-18-6',
    name: '18:6',
    fastHours: 18,
    eatHours: 6,
    isPreset: true,
    level: 'Advanced',
    description: 'A tighter 6-hour eating window with an 18-hour fast. Best after a few weeks of 16:8.',
  },
  {
    id: 'preset-20-4',
    name: '20:4',
    fastHours: 20,
    eatHours: 4,
    isPreset: true,
    level: 'Expert',
    description: 'The "warrior" schedule. One or two meals inside a 4-hour window.',
  },
  {
    id: 'preset-23-1',
    name: 'OMAD 23:1',
    fastHours: 23,
    eatHours: 1,
    isPreset: true,
    level: 'Master',
    description: 'One meal a day. Make sure that meal is balanced. Not recommended as a daily routine for beginners.',
  },
];

export function planLabel(fastHours: number, eatHours: number): string {
  const f = Number.isInteger(fastHours) ? fastHours : fastHours.toFixed(1);
  const e = Number.isInteger(eatHours) ? eatHours : eatHours.toFixed(1);
  return `${f}:${e}`;
}

export function customPlan(name: string, fastHours: number): FastingPlan {
  const clamped = Math.min(36, Math.max(1, fastHours));
  return {
    id: `custom-${Date.now()}`,
    name,
    fastHours: clamped,
    eatHours: 24 - clamped,
    isPreset: false,
    description: 'Custom plan',
  };
}
