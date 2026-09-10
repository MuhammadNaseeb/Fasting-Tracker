import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/components/useTheme';
import { AppButton, Card, TextInputField } from '@/components/ui';
import { computeStreak } from '@/lib/streak';
import { stageForElapsed } from '@/lib/bodyStages';
import { fmtClock, fmtDuration } from '@/lib/time';
import { formatWeight, lbToKg } from '@/lib/units';

const MOODS: { value: number; icon: string; label: string }[] = [
  { value: 1, icon: '😟', label: 'Rough' },
  { value: 2, icon: '🙂', label: 'Okay' },
  { value: 3, icon: '😄', label: 'Great' },
];

export default function Celebration() {
  const t = useTheme();
  const celebration = useStore((s) => s.celebration);
  const recentSessions = useStore((s) => s.recentSessions);
  const settings = useStore((s) => s.settings);
  const rateCelebration = useStore((s) => s.rateCelebration);
  const clearCelebration = useStore((s) => s.clearCelebration);
  const addWeight = useStore((s) => s.addWeight);

  const [weightText, setWeightText] = useState('');
  const [showWeight, setShowWeight] = useState(false);

  const streak = useMemo(() => computeStreak(recentSessions, Date.now()), [recentSessions]);

  if (!celebration) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
        <View style={[styles.fill, styles.center]}>
          <AppButton title="Back home" onPress={() => router.replace('/(tabs)')} />
        </View>
      </SafeAreaView>
    );
  }

  const endedAt = celebration.ended_at_utc ?? Date.now();
  const actualMs = endedAt - celebration.started_at_utc;
  const hours = actualMs / 3_600_000;
  const stage = stageForElapsed(hours);
  const plannedMs = celebration.planned_end_at_utc - celebration.started_at_utc;
  const isFull = celebration.status === 'completed';
  const partial = Math.min(1, actualMs / Math.max(1, plannedMs));

  const saveWeight = async () => {
    const parsed = Number(weightText.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert('Enter a valid weight');
      return;
    }
    const kg = settings.unit === 'imperial' ? lbToKg(parsed) : parsed;
    await addWeight(Math.round(kg * 100) / 100, Date.now());
    setWeightText('');
    setShowWeight(false);
  };

  const onMood = async (value: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await rateCelebration(value);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.fill, styles.scroll]}>
        <View style={styles.centerSection}>
          <Text style={styles.emoji}>{isFull ? '🎉' : partial >= 0.5 ? '👏' : '💪'}</Text>
          <Text style={[styles.h1, { color: t.text }]}>{isFull ? 'Fast complete!' : 'Fast logged'}</Text>
          <Text style={[styles.sub, { color: t.sub }]}>
            {isFull
              ? `${fmtDuration(actualMs)} — right on plan. This is how progress gets built.`
              : `You logged ${fmtDuration(actualMs)} of your ${fmtDuration(plannedMs)} window. Honest logging is a skill, not a failure. Next fast starts fresh.`}
          </Text>
        </View>

        <View style={styles.tilesRow}>
          <View style={[styles.tile, { backgroundColor: t.purpleSoft }]}>
            <Text style={{ color: t.text, fontSize: 22, fontWeight: '900' }}>{fmtDuration(actualMs)}</Text>
            <Text style={{ color: t.sub, fontSize: 12 }}>hours fasted</Text>
          </View>
          <View style={[styles.tile, { backgroundColor: t.mintSoft }]}>
            <Text style={{ color: t.text, fontSize: 22, fontWeight: '900' }}>{Math.round(partial * 100)}%</Text>
            <Text style={{ color: t.sub, fontSize: 12 }}>of window</Text>
          </View>
          <View style={[styles.tile, { backgroundColor: t.peachSoft }]}>
            <Text style={{ color: t.text, fontSize: 22, fontWeight: '900' }}>🔥 {streak.current}</Text>
            <Text style={{ color: t.sub, fontSize: 12 }}>day streak</Text>
          </View>
        </View>

        <Card style={{ gap: 4 }}>
          <Text style={{ color: t.text, fontWeight: '800' }}>Deepest stage reached</Text>
          <Text style={{ color: t.primary, fontWeight: '700', fontSize: 15 }}>{stage.title}</Text>
          <Text style={{ color: t.sub, fontSize: 13, lineHeight: 19 }}>{stage.body}</Text>
        </Card>

        <Card style={{ gap: 10 }}>
          <Text style={{ color: t.text, fontWeight: '800' }}>How did that feel?</Text>
          <View style={styles.moodRow}>
            {MOODS.map((m) => (
              <Pressable
                key={m.value}
                onPress={() => onMood(m.value)}
                style={[
                  styles.moodBtn,
                  { backgroundColor: celebration.mood_rating === m.value ? t.primarySoft : t.cardAlt, borderColor: celebration.mood_rating === m.value ? t.primary : t.border },
                ]}
              >
                <Text style={styles.moodIcon}>{m.icon}</Text>
                <Text style={{ color: t.sub, fontSize: 11 }}>{m.label}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {showWeight ? (
          <Card style={{ gap: 10 }}>
            <TextInputField
              label={`Weigh-in (${settings.unit === 'imperial' ? 'lb' : 'kg'})`}
              value={weightText}
              onChangeText={setWeightText}
              keyboardType="decimal-pad"
              placeholder={String(settings.unit === 'imperial' ? (0).toFixed(1) : '—')}
              suffix={settings.unit === 'imperial' ? 'lb' : 'kg'}
            />
            <AppButton title="Save weight" variant="ghost" onPress={saveWeight} />
            <Text style={{ color: t.sub, fontSize: 11 }}>
              Weighing in around the same time each day (mornings, after the bathroom) makes the trend line honest.
            </Text>
          </Card>
        ) : (
          <AppButton title="Log today's weight" variant="ghost" onPress={() => setShowWeight(true)} />
        )}

        <AppButton
          title="Done"
          onPress={() => {
            clearCelebration();
            router.replace('/(tabs)');
          }}
        />
        <Text style={{ color: t.sub, fontSize: 11, textAlign: 'center' }}>
          {isFull
            ? `Ends were ${fmtClock(celebration.started_at_utc)} → ${fmtClock(endedAt)}`
            : 'Every logged fast counts toward your totals.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  scroll: { padding: 16, paddingBottom: 40, gap: 14 },
  centerSection: { alignItems: 'center', paddingTop: 12, gap: 8 },
  emoji: { fontSize: 56 },
  h1: { fontSize: 30, fontWeight: '900', textAlign: 'center' },
  sub: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  tilesRow: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderRadius: 18, padding: 14, alignItems: 'center', gap: 2 },
  moodRow: { flexDirection: 'row', gap: 10 },
  moodBtn: { flex: 1, borderWidth: 1.5, borderRadius: 16, padding: 12, alignItems: 'center', gap: 4 },
  moodIcon: { fontSize: 28 },
});
