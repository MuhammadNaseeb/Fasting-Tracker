import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SessionRowFull, WeightRow, WaterRow } from '@/lib/db';

function csvEscape(v: string | number | null): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(header: string[], rows: (string | number | null)[][]): string {
  const lines = [header.join(',')];
  for (const row of rows) lines.push(row.map(csvEscape).join(','));
  return lines.join('\n');
}

export async function buildAndShareCsv(
  sessions: SessionRowFull[],
  weights: WeightRow[],
  water: WaterRow[]
): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;

  const sessionsCsv = toCsv(
    ['id', 'plan', 'started_at_utc', 'planned_end_at_utc', 'ended_at_utc', 'duration_hours', 'status', 'mood', 'timezone'],
    sessions.map((s) => [
      s.id,
      s.plan_name,
      new Date(s.started_at_utc).toISOString(),
      new Date(s.planned_end_at_utc).toISOString(),
      s.ended_at_utc !== null ? new Date(s.ended_at_utc).toISOString() : null,
      s.ended_at_utc !== null
        ? ((s.ended_at_utc - s.started_at_utc) / 3_600_000).toFixed(2)
        : ((s.planned_end_at_utc - s.started_at_utc) / 3_600_000).toFixed(2),
      s.status,
      s.mood_rating,
      s.timezone_at_start,
    ])
  );

  const weightsCsv = toCsv(
    ['recorded_at_utc', 'weight_kg', 'source'],
    weights.map((w) => [new Date(w.recorded_at).toISOString(), w.weight_kg, w.source])
  );

  const waterCsv = toCsv(
    ['recorded_at_utc', 'volume_ml'],
    water.map((w) => [new Date(w.recorded_at).toISOString(), w.volume_ml])
  );

  const all = [
    'FASTING SESSIONS',
    sessionsCsv,
    '',
    'WEIGHT ENTRIES',
    weightsCsv,
    '',
    'WATER ENTRIES',
    waterCsv,
  ].join('\n');

  const name = `fasting-tracker-export-${new Date().toISOString().slice(0, 10)}.csv`;
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(all);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: name });
  return true;
}
