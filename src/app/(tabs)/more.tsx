import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Linking, Platform, View } from 'react-native';
import { Avatar, Card, Divider, ListItem, Row, Screen, SectionTitle, T, type IconName } from '@/components/ui';
import { currentServer } from '@/lib/api';
import { useAuth, useSession } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/format';
import { colors } from '@/lib/theme';
import type { Permission } from '@/lib/types';

interface Entry { icon: IconName; title: string; subtitle: string; to: string; perm?: Permission }

const SECTIONS: { title: string; items: Entry[] }[] = [
  {
    title: 'Front desk',
    items: [
      { icon: 'globe-outline', title: 'Online bookings', subtitle: 'Confirm requests from your website & WhatsApp', to: '/bookings', perm: 'appointments.manage' },
      { icon: 'calendar-number-outline', title: 'Book appointment', subtitle: 'Find a free slot', to: '/appointment/new', perm: 'appointments.manage' },
      { icon: 'person-add-outline', title: 'Register patient', subtitle: 'Add a new patient record', to: '/patient/new', perm: 'patients.manage' },
    ],
  },
  {
    title: 'Finance',
    items: [{ icon: 'receipt-outline', title: 'Billing', subtitle: 'Invoices, dues and payments', to: '/billing', perm: 'billing.view' }],
  },
  {
    title: 'Team & HR',
    items: [
      { icon: 'people-circle-outline', title: 'Team directory', subtitle: 'Staff, roles and who is in', to: '/staff', perm: 'staff.manage' },
      { icon: 'airplane-outline', title: 'Leave', subtitle: 'Requests, balances and approvals', to: '/leave' },
      { icon: 'time-outline', title: 'My attendance', subtitle: 'Monthly clock-in history', to: '/attendance' },
      { icon: 'document-text-outline', title: 'My payslips', subtitle: 'Download monthly payslips', to: '/payslips' },
    ],
  },
  {
    title: 'Account',
    items: [{ icon: 'shield-checkmark-outline', title: 'Profile & security', subtitle: 'Password, app lock, devices', to: '/profile' }],
  },
];

export default function MoreScreen() {
  const s = useSession();
  const { signOut } = useAuth();
  const router = useRouter();

  const confirmSignOut = () => {
    if (Platform.OS === 'web') return void signOut();
    Alert.alert('Sign out?', 'You will need your password to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <Screen>
      <Card onPress={() => router.push('/profile')}>
        <Row gap={14}>
          <Avatar name={s.user.name} color={s.user.color} size={56} />
          <View style={{ flex: 1 }}>
            <T kind="heading">{s.user.name}</T>
            <T kind="small">{ROLE_LABELS[s.role] ?? s.role} · {s.tenant.name}</T>
            <T kind="small" style={{ fontSize: 12 }}>{s.user.email}</T>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
        </Row>
      </Card>

      {SECTIONS.map((section) => {
        const items = section.items.filter((i) => !i.perm || s.can(i.perm));
        if (!items.length) return null;
        return (
          <View key={section.title} style={{ gap: 8 }}>
            <SectionTitle title={section.title} />
            <Card style={{ paddingVertical: 2 }}>
              {items.map((i, idx) => (
                <View key={i.title}>
                  {idx > 0 && <Divider />}
                  <ListItem
                    title={i.title}
                    subtitle={i.subtitle}
                    left={<View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={i.icon} size={20} color={colors.primary} /></View>}
                    onPress={() => router.push(i.to as never)}
                  />
                </View>
              ))}
            </Card>
          </View>
        );
      })}

      <Card style={{ paddingVertical: 2 }}>
        <ListItem title="Open the web portal" subtitle="Reports, settings and everything else" left={<Ionicons name="desktop-outline" size={22} color={colors.muted} />} onPress={() => void Linking.openURL(currentServer().replace(':8000', ':5173'))} />
        <Divider />
        <ListItem title="Sign out" left={<Ionicons name="log-out-outline" size={22} color={colors.danger} />} right={<View />} onPress={confirmSignOut} />
      </Card>
      <T kind="small" style={{ textAlign: 'center', color: colors.subtle }}>Physio360 by SYSNAC · v1.0.0</T>
    </Screen>
  );
}
