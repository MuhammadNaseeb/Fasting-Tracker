import React from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/components/useTheme';
import { AppButton, Card, Screen } from '@/components/ui';
import { EATING_DISORDER_RESOURCES } from '@/lib/safety';

export default function Support() {
  const t = useTheme();
  return (
    <Screen>
      <Text style={{ fontSize: 26, fontWeight: '900', color: t.text, marginTop: 8 }}>Support resources</Text>
      <Card style={{ marginTop: 12 }}>
        <Text style={{ color: t.sub, fontSize: 14, lineHeight: 22 }}>{EATING_DISORDER_RESOURCES}</Text>
      </Card>
      <Card>
        <Text style={{ color: t.sub, fontSize: 13, lineHeight: 20 }}>
          Tracking apps are tools, not measures of worth. If numbers in this app ever make you feel worse about
          yourself, that is a sign to step back — not to try harder. Talk to a professional; it works.
        </Text>
      </Card>
      <AppButton title="Close" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
