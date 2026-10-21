import { useEffect, useState } from 'react';
import { Alert, Platform, Switch, View } from 'react-native';
import { biometricsAvailable } from '@/components/BiometricGate';
import { Avatar, Banner, Button, Card, Divider, Field, InfoRow, Input, Row, Screen, T } from '@/components/ui';
import { api, ApiError, currentServer, errorText } from '@/lib/api';
import { useAuth, useSession } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/format';
import { KEYS, storage } from '@/lib/storage';
import { colors } from '@/lib/theme';

export default function ProfileScreen() {
  const s = useSession();
  const { signOut } = useAuth();
  const [bio, setBio] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [pw, setPw] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void biometricsAvailable().then(setBioAvailable);
    void storage.get(KEYS.biometric).then((v) => setBio(v === '1'));
  }, []);

  const toggleBio = async (on: boolean) => {
    setBio(on);
    await storage.set(KEYS.biometric, on ? '1' : '0');
  };

  const changePassword = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.put('/auth/password', pw);
      setPw({ current_password: '', password: '', password_confirmation: '' });
      Alert.alert('Password changed', 'Your other devices have been signed out.');
    } catch (e) {
      setError(e instanceof ApiError ? (e.field('current_password') ?? e.field('password') ?? e.message) : errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Card style={{ gap: 12 }}>
        <Row gap={14}>
          <Avatar name={s.user.name} color={s.user.color} size={60} />
          <View style={{ flex: 1 }}>
            <T kind="heading">{s.user.name}</T>
            <T kind="small">{ROLE_LABELS[s.role] ?? s.role}</T>
          </View>
        </Row>
        <Divider />
        <InfoRow label="Email" value={s.user.email} />
        <InfoRow label="Clinic" value={s.tenant.name} />
        <InfoRow label="Branches" value={s.branches.map((b) => b.name).join(', ')} />
        <InfoRow label="Server" value={currentServer().replace(/^https?:\/\//, '')} />
      </Card>

      {Platform.OS !== 'web' && (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T kind="subheading">App lock</T>
              <T kind="small">{bioAvailable ? 'Require Face ID / fingerprint to open the app.' : 'Set up a fingerprint or face unlock on this device to use app lock.'}</T>
            </View>
            <Switch value={bio} disabled={!bioAvailable} onValueChange={(v) => void toggleBio(v)} trackColor={{ true: colors.primary, false: colors.border }} accessibilityLabel="App lock" />
          </Row>
        </Card>
      )}

      <Card style={{ gap: 12 }}>
        <T kind="subheading">Change password</T>
        {error && <Banner tone="danger" body={error} />}
        <Field label="Current password"><Input secureTextEntry value={pw.current_password} onChangeText={(v) => setPw({ ...pw, current_password: v })} textContentType="password" /></Field>
        <Field label="New password" hint="At least 8 characters with letters and numbers."><Input secureTextEntry value={pw.password} onChangeText={(v) => setPw({ ...pw, password: v })} textContentType="newPassword" /></Field>
        <Field label="Confirm new password"><Input secureTextEntry value={pw.password_confirmation} onChangeText={(v) => setPw({ ...pw, password_confirmation: v })} textContentType="newPassword" /></Field>
        <Button title="Update password" icon="key-outline" loading={busy} onPress={changePassword} />
      </Card>

      <Button title="Sign out" icon="log-out-outline" variant="outline" onPress={() => void signOut()} />
    </Screen>
  );
}
