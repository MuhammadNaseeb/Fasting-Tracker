export const MIN_BMI = 18.5;

export function bmi(weightKg: number, heightCm: number): number | null {
  if (!weightKg || !heightCm || heightCm < 80 || heightCm > 250) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function healthyMinWeightKg(heightCm: number): number | null {
  if (!heightCm || heightCm < 80) return null;
  const m = heightCm / 100;
  return Math.round(MIN_BMI * m * m * 10) / 10;
}

export type SafetyCheck = {
  ok: boolean;
  supportive: boolean;
  message: string;
};

export function checkAge(age: number): SafetyCheck {
  if (age < 18) {
    return {
      ok: false,
      supportive: true,
      message:
        'Fasting apps are designed for adults. If you are under 18, your body is still developing and restricting eating is generally not recommended without medical supervision. Please talk to a parent, guardian, or doctor first — we need you healthy more than we need you fasting.',
    };
  }
  if (age > 85 || age < 10 || !Number.isFinite(age)) {
    return {
      ok: false,
      supportive: true,
      message: 'Please enter a valid age.',
    };
  }
  return { ok: true, supportive: false, message: '' };
}

export function checkGoalWeight(
  goalKg: number,
  heightCm: number,
  currentKg: number
): SafetyCheck & { floorKg: number | null } {
  const floor = healthyMinWeightKg(heightCm);
  if (floor !== null && goalKg < floor) {
    return {
      ok: false,
      supportive: true,
      floorKg: floor,
      message: `That goal is below what is generally considered a healthy weight for your height (about ${floor} kg). You do not need to go that low for fasting to work. Try a goal of ${floor} kg or above, or continue without a weight goal — the habit itself is the win.`,
    };
  }
  const b = bmi(currentKg, heightCm);
  if (b !== null && b < MIN_BMI) {
    return {
      ok: false,
      supportive: true,
      floorKg: floor,
      message:
        'Your current weight is below the range usually considered healthy for your height. Time-restricted eating for weight loss is not recommended right now. Please speak with a healthcare professional before using this app.',
    };
  }
  return { ok: true, supportive: false, floorKg: floor, message: '' };
}

export function checkRapidLoss(prevKg: number, currKg: number, daysBetween: number): string | null {
  if (prevKg <= 0 || currKg <= 0 || daysBetween <= 0) return null;
  const lostPerWeek = ((prevKg - currKg) / daysBetween) * 7;
  if (lostPerWeek > 1.5) {
    return 'Your weight is dropping quite quickly. That can sometimes be too much of a good thing. If this pace continues, consider easing off and checking in with a healthcare professional. Be kind to your body.';
  }
  return null;
}

export const MEDICAL_DISCLAIMER = `This app is a wellness tool, not a medical device, and it does not provide medical advice.

Time-restricted eating is not suitable for everyone. Talk to a doctor or qualified healthcare professional before starting — especially if you:

• Are pregnant or breastfeeding
• Are under 18
• Have diabetes (type 1 or type 2) or any blood-sugar condition
• Take prescription medication that requires food
• Have a history of eating disorders or disordered eating
• Have a low BMI or any existing medical condition

If fasting makes you feel unwell — dizzy, faint, confused, or unwell in any way — break your fast and seek advice.

The body-stage information in this app is simplified and educational. Research on fasting is ongoing and findings vary between individuals.`;

export const UNDERAGE_TITLE = 'Let’s talk about this first';
export const PREGNANCY_TITLE = 'Please check with your doctor';

export function checkPregnancy(isPregnantOrNursing: boolean): SafetyCheck {
  if (isPregnantOrNursing) {
    return {
      ok: true,
      supportive: true,
      message:
        'Fasting while pregnant or breastfeeding is generally not recommended, as both you and your baby need steady nutrition. If you still want to use the app, we will keep you on the gentlest 12:12 schedule — but please talk to your doctor or midwife first.',
    };
  }
  return { ok: true, supportive: false, message: '' };
}

export const EATING_DISORDER_RESOURCES =
  'If food feels complicated — if fasting becomes a way to hide restriction, or if you feel anxiety, guilt, or loss of control around eating — please reach out. Support exists and it helps:\n\n• NEDA Helpline (US): 1-800-931-2237\n• Beat Eating Disorders (UK): 0808 801 0677\n• Or search "eating disorder helpline" plus your country\n\nA tracker should serve your health. If it stops feeling that way, put it down and talk to someone.';
