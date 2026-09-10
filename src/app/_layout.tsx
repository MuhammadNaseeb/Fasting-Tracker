import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/components/useTheme';
import { Loading } from '@/components/ui';
import { startOfLocalDay } from '@/lib/time';

function useAppLifecycle() {
  const init = useStore((s) => s.init);
  const ready = useStore((s) => s.ready);
  const refreshWaterToday = useStore((s) => s.refreshWaterToday);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!ready) return;
    let lastDay = startOfLocalDay(Date.now());
    let lastTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const day = startOfLocalDay(Date.now());
        if (day !== lastDay) {
          lastDay = day;
          refreshWaterToday();
        }
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz !== lastTz) {
          lastTz = tz;
          init();
        }
      }
    });
    return () => sub.remove();
  }, [ready, refreshWaterToday, init]);
}

export default function RootLayout() {
  useAppLifecycle();
  const ready = useStore((s) => s.ready);
  const onboarded = useStore((s) => s.settings.onboarded);
  const celebration = useStore((s) => s.celebration);
  const t = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!onboarded && pathname !== '/onboarding') {
      router.replace('/onboarding');
    } else if (onboarded && pathname === '/onboarding') {
      router.replace('/(tabs)');
    } else if (celebration && pathname !== '/celebration') {
      router.push('/celebration');
    }
  }, [ready, onboarded, celebration, pathname]);

  if (!ready) return <Loading />;

  return (
    <>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="celebration" options={{ gestureEnabled: false }} />
        <Stack.Screen name="log-past-fast" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-fast" options={{ presentation: 'modal' }} />
        <Stack.Screen name="disclaimer" options={{ presentation: 'modal' }} />
        <Stack.Screen name="support" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
