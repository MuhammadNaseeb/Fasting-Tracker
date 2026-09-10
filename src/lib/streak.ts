import { DAY, daysBetween, localDayKey, startOfLocalDay } from './time';

export type SessionRow = {
  started_at_utc: number;
  planned_end_at_utc: number;
  ended_at_utc: number | null;
  status: 'active' | 'completed' | 'ended_early' | 'abandoned';
  deleted_at: number | null;
};

const COMPLETION_THRESHOLD = 0.8;

export function qualifiesForStreak(s: SessionRow): boolean {
  if (s.deleted_at !== null) return false;
  if (s.status === 'active') return false;
  if (s.status === 'completed') return true;
  if (s.ended_at_utc === null) return false;
  const actual = s.ended_at_utc - s.started_at_utc;
  const planned = s.planned_end_at_utc - s.started_at_utc;
  return planned > 0 && actual / planned >= COMPLETION_THRESHOLD;
}

export function computeStreak(sessions: SessionRow[], nowTs: number): { current: number; longest: number } {
  const qualifyingDays = new Set<string>();
  for (const s of sessions) {
    if (!qualifiesForStreak(s) || s.ended_at_utc === null) continue;
    qualifyingDays.add(localDayKey(s.ended_at_utc));
  }
  if (qualifyingDays.size === 0) return { current: 0, longest: 0 };

  const sortedDays = [...qualifyingDays]
    .map((k) => startOfLocalDay(new Date(k + 'T00:00:00').getTime()))
    .sort((a, b) => a - b);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] - sortedDays[i - 1] === DAY) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  const today = startOfLocalDay(nowTs);
  const todayKey = localDayKey(nowTs);
  let current = 0;
  if (qualifyingDays.has(todayKey)) {
    current = 1;
    let cursor = today;
    while (qualifyingDays.has(localDayKey(cursor - DAY))) {
      current += 1;
      cursor -= DAY;
    }
  } else {
    let cursor = today - DAY;
    if (qualifyingDays.has(localDayKey(cursor))) {
      current = 1;
      while (qualifyingDays.has(localDayKey(cursor - DAY))) {
        current += 1;
        cursor -= DAY;
      }
    }
  }

  return { current, longest: Math.max(longest, current) };
}

export function statsFromSessions(sessions: SessionRow[]) {
  let total = 0;
  let totalMs = 0;
  let completed = 0;
  let endedEarly = 0;
  for (const s of sessions) {
    if (s.deleted_at !== null || s.status === 'active') continue;
    total += 1;
    const end = s.ended_at_utc ?? s.planned_end_at_utc;
    totalMs += Math.max(0, end - s.started_at_utc);
    if (s.status === 'completed') completed += 1;
    else endedEarly += 1;
  }
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, totalHours: totalMs / 3_600_000, completed, endedEarly, completionRate };
}

export function hoursLast7Days(sessions: SessionRow[], nowTs: number): number {
  const cutoff = nowTs - 7 * DAY;
  let ms = 0;
  for (const s of sessions) {
    if (s.deleted_at !== null || s.status === 'active') continue;
    const end = s.ended_at_utc ?? s.planned_end_at_utc;
    if (end < cutoff) continue;
    ms += Math.max(0, end - s.started_at_utc);
  }
  return ms / 3_600_000;
}

export function computeWeekdaysCount(nowTs: number, firstSessionTs: number | null): number {
  if (firstSessionTs === null) return 0;
  return Math.max(1, daysBetween(firstSessionTs, nowTs) + 1);
}
