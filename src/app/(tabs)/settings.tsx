import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/components/useTheme';
import { AppButton, Card, Screen, SectionTitle, Segmented, TextInputField, ToggleRow } from '@/components/ui';
import { buildAndShareCsv } from '@/lib/export';
import { getWaterForRange } from '@/lib/db';
import { healthyMinWeightKg } from '@/lib/safety';
import { kgToLb, lbToKg } from '@/lib/units';
import { ensurePermissions, notificationsUnavailableReason, permissionStatus } from '@/lib/notifications';
import { DAY } from '@/lib/time';

export default function SettingsScreen() {
  const t = useTheme();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const updateNotif = useStore((s) => s.updateNotif);
  const recentSessions = useStore((s) => s.recentSessions);
  const weights = useStore((s) => s.weights);
  const wipeEverything = useStore((s) => s.wipeEverything);

  const [height, setHeight] = useState(settings.heightCm ? String(settings.heightCm) : '');
  const [goal, setGoal] = useState(
    settings.goalWeightKg
      ? String(settings.unit === 'imperial' ? Math.round(kgToLb(settings.goalWeightKg) * 10) / 10 : settings.goalWeightKg)
      : ''
  );

  const saveProfile = async () => {
    const heightCm = Number(height.replace(',', '.'));
    let goalKg: number | null = null;
    if (goal.trim() !== '') {
      const raw = Number(goal.replace(',', '.'));
      if (!Number.isFinite(raw) || raw <= 0) {
        Alert.alert('Enter a valid goal weight');
        return;
      }
      goalKg = settings.unit === 'imperial' ? lbToKg(raw) : raw;
    }
    if (!Number.isFinite(heightCm) || heightCm < 80 || heightCm > 250) {
      Alert.alert('Enter a valid height', 'Height in cm, between 80 and 250.');
      return;
    }
    if (goalKg !== null) {
      const floor = healthyMinWeightKg(heightCm);
      if (floor !== null && goalKg < floor) {
        Alert.alert(
          'A gentler goal',
          `That goal is below what is generally considered healthy for your height (about ${floor} kg). Try ${floor} kg or above, or clear the goal and simply focus on the habit.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }
    await updateSettings({ heightCm, goalWeightKg: goalKg === null ? null : Math.round(goalKg * 10) / 10 });
    Alert.alert('Saved', 'Your profile has been updated.');
  };

  const checkNotifPermission = async () => {
    const reason = notificationsUnavailableReason();
    if (reason) {
      Alert.alert('Notifications unavailable here', reason);
      return;
    }
    const granted = await permissionStatus();
    if (granted) {
      Alert.alert('Notifications are on', 'Reminders are scheduled on this device and survive reboots.');
    } else {
      const ok = await ensurePermissions();
      Alert.alert(
        ok ? 'Notifications enabled' : 'Notifications are off',
        ok
          ? 'You will now receive fasting reminders.'
          : 'Without notification permission the app cannot remind you when your eating window closes or opens. You can enable it any time in system settings.'
      );
    }
  };

  const onExport = async () => {
    try {
      const allWater = await getWaterForRange(0, Date.now() + DAY);
      const ok = await buildAndShareCsv(recentSessions, weights, allWater);
      if (!ok) Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
    } catch {
      Alert.alert('Export failed', 'Something went wrong while building the file.');
    }
  };

  const onDeleteAll = () => {
    Alert.alert(
      'Delete everything?',
      'This permanently removes all fasts, weigh-ins, water logs and settings from this device. There is no undo.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all data',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Are you absolutely sure?', 'This is the final confirmation. All local data will be erased.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Erase everything', style: 'destructive', onPress: () => wipeEverything() },
            ]);
          },
        },
      ]
    );
  };

  const n = settings.notif;

  return (
    <Screen>
      <Text style={[styles.title, { color: t.text }]}>Settings</Text>

      <SectionTitle>Profile</SectionTitle>
      <Card style={{ gap: 12 }}>
        <TextInputField label="Height" value={height} onChangeText={setHeight} keyboardType="numeric" suffix="cm" />
        <TextInputField
          label="Goal weight (optional)"
          value={goal}
          onChangeText={setGoal}
          keyboardType="decimal-pad"
          suffix={settings.unit === 'imperial' ? 'lb' : 'kg'}
        />
        <AppButton title="Save profile" variant="ghost" onPress={saveProfile} />
      </Card>

      <SectionTitle>Units</SectionTitle>
      <Segmented
        options={[
          { value: 'metric', label: 'Metric (kg, ml)' },
          { value: 'imperial', label: 'Imperial (lb)' },
        ]}
        value={settings.unit}
        onChange={(v) => updateSettings({ unit: v })}
      />

      <SectionTitle>Appearance</SectionTitle>
      <Segmented
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        value={settings.themeMode}
        onChange={(v) => updateSettings({ themeMode: v })}
      />

      <SectionTitle>Notifications</SectionTitle>
      {notificationsUnavailableReason() ? (
        <Card>
          <Text style={{ color: t.text, fontWeight: '800', marginBottom: 6 }}>Reminders unavailable here</Text>
          <Text style={{ color: t.sub, fontSize: 13, lineHeight: 19 }}>{notificationsUnavailableReason()}</Text>
        </Card>
      ) : (
        <>
          <Card style={{ gap: 0 }}>
            <ToggleRow
              label="Eating window closed"
              sub="Fired right when your fast begins"
              value={n.windowClosed}
              onChange={(v) => updateNotif({ windowClosed: v })}
            />
            <ToggleRow label="60 min before fast ends" value={n.preEnd60} onChange={(v) => updateNotif({ preEnd60: v })} />
            <ToggleRow label="30 min before fast ends" value={n.preEnd30} onChange={(v) => updateNotif({ preEnd30: v })} />
            <ToggleRow label="15 min before fast ends" value={n.preEnd15} onChange={(v) => updateNotif({ preEnd15: v })} />
            <ToggleRow
              label="Fast complete"
              sub="The moment your eating window opens"
              value={n.fastEnd}
              onChange={(v) => updateNotif({ fastEnd: v })}
            />
            <ToggleRow
              label="Water reminders"
              sub="Every couple of hours while you are awake"
              value={n.water}
              onChange={(v) => updateNotif({ water: v })}
            />
            <ToggleRow label="Daily weigh-in reminder" sub="8:00 in the morning" value={n.weighIn} onChange={(v) => updateNotif({ weighIn: v })} />
            <ToggleRow
              label="Weekly recap"
              sub="Sunday evening summary of your week"
              value={n.weeklySummary}
              onChange={(v) => updateNotif({ weeklySummary: v })}
            />
          </Card>
          <AppButton title="Check notification permission" variant="ghost" onPress={checkNotifPermission} />
          <Text style={{ color: t.sub, fontSize: 12, lineHeight: 18 }}>
            On some phones (Xiaomi, Oppo, Samsung and others) battery optimisation can delay reminders. If reminders
            are late, allow the app to run unrestricted in your system battery settings.
          </Text>
        </>
      )}

      <SectionTitle>Water</SectionTitle>
      <Card style={{ gap: 12 }}>
        <View style={styles.rowBetween}>
          <Text style={{ color: t.text, fontWeight: '600' }}>Daily goal</Text>
          <Text style={{ color: t.sub }}>{(settings.waterGoalMl / 1000).toFixed(1)} L</Text>
        </View>
        <Segmented
          options={[
            { value: '1500', label: '1.5 L' },
            { value: '2000', label: '2 L' },
            { value: '2500', label: '2.5 L' },
            { value: '3000', label: '3 L' },
          ]}
          value={String(settings.waterGoalMl)}
          onChange={(v) => updateSettings({ waterGoalMl: Number(v) })}
        />
        <View style={styles.rowBetween}>
          <Text style={{ color: t.text, fontWeight: '600' }}>Cup size</Text>
          <Text style={{ color: t.sub }}>{settings.cupSizeMl} ml</Text>
        </View>
        <Segmented
          options={[
            { value: '150', label: '150 ml' },
            { value: '250', label: '250 ml' },
            { value: '330', label: '330 ml' },
            { value: '500', label: '500 ml' },
          ]}
          value={String(settings.cupSizeMl)}
          onChange={(v) => updateSettings({ cupSizeMl: Number(v) })}
        />
      </Card>

      <SectionTitle>Your data</SectionTitle>
      <Card style={{ gap: 12 }}>
        <Text style={{ color: t.sub, fontSize: 13, lineHeight: 19 }}>
          Everything in this app lives on your device. No account, no cloud, no analytics on your health values.
        </Text>
        <AppButton title="Export data (CSV)" variant="ghost" onPress={onExport} />
      </Card>

      <SectionTitle>Health & safety</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Pressable onPress={() => router.push('/disclaimer')}>
          <Text style={{ color: t.primary, fontWeight: '700' }}>Read the medical disclaimer</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/support')}>
          <Text style={{ color: t.primary, fontWeight: '700' }}>Support resources</Text>
        </Pressable>
        <Text style={{ color: t.sub, fontSize: 12, lineHeight: 18 }}>
          If fasting stops feeling like self-care, or food feels complicated, please put the app down and talk to
          someone. Your health matters more than any streak.
        </Text>
      </Card>

      <SectionTitle>Danger zone</SectionTitle>
      <AppButton title="Delete all data" variant="danger" onPress={onDeleteAll} />

      <Text style={{ color: t.sub, fontSize: 11, textAlign: 'center', marginTop: 8 }}>
        Fasting Tracker v1.0.0 — a wellness tool, not a medical device.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '900', marginTop: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
