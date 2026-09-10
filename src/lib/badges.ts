export type BadgeDef = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export type BadgeState = BadgeDef & { achieved: boolean; progress: number };

const BADGE_DEFS: (BadgeDef & { metric: 'fasts' | 'hours' | 'streak' | 'lostKg'; target: number })[] = [
  { id: 'first-fast', title: 'First Fast', description: 'Complete your first fast', icon: '🌱', metric: 'fasts', target: 1 },
  { id: 'fasts-7', title: 'Week One', description: 'Complete 7 fasts', icon: '🔥', metric: 'fasts', target: 7 },
  { id: 'fasts-30', title: 'Thirty Strong', description: 'Complete 30 fasts', icon: '🏅', metric: 'fasts', target: 30 },
  { id: 'fasts-100', title: 'Centurion', description: 'Complete 100 fasts', icon: '👑', metric: 'fasts', target: 100 },
  { id: 'hours-24', title: 'A Full Day', description: 'Fast 24 total hours', icon: '⏳', metric: 'hours', target: 24 },
  { id: 'hours-100', title: '100 Hours', description: 'Fast 100 total hours', icon: '💪', metric: 'hours', target: 100 },
  { id: 'hours-500', title: '500 Hours', description: 'Fast 500 total hours', icon: '🦾', metric: 'hours', target: 500 },
  { id: 'streak-3', title: 'Getting Going', description: '3-day streak', icon: '✨', metric: 'streak', target: 3 },
  { id: 'streak-7', title: 'On Fire', description: '7-day streak', icon: '🔥', metric: 'streak', target: 7 },
  { id: 'streak-30', title: 'Unstoppable', description: '30-day streak', icon: '🌟', metric: 'streak', target: 30 },
  { id: 'lost-1', title: 'First Kilo', description: 'Lose 1 kg from your first weigh-in', icon: '🎯', metric: 'lostKg', target: 1 },
  { id: 'lost-5', title: 'Five Down', description: 'Lose 5 kg from your first weigh-in', icon: '🏆', metric: 'lostKg', target: 5 },
  { id: 'lost-10', title: 'New Territory', description: 'Lose 10 kg from your first weigh-in', icon: '🚀', metric: 'lostKg', target: 10 },
];

export function computeBadges(stats: {
  total: number;
  totalHours: number;
  currentStreak: number;
  weightLostKg: number;
}): BadgeState[] {
  const values: Record<string, number> = {
    fasts: stats.total,
    hours: stats.totalHours,
    streak: stats.currentStreak,
    lostKg: stats.weightLostKg,
  };
  return BADGE_DEFS.map((def) => {
    const value = values[def.metric] ?? 0;
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      achieved: value >= def.target,
      progress: Math.min(1, def.target > 0 ? value / def.target : 0),
    };
  });
}

export function nextMilestone(stats: { total: number; totalHours: number; currentStreak: number }): string | null {
  const steps: { label: string; value: number; target: number; unit: string }[] = [
    { label: 'next streak day', value: stats.currentStreak, target: Math.max(3, stats.currentStreak + 1), unit: 'days' },
    { label: 'next fast', value: stats.total, target: stats.total + 1, unit: 'fasts' },
  ];
  const s = steps[0];
  return `Keep going — ${s.target - s.value} more to reach ${s.target} ${s.unit}.`;
}
