import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/components/useTheme';
import { AppButton, Card, ChoiceRow, Screen, SectionTitle, TextInputField } from '@/components/ui';
import { FastingPlan } from '@/lib/plans';

export default function PlansScreen() {
  const t = useTheme();
  const plans = useStore((s) => s.plans);
  const activePlanId = useStore((s) => s.settings.activePlanId);
  const activatePlan = useStore((s) => s.activatePlan);
  const addCustomPlan = useStore((s) => s.addCustomPlan);
  const deleteCustomPlan = useStore((s) => s.deleteCustomPlan);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [name, setName] = useState('');
  const [fastHours, setFastHours] = useState('16');

  const presets = plans.filter((p) => p.isPreset);
  const customs = plans.filter((p) => !p.isPreset);

  const onSelect = (plan: FastingPlan) => {
    if (plan.id === activePlanId) return;
    Alert.alert(
      `Switch to ${plan.name}?`,
      'Your history stays exactly as it is. The new plan applies from your next fast.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Use this plan', onPress: () => activatePlan(plan.id) },
      ]
    );
  };

  const onCreate = async () => {
    const hours = Number(fastHours.replace(',', '.'));
    if (!Number.isFinite(hours) || hours < 1 || hours > 36) {
      Alert.alert('Invalid length', 'Fasting windows between 1 and 36 hours are supported.');
      return;
    }
    if (hours > 24) {
      Alert.alert(
        'Extended fast',
        'Fasts longer than 24 hours are not recommended as a routine and should only be done with guidance from a healthcare professional.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'I understand',
            style: 'destructive',
            onPress: async () => {
              const id = await addCustomPlan(name.trim() || `${hours}h fast`, hours);
              await activatePlan(id);
              setBuilderOpen(false);
              setName('');
              setFastHours('16');
            },
          },
        ]
      );
      return;
    }
    const id = await addCustomPlan(name.trim() || `${hours}h fast`, hours);
    await activatePlan(id);
    setBuilderOpen(false);
    setName('');
    setFastHours('16');
  };

  return (
    <Screen>
      <Text style={[styles.title, { color: t.text }]}>Fasting plans</Text>
      <Text style={{ color: t.sub, fontSize: 13 }}>
        All plans are free — pick what fits your life. Your fast history is never reset when you switch.
      </Text>

      <SectionTitle>Preset plans</SectionTitle>
      {presets.map((p) => (
        <ChoiceRow
          key={p.id}
          title={`${p.name} — ${p.level}`}
          sub={p.description}
          selected={p.id === activePlanId}
          onPress={() => onSelect(p)}
        />
      ))}

      <SectionTitle
        action={
          <Pressable onPress={() => setBuilderOpen((v) => !v)} hitSlop={8}>
            <Text style={{ color: t.primary, fontWeight: '700', fontSize: 13 }}>
              {builderOpen ? 'Close' : '+ Custom'}
            </Text>
          </Pressable>
        }
      >
        Custom plans
      </SectionTitle>

      {builderOpen ? (
        <Card style={{ gap: 12 }}>
          <TextInputField label="Plan name" value={name} onChangeText={setName} placeholder={`e.g. Weekday ${fastHours}h`} />
          <TextInputField
            label="Fasting window"
            value={fastHours}
            onChangeText={setFastHours}
            keyboardType="decimal-pad"
            suffix="hours fast / rest is eating"
          />
          <Text style={{ color: t.sub, fontSize: 12 }}>
            A fasting window of 1–24 hours covers most schedules. Anything above 24 needs extra care — we will ask you to confirm.
          </Text>
          <AppButton title="Create and use this plan" onPress={onCreate} />
        </Card>
      ) : null}

      {customs.length === 0 && !builderOpen ? (
        <Text style={{ color: t.sub, fontSize: 13 }}>No custom plans yet. Build one that fits your routine.</Text>
      ) : null}
      {customs.map((p) => (
        <View key={p.id} style={styles.customRow}>
          <View style={{ flex: 1 }}>
            <ChoiceRow
              title={`${p.name} — ${p.fastHours}h fast`}
              sub={`${p.eatHours}h eating window`}
              selected={p.id === activePlanId}
              onPress={() => onSelect(p)}
            />
          </View>
          <Pressable
            hitSlop={8}
            onPress={() =>
              Alert.alert(`Delete ${p.name}?`, 'This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteCustomPlan(p.id) },
              ])
            }
          >
            <Text style={{ color: t.danger, fontWeight: '700', paddingHorizontal: 6 }}>✕</Text>
          </Pressable>
        </View>
      ))}

      <Card style={{ gap: 4 }}>
        <Text style={{ color: t.text, fontWeight: '700', fontSize: 14 }}>Weekly patterns like 5:2</Text>
        <Text style={{ color: t.sub, fontSize: 13 }}>
          Weekly fasting patterns (fasting on 2 chosen days per week) are on the roadmap. For now you can log those fasts
          retroactively and they will count fully toward your stats and streak.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '900', marginTop: 8 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
