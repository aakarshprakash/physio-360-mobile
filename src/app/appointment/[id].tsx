import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Linking, Platform, View } from 'react-native';
import { StatusBadge } from '@/components/AppointmentCard';
import { Avatar, Button, Card, Divider, InfoRow, Loading, Row, Screen, T } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { dayLabel, time12 } from '@/lib/format';
import type { Appointment, AppointmentStatus } from '@/lib/types';

const ACTIONS: Partial<Record<AppointmentStatus, { label: string; icon: 'checkmark-circle-outline' | 'enter-outline' | 'play-outline' | 'checkmark-done-outline' | 'close-circle-outline' | 'person-remove-outline'; variant?: 'primary' | 'outline' | 'danger' }>> = {
  confirmed: { label: 'Confirm', icon: 'checkmark-circle-outline', variant: 'outline' },
  checked_in: { label: 'Check in', icon: 'enter-outline' },
  in_progress: { label: 'Start session', icon: 'play-outline' },
  completed: { label: 'Complete', icon: 'checkmark-done-outline' },
  no_show: { label: 'No-show', icon: 'person-remove-outline', variant: 'outline' },
  cancelled: { label: 'Cancel', icon: 'close-circle-outline', variant: 'outline' },
};

export default function AppointmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: a, isLoading } = useQuery({ queryKey: ['appointment', id], queryFn: async () => (await api.get<{ data: Appointment }>(`/appointments/${id}`)).data });

  const move = useMutation({
    mutationFn: (body: { status: AppointmentStatus; reason?: string }) => api.post<{ data: Appointment }>(`/appointments/${id}/status`, body),
    onSuccess: (r) => {
      queryClient.setQueryData(['appointment', id], r.data);
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e) => Alert.alert('Could not update', errorText(e)),
  });

  const invoice = useMutation({
    mutationFn: () => api.post<{ data: { id: number } }>(`/appointments/${id}/invoice`),
    onSuccess: (r) => router.push(`/billing/${r.data.id}`),
    onError: (e) => Alert.alert('Could not create invoice', errorText(e)),
  });

  if (isLoading || !a) return <Loading />;

  const transition = (to: AppointmentStatus) => {
    if (to === 'cancelled') {
      if (Platform.OS === 'ios') {
        Alert.prompt('Cancel appointment', 'Reason for cancelling', (reason) => reason?.trim() && move.mutate({ status: 'cancelled', reason: reason.trim() }));
      } else {
        Alert.alert('Cancel appointment?', 'The slot will be freed.', [
          { text: 'Keep', style: 'cancel' },
          { text: 'Patient cancelled', onPress: () => move.mutate({ status: 'cancelled', reason: 'Patient cancelled' }) },
          { text: 'Clinic cancelled', style: 'destructive', onPress: () => move.mutate({ status: 'cancelled', reason: 'Clinic cancelled' }) },
        ]);
      }
      return;
    }
    move.mutate({ status: to });
  };

  const actions = s.can('appointments.manage') ? a.allowed_transitions.filter((t) => ACTIONS[t]) : [];
  const primary = actions.filter((t) => !['cancelled', 'no_show', 'confirmed'].includes(t));
  const secondary = actions.filter((t) => ['cancelled', 'no_show', 'confirmed'].includes(t));

  return (
    <Screen>
      <Card style={{ gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T kind="small">{dayLabel(a.local_start, true)}</T>
            <T kind="title" style={{ fontSize: 22 }}>{time12(a.local_start)} – {time12(a.local_end)}</T>
          </View>
          <StatusBadge status={a.status} />
        </Row>
        <Divider />
        <Row gap={12}>
          <Avatar name={a.patient?.full_name ?? '?'} size={48} />
          <View style={{ flex: 1 }}>
            <T kind="subheading">{a.patient?.full_name}</T>
            <T kind="small">{a.patient?.mrn}</T>
          </View>
          <Button title="Profile" small variant="secondary" onPress={() => router.push(`/patient/${a.patient?.id}`)} />
        </Row>
      </Card>

      <Card style={{ paddingVertical: 6 }}>
        <InfoRow label="Service" value={a.service?.name ?? '—'} />
        <Divider />
        <InfoRow label="Physiotherapist" value={a.practitioner?.name ?? '—'} />
        <Divider />
        <InfoRow label="Room" value={a.room?.name ?? '—'} />
        <Divider />
        <InfoRow label="Duration" value={`${a.duration_minutes} min`} />
        <Divider />
        <InfoRow label="Booked via" value={a.booked_via === 'online' ? 'Online booking' : a.booked_via === 'portal' ? 'Patient app' : 'Clinic'} />
        {a.notes ? (<><Divider /><InfoRow label="Notes" value={a.notes} /></>) : null}
      </Card>

      {primary.map((t) => (
        <Button key={t} title={ACTIONS[t]!.label} icon={ACTIONS[t]!.icon} loading={move.isPending && move.variables?.status === t} onPress={() => transition(t)} />
      ))}
      {secondary.length > 0 && (
        <Row>
          {secondary.map((t) => (
            <Button key={t} title={ACTIONS[t]!.label} icon={ACTIONS[t]!.icon} variant="outline" small loading={move.isPending && move.variables?.status === t} onPress={() => transition(t)} style={{ flex: 1 }} />
          ))}
        </Row>
      )}

      <Row>
        {s.can('clinical.write') && a.patient && (
          <Button title="Treatment note" icon="create-outline" variant="secondary" small style={{ flex: 1 }}
            onPress={() => router.push({ pathname: '/patient/note', params: { patientId: String(a.patient!.id), appointmentId: String(a.id) } })} />
        )}
        {s.can('billing.manage') && ['checked_in', 'in_progress', 'completed'].includes(a.status) && (
          <Button title="Bill visit" icon="receipt-outline" variant="secondary" small loading={invoice.isPending} onPress={() => invoice.mutate()} style={{ flex: 1 }} />
        )}
      </Row>
      {a.patient && (
        <Button title="Message patient on WhatsApp" icon="logo-whatsapp" variant="ghost"
          onPress={() => void api.get<{ data: { phone: string | null } }>(`/patients/${a.patient!.id}`).then((r) => {
            if (r.data.phone) void Linking.openURL(`https://wa.me/${r.data.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${a.patient!.full_name.split(' ')[0]}, this is ${s.tenant.name} about your appointment on ${dayLabel(a.local_start)} at ${time12(a.local_start)}.`)}`);
          })} />
      )}
    </Screen>
  );
}
