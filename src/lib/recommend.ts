export type Goal = 'lose_weight' | 'maintain' | 'energy' | 'habit';
export type Experience = 'never' | 'tried' | 'experienced';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active';
export type Sex = 'male' | 'female' | 'other';

export type OnboardingAnswers = {
  goal: Goal;
  sex: Sex;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg: number;
  activity: Activity;
  experience: Experience;
  wakeTime: string;
  sleepTime: string;
  firstMealTime: string;
  lastMealTime: string;
  pregnantOrNursing: boolean;
};

export type Recommendation = {
  planId: string;
  planName: string;
  fastHours: number;
  eatHours: number;
  startMinutes: number;
  rationale: string;
  restricted: boolean;
};

export function recommendPlan(a: OnboardingAnswers): Recommendation {
  let fastHours = 12;
  const reasons: string[] = [];

  if (a.experience === 'experienced') {
    fastHours = 16;
    reasons.push('you have fasting experience');
  } else if (a.experience === 'tried') {
    fastHours = 14;
    reasons.push('you have tried fasting before');
  } else {
    reasons.push('this is your first structured fast');
  }

  if (a.goal === 'lose_weight' && fastHours < 16) {
    fastHours = Math.min(16, fastHours + 2);
    reasons.push('your goal is weight loss');
  } else if (a.goal === 'energy' && fastHours < 14) {
    fastHours = 14;
    reasons.push('you want steadier energy');
  }

  if (a.age >= 60) {
    fastHours = Math.max(12, fastHours - 2);
    reasons.push('a gentler window suits your age group');
  }

  const heightM = a.heightCm / 100;
  const userBmi = heightM > 0 ? a.currentWeightKg / (heightM * heightM) : 25;
  let restricted = false;
  if (userBmi < 18.5 || a.pregnantOrNursing) {
    fastHours = 12;
    restricted = true;
    reasons.push('a gentle 12-hour overnight fast is the safe choice for you');
  }

  if (a.activity === 'active' && fastHours > 16) {
    fastHours = 16;
    reasons.push('you train actively and need a realistic eating window');
  }

  fastHours = Math.max(12, Math.min(16, fastHours));
  const eatHours = 24 - fastHours;
  const startMinutes = parseMinutes(a.lastMealTime);

  const preset = findClosestPreset(fastHours);
  return {
    planId: preset.id,
    planName: preset.name,
    fastHours: preset.fastHours,
    eatHours: preset.eatHours,
    startMinutes,
    rationale: buildRationale(reasons),
    restricted,
  };
}

function findClosestPreset(fastHours: number) {
  const presets = [
    { id: 'preset-12-12', name: '12:12', fastHours: 12, eatHours: 12 },
    { id: 'preset-14-10', name: '14:10', fastHours: 14, eatHours: 10 },
    { id: 'preset-16-8', name: '16:8', fastHours: 16, eatHours: 8 },
  ];
  return presets.reduce((best, p) =>
    Math.abs(p.fastHours - fastHours) < Math.abs(best.fastHours - fastHours) ? p : best
  );
}

function buildRationale(reasons: string[]): string {
  if (reasons.length === 0) {
    return 'a balanced starting point for most people';
  }
  const quoted = reasons.map((r) => `because ${r}`).join(', ');
  return quoted;
}

function parseMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10) || 0);
  return h * 60 + m;
}
