import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/components/useTheme';
import { TimerRing } from '@/components/TimerRing';
import { HOME_IDLE_IMAGE } from '@/components/Illustrations';
import { BodyStagesRibbon } from '@/components/BodyStagesRibbon';
import { TipsCard } from '@/components/TipsCard';
import { AppButton, Card, Screen, StatTile, SectionTitle } from '@/components/ui';
import { fmtClock, fmtCountdown, fmtDuration } from '@/lib/time';
import { computeStreak, statsFromSessions } from '@/lib/streak';
import { CUP_SIZES_ML } from '@/lib/units';

function useNow(active: boolean): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [active]);
  return now;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function FastScreen() {
  const t = useTheme();
  const settings = useStore((s) => s.settings);
  const plans = useStore((s) => s.plans);
  const activeSession = useStore((s) => s.activeSession);
  const recentSessions = useStore((s) => s.recentSessions);
  const weights = useStore((s) => s.weights);
  const waterToday = useStore((s) => s.waterToday);
  const startFast = useStore((s) => s.startFast);
  const endFast = useStore((s) => s.endFast);
  const discardActiveFast = useStore((s) => s.discardActiveFast);
  const addWater = useStore((s) => s.addWater);
  const now = useNow(!!activeSession);

  const plan = plans.find((p) => p.id === settings.activePlanId) ?? plans[0];
  const streak = useMemo(() => computeStreak(recentSessions, Date.now()), [recentSessions]);
  const stats = useMemo(() => statsFromSessions(recentSessions), [recentSessions]);

  const isFasting = !!activeSession;
  const elapsed = activeSession ? now - activeSession.started_at_utc : 0;
  const planned = activeSession ? activeSession.planned_end_at_utc - activeSession.started_at_utc : 0;
  const remaining = activeSession ? activeSession.planned_end_at_utc - now : 0;
  const progress = activeSession && planned > 0 ? elapsed / planned : 0;
  const isDone = isFasting && remaining <= 0;

  const onStart = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startFast(settings.activePlanId);
  }, [startFast, settings.activePlanId]);

  const onEnd = useCallback(async () => {
    const completed = remaining <= 0;
    const prompt = completed
      ? 'Log this fast and celebrate?'
      : 'You still have some window left. Ending now is completely fine — we will log it honestly.';
    Alert.alert(completed ? 'Fast complete' : 'End fast early?', prompt, [
      { text: 'Keep fasting', style: 'cancel' },
      {
        text: completed ? 'Log it' : 'End & log',
        style: completed ? 'default' : 'destructive',
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await endFast(completed ? 'completed' : 'ended_early');
          router.push('/celebration');
        },
      },
    ]);
  }, [endFast, remaining]);

  const onDiscard = useCallback(() => {
    Alert.alert(
      'Discard this fast?',
      'This removes the fast completely instead of logging it. If you simply broke the fast early, ending it honestly is the better option.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => discardActiveFast() },
      ]
    );
  }, [discardActiveFast]);

  const waterMl = waterToday.reduce((sum, w) => sum + w.volume_ml, 0);
  const waterPct = Math.min(1, waterMl / Math.max(1, settings.waterGoalMl));

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: t.sub }]}>{greeting()}</Text>
          <Text style={[styles.streak, { color: t.text }]}>
            {streak.current > 0 ? `🔥 ${streak.current}-day streak` : 'Let’s get started'}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/log-past-fast')} hitSlop={8}>
          <Text style={{ color: t.primary, fontWeight: '700', fontSize: 13 }}>Log past fast</Text>
        </Pressable>
      </View>

      {isFasting && activeSession ? (
        <>
          <View style={styles.ringWrap}>
            <TimerRing progress={progress} expired={isDone}>
              <Text style={[styles.stateLabel, { color: isDone ? t.primary : t.sub }]}>
                {isDone ? 'FAST COMPLETE' : 'FASTING'}
              </Text>
              <Text style={[styles.timerMain, { color: t.text }]}>
                {isDone ? fmtDuration(elapsed) : fmtCountdown(Math.max(0, remaining))}
              </Text>
              <Text style={[styles.timerSub, { color: t.sub }]}>
                {isDone ? 'Tap “Log fast” below' : `elapsed ${fmtDuration(elapsed)}`}
              </Text>
              <Text style={[styles.timerMeta, { color: t.sub }]}>
                {activeSession.plan_name} · ends {fmtClock(activeSession.planned_end_at_utc)}
              </Text>
            </TimerRing>
          </View>
          <View style={styles.buttonRow}>
            <AppButton title="Log fast" onPress={onEnd} style={{ flex: 2 }} />
            <AppButton title="Edit start" variant="ghost" onPress={() => router.push('/edit-fast')} style={{ flex: 1 }} />
          </View>
          <AppButton title="Discard fast" variant="ghost" onPress={onDiscard} />
          <BodyStagesRibbon elapsedHours={elapsed / 3_600_000} />
        </>
      ) : (
        <>
          <Card style={{ gap: 6 }}>
            <Text style={[styles.planKicker, { color: t.sub }]}>Your plan</Text>
            <Text style={[styles.planName, { color: t.text }]}>
              {plan?.name} — {plan?.fastHours}h fast / {plan?.eatHours}h eating
            </Text>
            <Text style={{ color: t.sub, fontSize: 13 }}>{plan?.description}</Text>
            <Pressable onPress={() => router.push('/(tabs)/plans')}>
              <Text style={{ color: t.sub, fontWeight: '700', fontSize: 13, marginTop: 4, textDecorationLine: 'underline' }}>Change plan</Text>
            </Pressable>
          </Card>
          <View style={styles.ringWrap}>
            <Image
              source={HOME_IDLE_IMAGE}
              style={{ width: 280, height: 200 }}
              resizeMode="contain"
            />
          </View>
          <AppButton title="Start fasting" onPress={onStart} />
          <Text style={{ color: t.sub, fontSize: 12, textAlign: 'center', marginTop: -4 }}>
            Start after your last meal of the day — one tap is all it takes.
          </Text>
        </>
      )}

      <SectionTitle>Today</SectionTitle>
      <View style={styles.tilesRow}>
        <StatTile value={`${stats.completionRate}%`} label="Completion rate" bg={t.purpleSoft} />
        <StatTile value={`${stats.totalHours.toFixed(0)}h`} label="Hours fasted" bg={t.mintSoft} />
        <StatTile value={`${weights.length}`} label="Weigh-ins" bg={t.peachSoft} />
      </View>

      <Card style={{ gap: 10 }}>
        <View style={styles.waterHeader}>
          <Text style={{ color: t.text, fontWeight: '800', fontSize: 15 }}>💧 Water</Text>
          <Text style={{ color: t.sub, fontSize: 13 }}>
            {(waterMl / 1000).toFixed(1)} / {(settings.waterGoalMl / 1000).toFixed(1)} L
          </Text>
        </View>
        <View style={[styles.waterBar, { backgroundColor: t.ribbonTrack }]}>
          <View style={[styles.waterFill, { backgroundColor: t.sky, width: `${waterPct * 100}%` }]} />
        </View>
        <View style={styles.waterActions}>
          <AppButton title={`+ ${settings.cupSizeMl} ml`} variant="ghost" onPress={() => addWater(settings.cupSizeMl)} style={styles.waterBtn} />
          <Pressable onPress={() => router.push('/(tabs)/settings')} hitSlop={8} style={styles.waterConfig}>
            <Text style={{ color: t.sub, fontSize: 13, fontWeight: '700' }}>Cup & goal</Text>
          </Pressable>
        </View>
      </Card>

      <TipsCard ts={now} />

      <SectionTitle>Cup size</SectionTitle>
      <View style={styles.cupRow}>
        {CUP_SIZES_ML.map((ml) => (
          <Pressable
            key={ml}
            onPress={() => useStore.getState().updateSettings({ cupSizeMl: ml })}
            style={[
              styles.cupChip,
              { backgroundColor: settings.cupSizeMl === ml ? t.purpleSoft : t.card, borderColor: settings.cupSizeMl === ml ? t.purple : t.border },
            ]}
          >
            <Text style={{ color: settings.cupSizeMl === ml ? t.purple : t.sub, fontWeight: '700', fontSize: 12 }}>{ml} ml</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 },
  greeting: { fontSize: 13, fontWeight: '600' },
  streak: { fontSize: 22, fontWeight: '900', marginTop: 2 },
  ringWrap: { alignItems: 'center', paddingVertical: 12 },
  stateLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  timerMain: { fontSize: 44, fontWeight: '900', fontVariant: ['tabular-nums'] },
  timerSub: { fontSize: 13, marginTop: 2 },
  timerMeta: { fontSize: 12, marginTop: 6 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  planKicker: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  planName: { fontSize: 18, fontWeight: '800' },
  tilesRow: { flexDirection: 'row', gap: 10 },
  waterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  waterBar: { height: 10, borderRadius: 5, overflow: 'hidden' },
  waterFill: { height: '100%', borderRadius: 5 },
  waterActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  waterBtn: { flex: 1 },
  waterConfig: { paddingHorizontal: 8 },
  cupRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  cupChip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
});
