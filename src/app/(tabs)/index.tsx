import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppointmentCard } from '@/components/AppointmentCard';
import { ClockCard } from '@/components/ClockCard';
import { Avatar, Card, Empty, Row, Screen, SectionTitle, Stat, T, type IconName } from '@/components/ui';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { dayLabel, greeting, money, moneyCompact, ROLE_LABELS, todayIn } from '@/lib/format';
import { useLightStatusBar } from '@/lib/statusBar';
import { colors, radius } from '@/lib/theme';
import type { Appointment, LeaveRequest, OnlineBooking } from '@/lib/types';

interface Dashboard {
  kpis: {
    today_appointments: { value: number; change_pct: number | null };
    active_patients: { value: number; change_pct: number | null };
    revenue_month_minor?: { value: number; change_pct: number | null };
    pending_payments?: { count: number; amount_minor: number };
  };
  today: Appointment[];
}

/** Role-aware home: owners see the business, therapists their day, front desk the queue. */
export default function HomeScreen() {
  const s = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useLightStatusBar();
  const tz = s.tenant.timezone;
  const manager = s.can('staff.manage');
  const finance = s.can('billing.view');

  const dash = useQuery({
    queryKey: ['dashboard', s.user.is_practitioner && !manager],
    queryFn: async () => (await api.get<{ data: Dashboard }>('/dashboard', { mine: s.user.is_practitioner && !manager ? 1 : undefined })).data,
  });
  const bookings = useQuery({
    queryKey: ['online-bookings', 'pending-count'],
    queryFn: async () => (await api.get<{ data: OnlineBooking[]; meta: { counts: { pending: number } } }>('/online-bookings', { status: 'pending' })).meta.counts.pending,
    enabled: s.can('appointments.manage'),
  });
  const approvals = useQuery({
    queryKey: ['leave', 'team-pending'],
    queryFn: async () => (await api.get<{ data: LeaveRequest[] }>('/leave-requests', { scope: 'team', status: 'pending' })).data.length,
    enabled: s.can('leave.approve'),
  });

  const refresh = () => {
    void dash.refetch();
    void bookings.refetch();
    void approvals.refetch();
  };

  const k = dash.data?.kpis;
  const mine = s.user.is_practitioner && !manager;
  const today = (dash.data?.today ?? []).filter((a) => !mine || a.practitioner?.id === s.user.id);

  const quick: { icon: IconName; label: string; to: string; show: boolean }[] = [
    { icon: 'calendar-number-outline', label: 'Book', to: '/appointment/new', show: s.can('appointments.manage') },
    { icon: 'person-add-outline', label: 'New patient', to: '/patient/new', show: s.can('patients.manage') },
    { icon: 'globe-outline', label: 'Online', to: '/bookings', show: s.can('appointments.manage') },
    { icon: 'receipt-outline', label: 'Billing', to: '/billing', show: s.can('billing.view') },
    { icon: 'airplane-outline', label: 'Leave', to: '/leave/apply', show: true },
    { icon: 'people-circle-outline', label: 'Team', to: '/staff', show: manager },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <Screen padded={false} refreshing={dash.isRefetching} onRefresh={refresh}>
      <View style={{ backgroundColor: colors.ink, paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 56, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T kind="small" style={{ color: '#B9CCC6' }}>{dayLabel(todayIn(tz), true)} · {s.tenant.name}</T>
            <T kind="title" style={{ color: '#fff', marginTop: 4 }}>{greeting(tz)}, {s.user.name.replace(/^Dr\.\s*/, 'Dr. ').split(' ').slice(0, 2).join(' ')}</T>
            <T kind="small" style={{ color: colors.mint, marginTop: 2 }}>{ROLE_LABELS[s.role] ?? s.role}</T>
          </View>
          <Pressable onPress={() => router.push('/profile')} accessibilityLabel="Profile">
            <Avatar name={s.user.name} color={s.user.color} size={46} />
          </Pressable>
        </Row>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: -40, gap: 14 }}>
        <ClockCard />

        {(!!bookings.data || !!approvals.data) && (
          <Card style={{ gap: 4, paddingVertical: 6 }}>
            {!!bookings.data && <Alert icon="globe-outline" text={`${bookings.data} online booking request${bookings.data > 1 ? 's' : ''} to confirm`} onPress={() => router.push('/bookings')} />}
            {!!approvals.data && <Alert icon="airplane-outline" text={`${approvals.data} leave request${approvals.data > 1 ? 's' : ''} awaiting approval`} onPress={() => router.push('/leave')} />}
          </Card>
        )}

        {k && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Stat label={mine ? 'My appointments today' : "Today's appointments"} value={mine ? today.length : k.today_appointments.value} icon="calendar" onPress={s.can('appointments.view') ? () => router.push('/schedule') : undefined} />
            {finance && k.revenue_month_minor ? (
              <Stat label="Revenue this month" value={moneyCompact(k.revenue_month_minor.value, s.tenant.currency)} icon="trending-up" tone="violet" hint={k.revenue_month_minor.change_pct != null ? `${k.revenue_month_minor.change_pct > 0 ? '+' : ''}${k.revenue_month_minor.change_pct}% vs last month` : undefined} />
            ) : (
              <Stat label="Active patients" value={k.active_patients.value} icon="people" tone="info" />
            )}
            {finance && k.pending_payments && (
              <Stat label="Pending payments" value={k.pending_payments.count} icon="wallet" tone="warning" hint={money(k.pending_payments.amount_minor, s.tenant.currency)} onPress={() => router.push('/billing')} />
            )}
            {finance && <Stat label="Active patients" value={k.active_patients.value} icon="people" tone="info" />}
          </View>
        )}

        <SectionTitle title="Quick actions" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {quick.filter((q) => q.show).map((q) => (
            <Pressable key={q.label} onPress={() => router.push(q.to as never)} accessibilityRole="button"
              style={({ pressed }) => ({ width: '31%', flexGrow: 1, alignItems: 'center', gap: 8, paddingVertical: 14, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.7 : 1 })}>
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={q.icon} size={21} color={colors.primary} />
              </View>
              <T kind="label">{q.label}</T>
            </Pressable>
          ))}
        </View>

        {s.can('appointments.view') && (
          <>
            <SectionTitle title={mine ? 'My schedule today' : "Today's schedule"} action="See all" onAction={() => router.push('/schedule')} />
            {dash.isLoading ? null : today.length === 0 ? (
              <Card><Empty icon="sunny-outline" title="No appointments today" body="Enjoy the calm, or book someone in." /></Card>
            ) : (
              today.slice(0, 6).map((a) => <AppointmentCard key={a.id} a={a} showPractitioner={!mine} onPress={() => router.push(`/appointment/${a.id}`)} />)
            )}
          </>
        )}
      </View>
    </Screen>
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.ink }} />
    </View>
  );
}

function Alert({ icon, text, onPress }: { icon: IconName; text: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }} accessibilityRole="button">
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.warningSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={17} color={colors.warning} />
      </View>
      <T kind="label" style={{ flex: 1 }}>{text}</T>
      <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
    </Pressable>
  );
}
