export const CHANNEL_FASTING = 'fasting';
export const CHANNEL_REMINDERS = 'reminders';
export const CHANNEL_WATER = 'water';

export type NotificationPrefs = {
  windowClosed: boolean;
  preEnd15: boolean;
  preEnd30: boolean;
  preEnd60: boolean;
  fastEnd: boolean;
  water: boolean;
  weighIn: boolean;
  weeklySummary: boolean;
};

export const DEFAULT_PREFS: NotificationPrefs = {
  windowClosed: true,
  preEnd15: true,
  preEnd30: false,
  preEnd60: false,
  fastEnd: true,
  water: false,
  weighIn: false,
  weeklySummary: false,
};

export type FastScheduleInput = {
  sessionId: string;
  startedAtUtc: number;
  plannedEndAtUtc: number;
  prefs: NotificationPrefs;
};

export function notificationsAvailable(): boolean {
  return false;
}

export function notificationsUnavailableReason(): string | null {
  return 'Reminders are not included in this build of the app. The timer, logging and stats all work without them — the in-app dial is always accurate.';
}

export async function setupChannels(): Promise<void> {}

export async function ensurePermissions(): Promise<boolean> {
  return false;
}

export async function permissionStatus(): Promise<boolean> {
  return false;
}

export async function scheduleFastNotifications(_input: FastScheduleInput): Promise<void> {}

export async function cancelFastNotifications(_sessionId: string): Promise<void> {}

export async function scheduleWaterReminders(_wakeMinutes: number, _sleepMinutes: number): Promise<void> {}

export async function cancelWaterReminders(): Promise<void> {}

export const WEIGH_IN_ID = 'weigh-in-daily';

export async function scheduleWeighInReminder(_hour: number, _minute: number): Promise<void> {}

export async function cancelWeighInReminder(): Promise<void> {}

export const WEEKLY_SUMMARY_ID = 'weekly-summary';

export async function scheduleWeeklySummary(_weekday: number, _hour: number, _minute: number): Promise<void> {}

export async function cancelWeeklySummary(): Promise<void> {}

export async function rescheduleReminders(
  _prefs: NotificationPrefs,
  _wakeMinutes: number,
  _sleepMinutes: number
): Promise<void> {}

export function minutesFromNow(ts: number): number {
  return Math.max(0, Math.round((ts - Date.now()) / 60_000));
}

export function hoursFromNow(ts: number): number {
  return Math.max(0, (ts - Date.now()) / 3_600_000);
}
