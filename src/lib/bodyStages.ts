export type BodyStage = {
  id: string;
  startHour: number;
  endHour: number;
  title: string;
  short: string;
  body: string;
};

export const BODY_STAGES: BodyStage[] = [
  {
    id: 'digesting',
    startHour: 0,
    endHour: 4,
    title: 'Digesting',
    short: 'Absorbing your last meal',
    body: 'Your body is absorbing nutrients from your last meal and insulin is elevated while energy is stored for later use. Hunger now is usually habit, not need.',
  },
  {
    id: 'settling',
    startHour: 4,
    endHour: 8,
    title: 'Blood sugar settling',
    short: 'Insulin begins to decline',
    body: 'Digestion is wrapping up and blood sugar and insulin typically begin to decline. Research suggests your body starts shifting toward stored energy in this window.',
  },
  {
    id: 'glycogen',
    startHour: 8,
    endHour: 12,
    title: 'Glycogen burning',
    short: 'Tapping stored carbohydrate',
    body: 'Your body now relies more heavily on glycogen, its stored carbohydrate. Many people notice hunger waves here. They usually pass within 15–20 minutes.',
  },
  {
    id: 'fatburn',
    startHour: 12,
    endHour: 16,
    title: 'Fat burning',
    short: 'Fat becomes a primary fuel',
    body: 'With glycogen running low, research suggests your body increasingly burns fat for fuel. This is the stage many fasters aim to reach each day.',
  },
  {
    id: 'ketosis',
    startHour: 16,
    endHour: 20,
    title: 'Ketosis begins',
    short: 'Ketone levels rise',
    body: 'Ketone levels may begin to rise as fat becomes a primary fuel source. Some people report steady energy and a quieter appetite around here.',
  },
  {
    id: 'autophagy',
    startHour: 20,
    endHour: 36,
    title: 'Autophagy',
    short: 'Cellular clean-up ramps up',
    body: 'In longer fasts, research suggests cellular "clean-up" processes such as autophagy may ramp up. Longer fasts are not required for benefits, and are best done with professional guidance.',
  },
  {
    id: 'extended',
    startHour: 36,
    endHour: 999,
    title: 'Extended fasting',
    short: 'Check in with yourself',
    body: 'You are in uncommon territory. Extended fasts carry real risks and are not necessary for progress. If you feel unwell, break your fast gently. Talk to a healthcare professional before attempting long fasts.',
  },
];

export function stageForElapsed(elapsedHours: number): BodyStage {
  let current = BODY_STAGES[0];
  for (const stage of BODY_STAGES) {
    if (elapsedHours >= stage.startHour) current = stage;
  }
  return current;
}

export function stageProgress(elapsedHours: number): { stage: BodyStage; withinStage: number } {
  const stage = stageForElapsed(elapsedHours);
  const span = stage.endHour - stage.startHour;
  const withinStage = span >= 900 ? 1 : Math.min(1, Math.max(0, (elapsedHours - stage.startHour) / span));
  return { stage, withinStage };
}

export const BODY_STAGES_DISCLAIMER =
  'These stages are simplified, research-informed descriptions of what is generally understood to happen during fasting. They vary by individual and are not medical advice.';
