import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ApiError } from '@/lib/api';
import { AuthProvider, useAuth } from '@/lib/auth';
import { BiometricGate } from '@/components/BiometricGate';
import { colors } from '@/lib/theme';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: (n, e) => !(e instanceof ApiError && e.status > 0 && e.status < 500) && n < 2 },
  },
});

function RootNavigator() {
  const { session } = useAuth();
  const restoring = session === undefined;

  useEffect(() => {
    if (!restoring) void SplashScreen.hideAsync();
  }, [restoring]);

  if (restoring) return null;

  const signedIn = !!session;
  const mustChange = !!session?.must_change_password;

  return (
    <BiometricGate active={signedIn}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && mustChange}>
          <Stack.Screen name="change-password" options={{ title: 'Set your password', headerBackVisible: false }} />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && !mustChange}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="appointment/[id]" options={{ title: 'Appointment' }} />
          <Stack.Screen name="appointment/new" options={{ title: 'New appointment', presentation: 'modal' }} />
          <Stack.Screen name="patient/[id]" options={{ title: 'Patient' }} />
          <Stack.Screen name="patient/new" options={{ title: 'New patient', presentation: 'modal' }} />
          <Stack.Screen name="patient/note" options={{ title: 'Treatment note', presentation: 'modal' }} />
          <Stack.Screen name="leave/index" options={{ title: 'Leave' }} />
          <Stack.Screen name="leave/apply" options={{ title: 'Apply for leave', presentation: 'modal' }} />
          <Stack.Screen name="attendance" options={{ title: 'My attendance' }} />
          <Stack.Screen name="bookings" options={{ title: 'Online bookings' }} />
          <Stack.Screen name="billing/index" options={{ title: 'Billing' }} />
          <Stack.Screen name="billing/[id]" options={{ title: 'Invoice' }} />
          <Stack.Screen name="staff/index" options={{ title: 'Team' }} />
          <Stack.Screen name="staff/[id]" options={{ title: 'Team member' }} />
          <Stack.Screen name="payslips" options={{ title: 'My payslips' }} />
          <Stack.Screen name="profile" options={{ title: 'Profile & security' }} />
        </Stack.Protected>
      </Stack>
    </BiometricGate>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}
