import { describe, expect, it } from '@jest/globals';
import { bmi, checkAge, checkGoalWeight, checkRapidLoss, healthyMinWeightKg } from '../safety';

describe('safety checks', () => {
  it('computes BMI correctly', () => {
    expect(bmi(70, 175)).toBeCloseTo(22.86, 1);
    expect(bmi(0, 175)).toBeNull();
    expect(bmi(70, 0)).toBeNull();
  });

  it('blocks users under 18 with a supportive message', () => {
    const c = checkAge(16);
    expect(c.ok).toBe(false);
    expect(c.supportive).toBe(true);
    expect(c.message.toLowerCase()).toContain('doctor');
  });

  it('allows adults', () => {
    expect(checkAge(30).ok).toBe(true);
    expect(checkAge(17).ok).toBe(false);
  });

  it('rejects goal weights below the healthy BMI floor', () => {
    const floor = healthyMinWeightKg(175);
    const c = checkGoalWeight((floor ?? 60) - 10, 175, 80);
    expect(c.ok).toBe(false);
    expect(c.supportive).toBe(true);
    expect(c.message).toContain('healthy weight');
  });

  it('accepts goal weights at or above the floor', () => {
    const floor = healthyMinWeightKg(175) ?? 60;
    expect(checkGoalWeight(floor, 175, 80).ok).toBe(true);
    expect(checkGoalWeight(floor + 5, 175, 80).ok).toBe(true);
  });

  it('rejects weight loss for underweight users', () => {
    const c = checkGoalWeight(60, 175, 50);
    expect(c.ok).toBe(false);
  });

  it('flags rapid loss above 1.5 kg per week', () => {
    expect(checkRapidLoss(80, 76, 21)).toBeNull();
    expect(checkRapidLoss(80, 75, 14)).toContain('quickly');
    expect(checkRapidLoss(80, 75, 7)).toContain('quickly');
    expect(checkRapidLoss(0, 70, 7)).toBeNull();
  });
});

