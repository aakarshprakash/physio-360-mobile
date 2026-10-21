import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banner, Button, Field, Input, Row, T } from '@/components/ui';
import { ApiError, currentServer, defaultServer, errorText } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { KEYS, storage } from '@/lib/storage';
import { colors, radius } from '@/lib/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServerText] = useState(currentServer() || defaultServer());
  const [showServer, setShowServer] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void storage.get(KEYS.email).then((e) => e && setEmail(e));
  }, []);

  const submit = async () => {
    if (!email.trim() || !password) return setError('Enter your work email and password.');
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password, server);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 422 ? 'These credentials do not match our records.' : errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.ink }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: 28, gap: 6, marginBottom: 28 }}>
          <Row gap={10}>
            <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="body" size={26} color="#fff" />
            </View>
            <View>
              <T kind="title" style={{ color: '#fff', fontSize: 24 }}>Physio360</T>
              <T kind="small" style={{ color: colors.mint, letterSpacing: 1.2, fontSize: 11, fontWeight: '700' }}>BY SYSNAC</T>
            </View>
          </Row>
          <T kind="title" style={{ color: '#fff', marginTop: 28 }}>Welcome back</T>
          <T kind="muted" style={{ color: '#B9CCC6' }}>Sign in with the account your clinic created for you. What you see depends on your role.</T>
        </View>

        <View style={{ flex: 1, backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 16 }}>
          {error && <Banner tone="danger" body={error} />}
          <Field label="Work email">
            <Input value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="username" autoComplete="email" placeholder="you@clinic.com" accessibilityLabel="Work email" />
          </Field>
          <Field label="Password">
            <View>
              <Input value={password} onChangeText={setPassword} secureTextEntry={!showPassword} textContentType="password" autoComplete="password" placeholder="••••••••" onSubmitEditing={submit} returnKeyType="go" accessibilityLabel="Password" style={{ paddingRight: 48 }} />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={{ position: 'absolute', right: 12, top: 12 }} accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} hitSlop={8}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.muted} />
              </Pressable>
            </View>
          </Field>
          <Button title="Sign in" icon="log-in-outline" loading={busy} onPress={submit} />

          <Pressable onPress={() => void Linking.openURL(`${server.replace(/\/$/, '').replace(':8000', ':5173')}/forgot-password`)} style={{ alignSelf: 'center', padding: 6 }}>
            <T kind="label" style={{ color: colors.primary }}>Forgot password?</T>
          </Pressable>

          <View style={{ marginTop: 'auto', gap: 10 }}>
            <Pressable onPress={() => setShowServer((v) => !v)} style={{ alignSelf: 'center' }} hitSlop={8}>
              <Row gap={6}>
                <Ionicons name="server-outline" size={14} color={colors.muted} />
                <T kind="small">Clinic server: {server.replace(/^https?:\/\//, '')}</T>
              </Row>
            </Pressable>
            {showServer && (
              <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, gap: 8, borderWidth: 1, borderColor: colors.border }}>
                <Field label="Server address" hint="Provided by your clinic administrator.">
                  <Input value={server} onChangeText={setServerText} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://clinic.physio360.app" />
                </Field>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
