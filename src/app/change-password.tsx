import { useState } from 'react';
import { Banner, Button, Field, Input, Screen } from '@/components/ui';
import { api, ApiError, errorText } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/** First sign-in with an administrator-issued password. */
export default function ChangePasswordScreen() {
  const { session, refresh, signOut } = useAuth();
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.put('/auth/password', form);
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? (e.field('password') ?? e.field('current_password') ?? e.message) : errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Banner tone="info" title={`Welcome, ${session?.user.name.split(' ')[0] ?? ''}`} body="Your administrator created a temporary password for you. Choose your own password to continue." icon="shield-checkmark" />
      {error && <Banner tone="danger" body={error} />}
      <Field label="Temporary password" required>
        <Input secureTextEntry value={form.current_password} onChangeText={(v) => setForm({ ...form, current_password: v })} textContentType="password" />
      </Field>
      <Field label="New password" required hint="At least 8 characters with letters and numbers.">
        <Input secureTextEntry value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} textContentType="newPassword" />
      </Field>
      <Field label="Confirm new password" required>
        <Input secureTextEntry value={form.password_confirmation} onChangeText={(v) => setForm({ ...form, password_confirmation: v })} textContentType="newPassword" />
      </Field>
      <Button title="Save and continue" icon="checkmark" loading={busy} onPress={save} />
      <Button title="Sign out" variant="ghost" onPress={() => void signOut()} />
    </Screen>
  );
}
