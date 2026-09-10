import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/components/useTheme';
import { AppButton, Card, Screen } from '@/components/ui';
import { combineLocalDateTime, DAY, fmtDate, fmtDuration, localDayKey, minutesOfDay } from '@/lib/time';

export default function LogPastFast() {
  const t = useTheme();
  const logPastFast = useStore((s) => s.logPastFast);
  const plans = useStore((s) => s.plans);
  const activePlanId = useStore((s) => s.settings.activePlanId);

  const [dayStart, setDayStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  });
  const [startTime, setStartTime] = useState(() => new Date(Date.now() - DAY));
  const [endTime, setEndTime] = useState(() => new Date(Date.now() - DAY + 14 * 3_600_000));
  const [picker, setPicker] = useState<null | 'date' | 'start' | 'end'>(null);

  const plan = plans.find((p) => p.id === activePlanId) ?? plans[0];

  const startTs = startTime.getTime();
  const endTs = endTime.getTime();

  const save = async () => {
    if (startTs >= Date.now()) {
      Alert.alert('Start is in the future', 'Retroactive fasts must start in the past.');
      return;
    }
    if (endTs <= startTs) {
      Alert.alert('End must be after start', 'Check the times and try again.');
      return;
    }
    if (endTs > Date.now() + 60_000) {
      Alert.alert('End is in the future', 'A past fast cannot end in the future.');
      return;
    }
    await logPastFast(startTs, endTs, plan.id, plan.name);
    router.back();
  };

  const changeDay = (d?: Date) => {
    if (!d) return;
    const key = localDayKey(d.getTime());
    setDayStart(d);
    const sm = minutesOfDay(startTime);
    const em = minutesOfDay(endTime);
    setStartTime(new Date(combineLocalDateTime(key, sm)));
    setEndTime(new Date(combineLocalDateTime(key, em)));
  };

  return (
    <Screen>
      <Text style={[styles.title, { color: t.text }]}>Log a past fast</Text>
      <Text style={{ color: t.sub, fontSize: 13 }}>
        Forgot to tap start? No problem — log it afterwards and it counts fully toward your stats and streak.
      </Text>

      <Card style={{ gap: 12 }}>
        <View style={styles.rowBetween}>
          <Text style={{ color: t.text, fontWeight: '600' }}>Date</Text>
          <Pressable onPress={() => setPicker('date')} hitSlop={8}>
            <Text style={{ color: t.primary, fontWeight: '700' }}>{fmtDate(dayStart.getTime())}</Text>
          </Pressable>
        </View>
        <View style={styles.rowBetween}>
          <Text style={{ color: t.text, fontWeight: '600' }}>Started</Text>
          <Pressable onPress={() => setPicker('start')} hitSlop={8}>
            <Text style={{ color: t.primary, fontWeight: '700' }}>
              {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Pressable>
        </View>
        <View style={styles.rowBetween}>
          <Text style={{ color: t.text, fontWeight: '600' }}>Ended</Text>
          <Pressable onPress={() => setPicker('end')} hitSlop={8}>
            <Text style={{ color: t.primary, fontWeight: '700' }}>
              {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Pressable>
        </View>
        <View style={[styles.summary, { backgroundColor: t.cardAlt }]}>
          <Text style={{ color: t.sub, fontSize: 13 }}>
            {plan.name} · duration {fmtDuration(Math.max(0, endTs - startTs))}
          </Text>
        </View>
      </Card>

      {picker ? (
        <DateTimePicker
          value={picker === 'date' ? dayStart : picker === 'start' ? startTime : endTime}
          mode={picker === 'date' ? 'date' : 'time'}
          is24Hour
          onChange={(_, d) => {
            const which = picker;
            setPicker(null);
            if (!d) return;
            if (which === 'date') changeDay(d);
            if (which === 'start') setStartTime(d);
            if (which === 'end') setEndTime(d);
          }}
        />
      ) : null}

      <AppButton title="Save fast" onPress={save} />
      <AppButton title="Cancel" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '900', marginTop: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  summary: { borderRadius: 12, padding: 12 },
});
