import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/components/useTheme';
import { AppButton, Card, Screen } from '@/components/ui';
import { fmtClock, fmtDate, fmtDuration } from '@/lib/time';

export default function EditFast() {
  const t = useTheme();
  const activeSession = useStore((s) => s.activeSession);
  const editActiveFast = useStore((s) => s.editActiveFast);

  const [startDate, setStartDate] = useState(new Date(activeSession?.started_at_utc ?? Date.now()));
  const [startTime, setStartTime] = useState(new Date(activeSession?.started_at_utc ?? Date.now()));
  const [endTime, setEndTime] = useState(new Date(activeSession?.planned_end_at_utc ?? Date.now()));
  const [picker, setPicker] = useState<null | 'date' | 'start' | 'end'>(null);

  if (!activeSession) {
    return (
      <Screen scroll={false} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: t.sub }}>No active fast.</Text>
        <AppButton title="Close" variant="ghost" onPress={() => router.back()} style={{ marginTop: 12, minWidth: 160 }} />
      </Screen>
    );
  }

  const plannedMs = endTime.getTime() - startTime.getTime();

  const save = async () => {
    const startTs = composeTs(startDate, startTime);
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endTs = endMinutes <= startMinutes ? addDay(endTime, 1) : endTime;
    const finalEnd = composeTs(endTs, endTs);

    if (startTs >= Date.now()) {
      Alert.alert('Cannot start in the future', 'Move the start time to now or earlier.');
      return;
    }
    if (finalEnd <= startTs) {
      Alert.alert('End must be after start');
      return;
    }
    if (startTs < Date.now() - 30 * 86_400_000) {
      Alert.alert('That is a long time ago', 'Start times more than 30 days back are not supported.');
      return;
    }
    await editActiveFast(startTs, finalEnd);
    router.back();
  };

  return (
    <Screen>
      <Text style={[styles.title, { color: t.text }]}>Edit active fast</Text>
      <Text style={{ color: t.sub, fontSize: 13 }}>
        Started late or early? Adjust the real start time — reminders reschedule automatically.
      </Text>

      <Card style={{ gap: 12 }}>
        <View style={styles.rowBetween}>
          <Text style={{ color: t.text, fontWeight: '600' }}>Start date</Text>
          <Pressable onPress={() => setPicker('date')} hitSlop={8}>
            <Text style={{ color: t.primary, fontWeight: '700' }}>{fmtDate(startDate.getTime())}</Text>
          </Pressable>
        </View>
        <View style={styles.rowBetween}>
          <Text style={{ color: t.text, fontWeight: '600' }}>Started at</Text>
          <Pressable onPress={() => setPicker('start')} hitSlop={8}>
            <Text style={{ color: t.primary, fontWeight: '700' }}>
              {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Pressable>
        </View>
        <View style={styles.rowBetween}>
          <Text style={{ color: t.text, fontWeight: '600' }}>Planned end</Text>
          <Pressable onPress={() => setPicker('end')} hitSlop={8}>
            <Text style={{ color: t.primary, fontWeight: '700' }}>
              {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Pressable>
        </View>
        <View style={[styles.summary, { backgroundColor: t.cardAlt }]}>
          <Text style={{ color: t.sub, fontSize: 13 }}>
            {fmtDuration(plannedMs)} window · ends {fmtClock(endTime.getTime())}
          </Text>
        </View>
      </Card>

      {picker ? (
        <DateTimePicker
          value={picker === 'date' ? startDate : picker === 'start' ? startTime : endTime}
          mode={picker === 'date' ? 'date' : 'time'}
          is24Hour
          onChange={(_, d) => {
            const which = picker;
            setPicker(null);
            if (!d) return;
            if (which === 'date') setStartDate(d);
            if (which === 'start') setStartTime(d);
            if (which === 'end') setEndTime(d);
          }}
        />
      ) : null}

      <AppButton title="Save changes" onPress={save} />
      <AppButton title="Cancel" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

function composeTs(day: Date, time: Date): number {
  const d = new Date(day);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d.getTime();
}

function addDay(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '900', marginTop: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  summary: { borderRadius: 12, padding: 12 },
});
