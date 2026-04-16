import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '../src/store/useAppStore';

const queryClient = new QueryClient({
  defaultOptions: { mutations: { retry: 1 } },
});

function OnboardingGate() {
  const router = useRouter();
  const segments = useSegments();
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);
  const _hasHydrated = useAppStore((s) => s._hasHydrated);

  useEffect(() => {
    if (!_hasHydrated) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!hasOnboarded && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [_hasHydrated, hasOnboarded, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <OnboardingGate />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="signing"
            options={{ presentation: 'fullScreenModal', headerShown: false }}
          />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen
            name="learn/index"
            options={{ title: 'Lessons', headerTintColor: '#fff', headerStyle: { backgroundColor: '#111' } }}
          />
          <Stack.Screen name="learn/[lessonId]" options={{ headerShown: false }} />
          <Stack.Screen name="translate" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
