import { describe, expect, it } from '@jest/globals';
import { recommendPlan, OnboardingAnswers } from '../recommend';
import { PRESET_PLANS } from '../plans';

const base: OnboardingAnswers = {
  goal: 'habit',
  sex: 'female',
  age: 32,
  heightCm: 165,
  currentWeightKg: 75,
  targetWeightKg: 65,
  activity: 'light',
  experience: 'never',
  wakeTime: '07:00',
  sleepTime: '23:00',
  firstMealTime: '08:00',
  lastMealTime: '20:00',
  pregnantOrNursing: false,
};

describe('recommendPlan', () => {
  it('recommends 12:12 for a first-timer', () => {
    const r = recommendPlan(base);
    expect(r.fastHours).toBe(12);
    expect(r.planId).toBe('preset-12-12');
    expect(r.eatHours).toBe(12);
  });

  it('recommends 14:10 for a first-timer with a weight-loss goal', () => {
    const r = recommendPlan({ ...base, goal: 'lose_weight' });
    expect(r.fastHours).toBe(14);
    expect(r.planId).toBe('preset-14-10');
  });

  it('caps a weight-loss beginner with experience at 16:8', () => {
    const r = recommendPlan({ ...base, goal: 'lose_weight', experience: 'tried' });
    expect(r.fastHours).toBe(16);
    expect(r.planId).toBe('preset-16-8');
  });

  it('recommends 16:8 for an experienced faster regardless of goal', () => {
    const r = recommendPlan({ ...base, experience: 'experienced', goal: 'energy' });
    expect(r.fastHours).toBe(16);
  });

  it('softens the window for users 60+ even with experience', () => {
    const r = recommendPlan({ ...base, age: 65, experience: 'experienced' });
    expect(r.fastHours).toBe(14);
    expect(r.planId).toBe('preset-14-10');
  });

  it('restricts to 12:12 when BMI is below 18.5', () => {
    const r = recommendPlan({ ...base, heightCm: 175, currentWeightKg: 52, experience: 'experienced' });
    expect(r.restricted).toBe(true);
    expect(r.fastHours).toBe(12);
  });

  it('restricts to 12:12 when pregnant or nursing', () => {
    const r = recommendPlan({ ...base, pregnantOrNursing: true, experience: 'experienced' });
    expect(r.restricted).toBe(true);
    expect(r.fastHours).toBe(12);
  });

  it('caps very active users at 16 hours', () => {
    const r = recommendPlan({ ...base, activity: 'active', experience: 'experienced', goal: 'lose_weight' });
    expect(r.fastHours).toBeLessThanOrEqual(16);
  });

  it('starts the fast at the last meal time', () => {
    const r = recommendPlan({ ...base, lastMealTime: '21:30' });
    expect(r.startMinutes).toBe(21 * 60 + 30);
  });

  it('always returns a plan that exists among presets', () => {
    for (const experience of ['never', 'tried', 'experienced'] as const) {
      for (const goal of ['lose_weight', 'maintain', 'energy', 'habit'] as const) {
        const r = recommendPlan({ ...base, experience, goal });
        expect(PRESET_PLANS.some((p) => p.id === r.planId)).toBe(true);
      }
    }
  });
});

