import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { formatWeight, UnitSystem } from '@/lib/units';
import { fmtDateShort } from '@/lib/time';
import { useTheme } from './useTheme';

export type ChartPoint = { ts: number; kg: number };

const W = 320;
const H = 160;
const PAD = 8;

export function WeightChart({
  points,
  goalKg,
  unit,
}: {
  points: ChartPoint[];
  goalKg: number | null;
  unit: UnitSystem;
}) {
  const t = useTheme();
  if (points.length === 0) {
    return <Text style={[styles.empty, { color: t.sub }]}>Log your first weigh-in to see your trend.</Text>;
  }

  const sampled = downsample(points, 120);
  const values = sampled.map((p) => p.kg);
  if (goalKg !== null) values.push(goalKg);
  let min = Math.min(...values);
  let max = Math.max(...values);
  const pad = Math.max(0.4, (max - min) * 0.12);
  min -= pad;
  max += pad;
  const span = Math.max(0.001, max - min);

  const x = (i: number) => PAD + (i / Math.max(1, sampled.length - 1)) * (W - PAD * 2);
  const y = (kg: number) => PAD + (1 - (kg - min) / span) * (H - PAD * 2);

  const line = sampled.map((p, i) => `${x(i)},${y(p.kg)}`).join(' ');
  const last = sampled[sampled.length - 1];
  const first = sampled[0];
  const delta = last.kg - first.kg;

  return (
    <View>
      <View style={styles.chartRow}>
        <View style={styles.yLabels}>
          <Text style={[styles.axisText, { color: t.sub }]}>{formatWeight(max, unit, 0)}</Text>
          <Text style={[styles.axisText, { color: t.sub }]}>{formatWeight(min, unit, 0)}</Text>
        </View>
        <Svg width={W - 40} height={H}>
          {goalKg !== null ? (
            <Line
              x1={PAD}
              x2={W - PAD - 40}
              y1={y(goalKg)}
              y2={y(goalKg)}
              stroke={t.mint}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              opacity={0.8}
            />
          ) : null}
          <Polyline points={line} fill="none" stroke={t.purple} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          <Circle cx={x(sampled.length - 1)} cy={y(last.kg)} r={4.5} fill={t.purple} />
        </Svg>
      </View>
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: t.sub }]}>
          {fmtDateShort(first.ts)} → {fmtDateShort(last.ts)}
        </Text>
        <Text style={[styles.footerText, { color: delta <= 0 ? t.mint : t.peach, fontWeight: '700' }]}>
          {delta === 0 ? 'no change' : `${delta > 0 ? '+' : ''}${formatWeight(delta, unit, 1)}`}
        </Text>
      </View>
    </View>
  );
}

function downsample(points: ChartPoint[], maxPoints: number): ChartPoint[] {
  if (points.length <= maxPoints) return points;
  const step = points.length / maxPoints;
  const out: ChartPoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(points[Math.floor(i * step)]);
  }
  out.push(points[points.length - 1]);
  return out;
}

const styles = StyleSheet.create({
  empty: { fontSize: 13, textAlign: 'center', paddingVertical: 24 },
  chartRow: { flexDirection: 'row' },
  yLabels: { justifyContent: 'space-between', paddingVertical: PAD, marginRight: 4 },
  axisText: { fontSize: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  footerText: { fontSize: 12 },
});
