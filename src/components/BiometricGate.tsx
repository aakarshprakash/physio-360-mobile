import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { KEYS, storage } from '@/lib/storage';
import { colors } from '@/lib/theme';
import { Button, T } from './ui';

/** Re-lock after this long in the background. */
const RELOCK_AFTER_MS = 5 * 60_000;

export async function biometricsAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}

/**
 * Optional app lock (Face ID / fingerprint) for a signed-in session, since
 * the app holds patient data. Enabled from Profile & security.
 */
export function BiometricGate({ active, children }: { active: boolean; children: ReactNode }) {
  const { signOut } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Physio360', cancelLabel: 'Cancel' });
    if (result.success) setLocked(false);
  }, []);

  useEffect(() => {
    if (!active) return;
    void storage.get(KEYS.biometric).then((v) => {
      const on = v === '1' && Platform.OS !== 'web';
      setEnabled(on);
      setLocked(on);
      if (on) void unlock();
    });
  }, [active, unlock]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgroundedAt.current = Date.now();
      if (state === 'active' && enabled && backgroundedAt.current && Date.now() - backgroundedAt.current > RELOCK_AFTER_MS) {
        setLocked(true);
        void unlock();
      }
    });
    return () => sub.remove();
  }, [enabled, unlock]);

  if (!active || !locked) return <>{children}</>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
      <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="lock-closed" size={38} color={colors.mint} />
      </View>
      <T kind="title" style={{ color: '#fff' }}>Physio360 is locked</T>
      <T kind="muted" style={{ color: '#B9CCC6', textAlign: 'center' }}>Unlock with Face ID, fingerprint or your device passcode.</T>
      <Button title="Unlock" icon="finger-print" onPress={() => void unlock()} style={{ alignSelf: 'stretch', backgroundColor: colors.mint, borderColor: colors.mint }} />
      <Button title="Sign out" variant="ghost" onPress={() => void signOut()} />
    </View>
  );
}
