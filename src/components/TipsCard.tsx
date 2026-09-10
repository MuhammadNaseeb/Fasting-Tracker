import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { localDayKey } from '@/lib/time';
import { useTheme } from './useTheme';

export type Tip = { title: string; body: string };

export const TIPS: Tip[] = [
  {
    title: 'Hunger comes in waves',
    body: 'Hunger during a fast usually peaks and fades within 15–20 minutes. Drink a glass of water and let the wave pass.',
  },
  {
    title: 'Break your fast gently',
    body: 'A moderate first meal with protein and fibre tends to feel better than a heavy one. Your stomach has been resting.',
  },
  {
    title: 'Water is your friend',
    body: 'Staying hydrated helps with hunger, energy and headaches during fasting windows. Keep a bottle nearby.',
  },
  {
    title: 'Sleep protects your streak',
    body: 'Poor sleep raises appetite hormones for many people. A consistent bedtime quietly supports your fasting window.',
  },
  {
    title: 'Black coffee and tea',
    body: 'Plain coffee, tea and other zero-calorie drinks are generally considered fine during a fast. Skip the sugar and milk.',
  },
  {
    title: 'Consistency beats intensity',
    body: 'Research suggests steady, sustainable routines beat occasional heroic efforts. A 14:12 you keep wins over 20:4 you quit.',
  },
  {
    title: 'Salt can help',
    body: 'Feeling light-headed early in a fast? A pinch of salt in water or a cup of broth can help some people feel steadier.',
  },
  {
    title: 'Move a little',
    body: 'A short walk when a hunger wave hits passes the time and, for many people, quiets the appetite.',
  },
  {
    title: 'Plan your first meal',
    body: 'Deciding what you will eat when the window opens removes the 10 a.m. scramble and helps you eat well, not just fast.',
  },
  {
    title: 'Missed a day? Fine.',
    body: 'One off-day does not erase your progress. What matters is the average of your weeks, not any single day.',
  },
  {
    title: 'Listen to your body',
    body: 'If you feel dizzy, faint or unwell, end your fast and eat something. There is always tomorrow — health first.',
  },
  {
    title: 'Protein at the last meal',
    body: 'A last meal with enough protein tends to keep people fuller through the overnight fast.',
  },
];

export function tipsForToday(ts: number): Tip {
  const key = localDayKey(ts);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return TIPS[hash % TIPS.length];
}

export function TipsCard({ ts }: { ts: number }) {
  const t = useTheme();
  const tip = tipsForToday(ts);
  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
      <Text style={[styles.kicker, { color: t.accent }]}>Daily tip</Text>
      <Text style={[styles.title, { color: t.text }]}>{tip.title}</Text>
      <Text style={[styles.body, { color: t.sub }]}>{tip.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 6 },
  kicker: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontSize: 16, fontWeight: '800' },
  body: { fontSize: 13, lineHeight: 19 },
});
