import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/components/useTheme';
import { AppButton, Card, Screen, SectionTitle, StatTile, TextInputField } from '@/components/ui';
import { WeightChart } from '@/components/WeightChart';
import { computeStreak, qualifiesForStreak, statsFromSessions } from '@/lib/streak';
import { computeBadges } from '@/lib/badges';
import { fmtDateShort, fmtDuration, startOfLocalDay, DAY } from '@/lib/time';
import { formatWeight, kgToLb, lbToKg } from '@/lib/units';
import { checkRapidLoss } from '@/lib/safety';

export default function StatsScreen() {
  const t = useTheme();
  const recentSessions = useStore((s) => s.recentSessions);
  const weights = useStore((s) => s.weights);
  const settings = useStore((s) => s.settings);
  const addWeight = useStore((s) => s.addWeight);
  const deleteWeight = useStore((s) => s.deleteWeight);

  const [weightInput, setWeightInput] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);

  const streak = useMemo(() => computeStreak(recentSessions, Date.now()), [recentSessions]);
  const stats = useMemo(() => statsFromSessions(recentSessions), [recentSessions]);
  const avgHours = stats.total > 0 ? stats.totalHours / stats.total : 0;

  const weekStart = startOfLocalDay(Date.now() - 6 * DAY);
  const weekHours = recentSessions
    .filter((s) => qualifiesForStreak(s) && (s.ended_at_utc ?? 0) >= weekStart)
    .reduce((sum, s) => sum + ((s.ended_at_utc ?? 0) - s.started_at_utc) / 3_600_000, 0);

  const weightLostKg = weights.length >= 2 ? weights[0].weight_kg - weights[weights.length - 1].weight_kg : 0;
  const badges = computeBadges({
    total: stats.total,
    totalHours: stats.totalHours,
    currentStreak: streak.current,
    weightLostKg,
  });

  const latestWeight = weights.length > 0 ? weights[weights.length - 1] : null;
  const goalKg = settings.goalWeightKg;
  const remainingKg = latestWeight && goalKg ? latestWeight.weight_kg - goalKg : null;

  const rapidLossWarning = useMemo(() => {
    if (weights.length < 2) return null;
    const prev = weights[weights.length - 2];
    const curr = weights[weights.length - 1];
    const days = Math.max(1, Math.round((curr.recorded_at - prev.recorded_at) / DAY));
    return checkRapidLoss(prev.weight_kg, curr.weight_kg, days);
  }, [weights]);

  const saveWeight = async () => {
    const parsed = Number(weightInput.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert('Enter a valid weight');
      return;
    }
    const kg = settings.unit === 'imperial' ? lbToKg(parsed) : parsed;
    await addWeight(Math.round(kg * 100) / 100, Date.now());
    setWeightInput('');
    if (rapidLossWarning) {
      Alert.alert('A gentle check-in', rapidLossWarning);
    }
  };

  const history = showAllHistory ? recentSessions : recentSessions.slice(0, 8);

  return (
    <Screen>
      <Text style={[styles.title, { color: t.text }]}>Progress</Text>

      <View style={styles.tilesWrap}>
        <View style={styles.tilesRow}>
          <StatTile value={`${streak.current}`} label="Day streak" accent />
          <StatTile value={`${streak.longest}`} label="Best streak" />
          <StatTile value={`${stats.total}`} label="Fasts logged" />
        </View>
        <View style={styles.tilesRow}>
          <StatTile value={`${stats.totalHours.toFixed(0)}h`} label="Total hours" />
          <StatTile value={fmtDuration(avgHours * 3_600_000)} label="Avg fast" />
          <StatTile value={`${stats.completionRate}%`} label="Completed" />
        </View>
      </View>

      <Card style={{ gap: 8 }}>
        <View style={styles.rowBetween}>
          <Text style={{ color: t.text, fontWeight: '800', fontSize: 15 }}>This week</Text>
          <Text style={{ color: t.sub, fontSize: 13 }}>{weekHours.toFixed(1)} hours fasted</Text>
        </View>
        <Text style={{ color: t.sub, fontSize: 13, lineHeight: 19 }}>
          {weekHours >= 7 * (plansHours(settings.activePlanId, useStore.getState().plans) ?? 14) * 0.9
            ? 'Strong week. This is what consistency looks like.'
            : 'Every fast counts. Aim for your window most days and let the average do the work.'}
        </Text>
      </Card>

      <SectionTitle>Weight</SectionTitle>
      <Card style={{ gap: 12 }}>
        <View style={styles.rowBetween}>
          <Text style={{ color: t.text, fontWeight: '800', fontSize: 15 }}>
            {latestWeight ? formatWeight(latestWeight.weight_kg, settings.unit) : 'No weigh-ins yet'}
          </Text>
          {goalKg ? (
            <Text style={{ color: t.sub, fontSize: 13 }}>
              {remainingKg !== null && remainingKg > 0
                ? `${formatWeight(remainingKg, settings.unit, 1)} to go`
                : 'Goal reached 🎉'}
            </Text>
          ) : null}
        </View>
        <WeightChart
          points={weights.map((w) => ({ ts: w.recorded_at, kg: w.weight_kg }))}
          goalKg={goalKg}
          unit={settings.unit}
        />
        {rapidLossWarning ? (
          <Text style={{ color: t.accent, fontSize: 12, lineHeight: 18 }}>{rapidLossWarning}</Text>
        ) : null}
        <View style={styles.weightRow}>
          <View style={{ flex: 1 }}>
            <TextInputField
              label={`Log weight (${settings.unit === 'imperial' ? 'lb' : 'kg'})`}
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="decimal-pad"
              placeholder={
                latestWeight
                  ? String(settings.unit === 'imperial' ? kgToLb(latestWeight.weight_kg).toFixed(1) : latestWeight.weight_kg.toFixed(1))
                  : '—'
              }
            />
          </View>
          <AppButton title="Save" onPress={saveWeight} style={styles.saveBtn} />
        </View>
        {weights.length > 0 ? (
          <View style={{ gap: 6 }}>
            {[...weights]
              .slice(-5)
              .reverse()
              .map((w) => (
                <View key={w.id} style={styles.historyRow}>
                  <Text style={{ color: t.sub, fontSize: 13 }}>{fmtDateShort(w.recorded_at)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ color: t.text, fontSize: 13, fontWeight: '700' }}>
                      {formatWeight(w.weight_kg, settings.unit)}
                    </Text>
                    <Pressable hitSlop={8} onPress={() => deleteWeight(w.id)}>
                      <Text style={{ color: t.danger, fontSize: 12 }}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
          </View>
        ) : null}
      </Card>

      <SectionTitle>Achievements</SectionTitle>
      <View style={styles.badgeGrid}>
        {badges.map((b) => (
          <View
            key={b.id}
            style={[
              styles.badge,
              { backgroundColor: t.card, borderColor: t.border, opacity: b.achieved ? 1 : 0.45 },
            ]}
          >
            <Text style={styles.badgeIcon}>{b.achieved ? b.icon : '🔒'}</Text>
            <Text style={{ color: t.text, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{b.title}</Text>
            <Text style={{ color: t.sub, fontSize: 10, textAlign: 'center' }}>{b.description}</Text>
          </View>
        ))}
      </View>

      <SectionTitle
        action={
          recentSessions.length > 8 ? (
            <Pressable onPress={() => setShowAllHistory((v) => !v)} hitSlop={8}>
              <Text style={{ color: t.primary, fontWeight: '700', fontSize: 13 }}>
                {showAllHistory ? 'Show less' : 'Show all'}
              </Text>
            </Pressable>
          ) : undefined
        }
      >
        Fast history
      </SectionTitle>
      <Card style={{ gap: 2 }}>
        {history.length === 0 ? (
          <Text style={{ color: t.sub, fontSize: 13 }}>Your logged fasts will appear here.</Text>
        ) : (
          history.map((s) => {
            const end = s.ended_at_utc ?? s.planned_end_at_utc;
            const duration = end - s.started_at_utc;
            return (
              <View key={s.id} style={styles.historyRow}>
                <View>
                  <Text style={{ color: t.text, fontSize: 14, fontWeight: '600' }}>{s.plan_name}</Text>
                  <Text style={{ color: t.sub, fontSize: 12 }}>{fmtDateShort(s.started_at_utc)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={{ color: t.text, fontSize: 14, fontWeight: '700' }}>{fmtDuration(duration)}</Text>
                  <Text
                    style={{
                      color: s.status === 'completed' ? t.primary : s.status === 'active' ? t.accent : t.sub,
                      fontSize: 11,
                      fontWeight: '700',
                    }}
                  >
                    {s.status === 'completed'
                      ? 'Completed'
                      : s.status === 'active'
                        ? 'In progress'
                        : 'Ended early'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </Card>

      {stats.total >= 3 && !settings.premium ? (
        <Card style={{ gap: 6, borderColor: t.primary }}>
          <Text style={{ color: t.primary, fontWeight: '800', fontSize: 15 }}>FastTrack Premium</Text>
          <Text style={{ color: t.sub, fontSize: 13, lineHeight: 19 }}>
            Long-range charts, weekly recaps by email, data export and the full body-stage library. Subscriptions arrive
            with store billing — the core tracker stays free.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

function plansHours(planId: string, plans: { id: string; fastHours: number }[]): number | null {
  return plans.find((p) => p.id === planId)?.fastHours ?? null;
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '900', marginTop: 8 },
  tilesWrap: { gap: 10 },
  tilesRow: { flexDirection: 'row', gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weightRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  saveBtn: { minWidth: 100 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { width: '31%', flexGrow: 1, borderRadius: 14, borderWidth: 1, padding: 10, alignItems: 'center', gap: 4 },
  badgeIcon: { fontSize: 22 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.25)' },
});
