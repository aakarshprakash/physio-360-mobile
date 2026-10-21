import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Linking, Share, View } from 'react-native';
import { Avatar, Badge, Button, Card, Divider, IconButton, InfoRow, Loading, Row, Screen, Stat, T } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { dateLabel, moneyCompact, ROLE_LABELS } from '@/lib/format';
import { presenceLabel } from '@/lib/hr';
import type { Presence } from '@/lib/types';

interface Detail {
  profile: {
    id: number; name: string; email: string; phone: string | null; title: string | null; color: string; role: string | null; is_active: boolean;
    employee_code: string | null; employment_type: string | null; joined_on: string | null; qualification: string | null; registration_number: string | null;
    emergency_contact_name?: string | null; emergency_contact_phone?: string | null; last_login_at: string | null;
  };
  stats: {
    appointments: { total: number; completed: number; completion_rate: number | null; upcoming_7_days: number };
    patients_seen: number; revenue_minor: number; rating: { average: number | null; count: number };
    attendance: { present: number; absent: number; leave: number; late: number; minutes: number } | null;
    presence_today: Presence;
  };
}

const EMPLOYMENT: Record<string, string> = { full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', visiting: 'Visiting', intern: 'Intern' };

export default function StaffMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const { data, isLoading } = useQuery({ queryKey: ['staff', 'detail', id], queryFn: async () => (await api.get<{ data: Detail }>(`/staff/${id}`)).data });

  const reset = useMutation({
    mutationFn: () => api.post<{ meta: { temporary_password: string | null } }>(`/staff/${id}/password`, { mode: 'generate', require_change: true }),
    onSuccess: (r) => {
      const pw = r.meta.temporary_password;
      if (!pw || !data) return;
      const msg = `Hello ${data.profile.name.split(' ')[0]}, your Physio360 password for ${s.tenant.name} was reset.\nEmail: ${data.profile.email}\nTemporary password: ${pw}\nYou will be asked to set a new one when you sign in.`;
      Alert.alert('Temporary password', `${pw}\n\nShare it securely. They must change it at next sign-in.`, [
        { text: 'Done', style: 'cancel' },
        { text: 'Share', onPress: () => void Share.share({ message: msg }) },
      ]);
    },
    onError: (e) => Alert.alert('Could not reset password', errorText(e)),
  });

  if (isLoading || !data) return <Loading />;
  const p = data.profile;
  const st = data.stats;
  const pres = presenceLabel(st.presence_today);
  const phone = (p.phone ?? '').replace(/[^\d+]/g, '');

  const confirmReset = () =>
    Alert.alert('Reset password?', `${p.name} will be signed out of all devices and get a temporary password.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => reset.mutate() },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: p.name }} />
      <Card style={{ gap: 12 }}>
        <Row gap={14}>
          <Avatar name={p.name} color={p.color} size={64} />
          <View style={{ flex: 1, gap: 4 }}>
            <T kind="heading">{p.name}</T>
            <T kind="small">{[ROLE_LABELS[p.role ?? ''], p.employee_code].filter(Boolean).join(' · ')}</T>
            <Row gap={6}><Badge label={pres.label} tone={pres.tone} />{!p.is_active && <Badge label="Inactive" tone="danger" />}</Row>
          </View>
        </Row>
        <Row>
          {phone ? <IconButton icon="call" label="Call" tone="primary" onPress={() => void Linking.openURL(`tel:${phone}`)} /> : null}
          {phone ? <IconButton icon="logo-whatsapp" label="WhatsApp" tone="success" onPress={() => void Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)} /> : null}
          <IconButton icon="mail" label="Email" tone="info" onPress={() => void Linking.openURL(`mailto:${p.email}`)} />
        </Row>
      </Card>

      {st.appointments.total > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Stat label="Appointments (month)" value={st.appointments.total} icon="calendar" hint={`${st.appointments.completion_rate ?? 0}% completed`} />
          <Stat label="Patients seen" value={st.patients_seen} icon="people" tone="info" />
          <Stat label="Revenue billed" value={moneyCompact(st.revenue_minor, s.tenant.currency)} icon="trending-up" tone="violet" />
          <Stat label="Rating" value={st.rating.average ? `${st.rating.average} ★` : '—'} icon="star" tone="warning" hint={`${st.rating.count} reviews`} />
        </View>
      )}

      {st.attendance && (
        <Card style={{ paddingVertical: 6 }}>
          <T kind="caption" style={{ paddingTop: 6 }}>Attendance this month</T>
          <InfoRow label="Present" value={`${st.attendance.present} days`} />
          <Divider />
          <InfoRow label="Late arrivals" value={st.attendance.late} />
          <Divider />
          <InfoRow label="Leave / absent" value={`${st.attendance.leave} / ${st.attendance.absent}`} />
          <Divider />
          <InfoRow label="Hours worked" value={Math.round(st.attendance.minutes / 60)} />
        </Card>
      )}

      <Card style={{ paddingVertical: 6 }}>
        <T kind="caption" style={{ paddingTop: 6 }}>Employment</T>
        <InfoRow label="Type" value={EMPLOYMENT[p.employment_type ?? ''] ?? '—'} />
        <Divider />
        <InfoRow label="Joined" value={dateLabel(p.joined_on)} />
        <Divider />
        <InfoRow label="Qualification" value={p.qualification ?? '—'} />
        <Divider />
        <InfoRow label="Registration no." value={p.registration_number ?? '—'} />
        <Divider />
        <InfoRow label="Emergency contact" value={p.emergency_contact_name ? `${p.emergency_contact_name} · ${p.emergency_contact_phone ?? ''}` : '—'} />
      </Card>

      {p.id !== s.user.id && p.is_active && (p.role !== 'owner' || s.role === 'owner') && (
        <Button title="Reset password" icon="key-outline" variant="outline" loading={reset.isPending} onPress={confirmReset} />
      )}
      <T kind="small" style={{ textAlign: 'center' }}>Edit employee records, roles and working hours from the web portal.</T>
    </Screen>
  );
}
