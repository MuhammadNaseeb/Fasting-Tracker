import React from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/components/useTheme';
import { AppButton, Screen } from '@/components/ui';
import { MEDICAL_DISCLAIMER } from '@/lib/safety';

export default function Disclaimer() {
  const t = useTheme();
  return (
    <Screen>
      <Text style={{ fontSize: 26, fontWeight: '900', color: t.text, marginTop: 8 }}>Medical disclaimer</Text>
      <Text style={{ color: t.sub, fontSize: 14, lineHeight: 22, marginTop: 8 }}>{MEDICAL_DISCLAIMER}</Text>
      <AppButton title="Close" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
