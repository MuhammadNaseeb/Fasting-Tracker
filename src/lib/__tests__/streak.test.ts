import { describe, expect, it } from '@jest/globals';
import { computeStreak, qualifiesForStreak, SessionRow, statsFromSessions } from '../streak';
import { DAY, localDayKey } from '../time';

function session(overrides: Partial<SessionRow> = {}): SessionRow {
  const started = Date.now() - 14 * 3_600_000;
  return {
    started_at_utc: started,
    planned_end_at_utc: started + 16 * 3_600_000,
    ended_at_utc: started + 16 * 3_600_000,
    status: 'completed',
    deleted_at: null,
    ...overrides,
  };
}

function daysAgo(n: number): number {
  const d = new Date();
  d.setHours(20, 0, 0, 0);
  return d.getTime() - n * DAY;
}

function endedDaysAgo(n: number, overrides: Partial<SessionRow> = {}): SessionRow {
  const ended = daysAgo(n);
  return session({ started_at_utc: ended - 16 * 3_600_000, ended_at_utc: ended, ...overrides });
}

describe('qualifiesForStreak', () => {
  it('counts completed sessions', () => {
    expect(qualifiesForStreak(session())).toBe(true);
  });

  it('counts early endings at 80 percent or more of the window', () => {
    const s = session({ status: 'ended_early', ended_at_utc: session().started_at_utc + 13 * 3_600_000 });
    expect(qualifiesForStreak(s)).toBe(true);
    const tooShort = session({ status: 'ended_early', ended_at_utc: session().started_at_utc + 10 * 3_600_000 });
    expect(qualifiesForStreak(tooShort)).toBe(false);
  });

  it('ignores active and deleted sessions', () => {
    expect(qualifiesForStreak(session({ status: 'active', ended_at_utc: null }))).toBe(false);
    expect(qualifiesForStreak(session({ deleted_at: 1 }))).toBe(false);
  });
});

describe('computeStreak', () => {
  it('returns zero for empty history', () => {
    expect(computeStreak([], Date.now())).toEqual({ current: 0, longest: 0 });
  });

  it('counts consecutive days ending today and yesterday', () => {
    const s1 = endedDaysAgo(0);
    const s2 = endedDaysAgo(1);
    const s3 = endedDaysAgo(2);
    const r = computeStreak([s1, s2, s3], Date.now());
    expect(r.current).toBe(3);
    expect(r.longest).toBe(3);
  });

  it('keeps the streak alive if yesterday qualified but today has not yet', () => {
    const r = computeStreak([endedDaysAgo(1), endedDaysAgo(2)], Date.now());
    expect(r.current).toBe(2);
  });

  it('breaks the streak on a missed day', () => {
    const r = computeStreak([endedDaysAgo(0), endedDaysAgo(2)], Date.now());
    expect(r.current).toBe(1);
  });

  it('finds the longest run even when it is in the past', () => {
    const sessions = [endedDaysAgo(0), endedDaysAgo(5), endedDaysAgo(6), endedDaysAgo(7)];
    const r = computeStreak(sessions, Date.now());
    expect(r.longest).toBe(3);
    expect(r.current).toBe(1);
  });
});

describe('statsFromSessions', () => {
  it('computes totals and completion rate', () => {
    const started = 1_000_000;
    const sessions: SessionRow[] = [
      session({ started_at_utc: started, ended_at_utc: started + 16 * 3_600_000, status: 'completed' }),
      session({
        started_at_utc: started * 2,
        planned_end_at_utc: started * 2 + 10 * 3_600_000,
        ended_at_utc: started * 2 + 5 * 3_600_000,
        status: 'ended_early',
      }),
      session({ status: 'active', started_at_utc: started * 3, ended_at_utc: null }),
    ];
    const s = statsFromSessions(sessions);
    expect(s.total).toBe(2);
    expect(s.completed).toBe(1);
    expect(s.completionRate).toBe(50);
    expect(s.totalHours).toBeCloseTo(21, 0);
  });
});

describe('day keys', () => {
  it('groups sessions by local calendar day', () => {
    const ts = daysAgo(0);
    expect(localDayKey(ts)).toBe(localDayKey(ts + 3_600_000));
  });
});

