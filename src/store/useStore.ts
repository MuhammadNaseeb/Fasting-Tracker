import { create } from 'zustand';
import {
  getAllSettings,
  setSetting,
  insertSession,
  updateActiveSession,
  softDeleteSession,
  getActiveSession,
  getRecentSessions,
  getAllWeights,
  insertWeight,
  softDeleteWeight,
  getWaterForRange,
  insertWater,
  softDeleteWater,
  getCustomPlans,
  insertCustomPlan,
  softDeleteCustomPlan,
  wipeAllData,
  SessionRowFull,
  WeightRow,
  WaterRow,
} from '@/lib/db';
import { FastingPlan, PRESET_PLANS, planLabel } from '@/lib/plans';
import {
  DEFAULT_PREFS,
  NotificationPrefs,
  scheduleFastNotifications,
  cancelFastNotifications,
  rescheduleReminders,
  setupChannels,
} from '@/lib/notifications';
import { localDayKey, localTimezone, startOfLocalDay } from '@/lib/time';
import type { OnboardingAnswers } from '@/lib/recommend';

export type UnitSystem = 'metric' | 'imperial';
export type ThemeMode = 'system' | 'light' | 'dark';

export type Settings = {
  onboarded: boolean;
  unit: UnitSystem;
  themeMode: ThemeMode;
  goalWeightKg: number | null;
  heightCm: number | null;
  waterGoalMl: number;
  cupSizeMl: number;
  wakeTime: string;
  sleepTime: string;
  notif: NotificationPrefs;
  activePlanId: string;
  premium: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  unit: 'metric',
  themeMode: 'light',
  goalWeightKg: null,
  heightCm: null,
  waterGoalMl: 2000,
  cupSizeMl: 250,
  wakeTime: '07:00',
  sleepTime: '23:00',
  notif: { ...DEFAULT_PREFS },
  activePlanId: 'preset-14-10',
  premium: false,
};

type StoreState = {
  ready: boolean;
  settings: Settings;
  plans: FastingPlan[];
  activeSession: SessionRowFull | null;
  recentSessions: SessionRowFull[];
  weights: WeightRow[];
  waterToday: WaterRow[];
  waterDayKey: string;
  celebration: SessionRowFull | null;
  init: () => Promise<void>;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  updateNotif: (partial: Partial<NotificationPrefs>) => Promise<void>;
  completeOnboarding: (answers: OnboardingAnswers, planId: string, goalWeightKg: number | null, heightCm: number) => Promise<void>;
  startFast: (planId: string) => Promise<void>;
  endFast: (status: 'completed' | 'ended_early', mood?: number | null, note?: string | null) => Promise<SessionRowFull | null>;
  discardActiveFast: () => Promise<void>;
  editActiveFast: (startedAtUtc: number, plannedEndAtUtc: number) => Promise<void>;
  logPastFast: (startedAtUtc: number, endedAtUtc: number, planId: string | null, planName: string) => Promise<void>;
  addWeight: (kg: number, recordedAt: number) => Promise<void>;
  deleteWeight: (id: string) => Promise<void>;
  addWater: (ml: number) => Promise<void>;
  deleteWater: (id: string) => Promise<void>;
  refreshWaterToday: () => Promise<void>;
  activatePlan: (planId: string) => Promise<void>;
  addCustomPlan: (name: string, fastHours: number) => Promise<string>;
  deleteCustomPlan: (planId: string) => Promise<void>;
  clearCelebration: () => void;
  rateCelebration: (mood: number) => Promise<void>;
  wipeEverything: () => Promise<void>;
  getPlan: (planId: string) => FastingPlan | null;
};

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useStore = create<StoreState>((set, get) => ({
  ready: false,
  settings: { ...DEFAULT_SETTINGS },
  plans: [...PRESET_PLANS],
  activeSession: null,
  recentSessions: [],
  weights: [],
  waterToday: [],
  waterDayKey: localDayKey(Date.now()),
  celebration: null,

  async init() {
    const raw = await getAllSettings();
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      onboarded: raw['onboarded'] === '1',
      unit: (raw['unit'] as UnitSystem) || DEFAULT_SETTINGS.unit,
      themeMode: (raw['theme'] as ThemeMode) || DEFAULT_SETTINGS.themeMode,
      goalWeightKg: raw['goalWeightKg'] ? Number(raw['goalWeightKg']) : null,
      heightCm: raw['heightCm'] ? Number(raw['heightCm']) : null,
      waterGoalMl: raw['waterGoal'] ? Number(raw['waterGoal']) : DEFAULT_SETTINGS.waterGoalMl,
      cupSizeMl: raw['cupSize'] ? Number(raw['cupSize']) : DEFAULT_SETTINGS.cupSizeMl,
      wakeTime: raw['wake'] || DEFAULT_SETTINGS.wakeTime,
      sleepTime: raw['sleep'] || DEFAULT_SETTINGS.sleepTime,
      notif: raw['notif'] ? { ...DEFAULT_PREFS, ...JSON.parse(raw['notif']) } : { ...DEFAULT_PREFS },
      activePlanId: raw['activePlan'] || DEFAULT_SETTINGS.activePlanId,
      premium: raw['premium'] === '1',
    };

    const customRows = await getCustomPlans();
    const customPlans: FastingPlan[] = customRows.map((r) => ({
      id: r.id,
      name: r.name,
      fastHours: r.fast_hours,
      eatHours: r.eat_hours,
      isPreset: false,
      description: 'Custom plan',
    }));

    const active = await getActiveSession();
    const recent = await getRecentSessions(60);
    const weights = await getAllWeights();

    await setupChannels();
    await rescheduleReminders(settings.notif, wakeMinutes(settings.wakeTime), sleepMinutes(settings.sleepTime));
    if (active) {
      await scheduleFastNotifications({
        sessionId: active.id,
        startedAtUtc: active.started_at_utc,
        plannedEndAtUtc: active.planned_end_at_utc,
        prefs: settings.notif,
      });
    }

    set({
      ready: true,
      settings,
      plans: [...PRESET_PLANS, ...customPlans],
      activeSession: active,
      recentSessions: recent,
      weights,
      waterDayKey: localDayKey(Date.now()),
    });
    await get().refreshWaterToday();
  },

  async updateSettings(partial) {
    const next = { ...get().settings, ...partial };
    set({ settings: next });
    await persistSettings(next);
    await rescheduleReminders(next.notif, wakeMinutes(next.wakeTime), sleepMinutes(next.sleepTime));
  },

  async updateNotif(partial) {
    const notif = { ...get().settings.notif, ...partial };
    await get().updateSettings({ notif });
  },

  async completeOnboarding(answers, planId, goalWeightKg, heightCm) {
    await get().updateSettings({
      onboarded: true,
      activePlanId: planId,
      goalWeightKg,
      heightCm,
      wakeTime: answers.wakeTime,
      sleepTime: answers.sleepTime,
      unit: 'metric',
    });
  },

  async startFast(planId) {
    if (get().activeSession) return;
    const plan = get().getPlan(planId) ?? PRESET_PLANS[1];
    const startedAt = Date.now();
    const plannedEnd = startedAt + plan.fastHours * 3_600_000;
    const id = uid();
    const session: SessionRowFull = {
      id,
      plan_id: plan.id,
      plan_name: plan.name,
      started_at_utc: startedAt,
      planned_end_at_utc: plannedEnd,
      ended_at_utc: null,
      status: 'active',
      timezone_at_start: localTimezone(),
      mood_rating: null,
      note: null,
      created_via: 'manual',
      created_at: startedAt,
      updated_at: startedAt,
      deleted_at: null,
    };
    await insertSession({
      id,
      plan_id: plan.id,
      plan_name: plan.name,
      started_at_utc: startedAt,
      planned_end_at_utc: plannedEnd,
      ended_at_utc: null,
      status: 'active',
      timezone_at_start: localTimezone(),
      mood_rating: null,
      note: null,
      created_via: 'manual',
    });
    set({ activeSession: session, recentSessions: [session, ...get().recentSessions] });
    await scheduleFastNotifications({
      sessionId: id,
      startedAtUtc: startedAt,
      plannedEndAtUtc: plannedEnd,
      prefs: get().settings.notif,
    });
  },

  async endFast(status, mood = null, note = null) {
    const active = get().activeSession;
    if (!active) return null;
    const endedAt = Date.now();
    const finalStatus = endedAt >= active.planned_end_at_utc ? 'completed' : status;
    await updateActiveSession(active.id, {
      ended_at_utc: endedAt,
      status: finalStatus,
      mood_rating: mood ?? undefined,
      note: note ?? undefined,
    });
    await cancelFastNotifications(active.id);
    const finished: SessionRowFull = {
      ...active,
      ended_at_utc: endedAt,
      status: finalStatus,
      mood_rating: mood ?? null,
      note: note ?? null,
    };
    const recent = get().recentSessions.map((s) => (s.id === active.id ? finished : s));
    set({ activeSession: null, recentSessions: recent, celebration: finished });
    return finished;
  },

  async discardActiveFast() {
    const active = get().activeSession;
    if (!active) return;
    await softDeleteSession(active.id);
    await cancelFastNotifications(active.id);
    set({
      activeSession: null,
      recentSessions: get().recentSessions.filter((s) => s.id !== active.id),
    });
  },

  async editActiveFast(startedAtUtc, plannedEndAtUtc) {
    const active = get().activeSession;
    if (!active) return;
    await updateActiveSession(active.id, { started_at_utc: startedAtUtc, planned_end_at_utc: plannedEndAtUtc });
    const updated: SessionRowFull = { ...active, started_at_utc: startedAtUtc, planned_end_at_utc: plannedEndAtUtc };
    set({
      activeSession: updated,
      recentSessions: get().recentSessions.map((s) => (s.id === active.id ? updated : s)),
    });
    await scheduleFastNotifications({
      sessionId: active.id,
      startedAtUtc,
      plannedEndAtUtc,
      prefs: get().settings.notif,
    });
  },

  async logPastFast(startedAtUtc, endedAtUtc, planId, planName) {
    const id = uid();
    await insertSession({
      id,
      plan_id: planId,
      plan_name: planName,
      started_at_utc: startedAtUtc,
      planned_end_at_utc: endedAtUtc,
      ended_at_utc: endedAtUtc,
      status: 'completed',
      timezone_at_start: localTimezone(),
      mood_rating: null,
      note: null,
      created_via: 'retroactive',
    });
    const row = await getFirstSession(id);
    if (row) {
      set({ recentSessions: [row, ...get().recentSessions] });
    }
  },

  async addWeight(kg, recordedAt) {
    await insertWeight(uid(), recordedAt, kg);
    set({ weights: await getAllWeights() });
  },

  async deleteWeight(id) {
    await softDeleteWeight(id);
    set({ weights: get().weights.filter((w) => w.id !== id) });
  },

  async addWater(ml) {
    await insertWater(uid(), Date.now(), ml);
    await get().refreshWaterToday();
  },

  async deleteWater(id) {
    await softDeleteWater(id);
    await get().refreshWaterToday();
  },

  async refreshWaterToday() {
    const dayStart = startOfLocalDay(Date.now());
    const rows = await getWaterForRange(dayStart, dayStart + 86_400_000);
    set({ waterToday: rows, waterDayKey: localDayKey(Date.now()) });
  },

  async activatePlan(planId) {
    await get().updateSettings({ activePlanId: planId });
  },

  async addCustomPlan(name, fastHours) {
    const id = `custom-${uid()}`;
    await insertCustomPlan(id, name, fastHours, 24 - fastHours);
    const rows = await getCustomPlans();
    const customPlans: FastingPlan[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      fastHours: r.fast_hours,
      eatHours: r.eat_hours,
      isPreset: false,
      description: 'Custom plan',
    }));
    set({ plans: [...PRESET_PLANS, ...customPlans] });
    return id;
  },

  async deleteCustomPlan(planId) {
    await softDeleteCustomPlan(planId);
    const rows = await getCustomPlans();
    const customPlans: FastingPlan[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      fastHours: r.fast_hours,
      eatHours: r.eat_hours,
      isPreset: false,
      description: 'Custom plan',
    }));
    const settings = get().settings;
    const nextActive = settings.activePlanId === planId ? 'preset-14-10' : settings.activePlanId;
    set({ plans: [...PRESET_PLANS, ...customPlans], settings: { ...settings, activePlanId: nextActive } });
    await persistSettings({ ...get().settings, activePlanId: nextActive });
  },

  clearCelebration() {
    set({ celebration: null });
  },

  async rateCelebration(mood) {
    const c = get().celebration;
    if (!c) return;
    await updateActiveSession(c.id, { mood_rating: mood });
    set({
      celebration: { ...c, mood_rating: mood },
      recentSessions: get().recentSessions.map((s) => (s.id === c.id ? { ...s, mood_rating: mood } : s)),
    });
  },

  async wipeEverything() {
    const { cancelWaterReminders, cancelWeighInReminder, cancelWeeklySummary } = await import('@/lib/notifications');
    await cancelWaterReminders();
    await cancelWeighInReminder();
    await cancelWeeklySummary();
    const active = get().activeSession;
    if (active) await cancelFastNotifications(active.id);
    await wipeAllData();
    set({
      settings: { ...DEFAULT_SETTINGS },
      plans: [...PRESET_PLANS],
      activeSession: null,
      recentSessions: [],
      weights: [],
      waterToday: [],
      celebration: null,
    });
  },

  getPlan(planId) {
    return get().plans.find((p) => p.id === planId) ?? null;
  },
}));

async function persistSettings(s: Settings): Promise<void> {
  await setSetting('onboarded', s.onboarded ? '1' : '0');
  await setSetting('unit', s.unit);
  await setSetting('theme', s.themeMode);
  await setSetting('goalWeightKg', s.goalWeightKg === null ? '' : String(s.goalWeightKg));
  await setSetting('heightCm', s.heightCm === null ? '' : String(s.heightCm));
  await setSetting('waterGoal', String(s.waterGoalMl));
  await setSetting('cupSize', String(s.cupSizeMl));
  await setSetting('wake', s.wakeTime);
  await setSetting('sleep', s.sleepTime);
  await setSetting('notif', JSON.stringify(s.notif));
  await setSetting('activePlan', s.activePlanId);
  await setSetting('premium', s.premium ? '1' : '0');
}

async function getFirstSession(id: string): Promise<SessionRowFull | null> {
  const sessions = await getRecentSessions(1);
  return sessions.find((s) => s.id === id) ?? sessions[0] ?? null;
}

function wakeMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10) || 0);
  return h * 60 + m;
}

function sleepMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10) || 0);
  return h * 60 + m;
}

export function planDisplayName(plan: FastingPlan): string {
  return `${plan.name} · ${planLabel(plan.fastHours, plan.eatHours)}`;
}
