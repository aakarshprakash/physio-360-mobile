import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Linking, Share, View } from 'react-native';
import { Avatar, Badge, Banner, Button, Card, Empty, IconButton, Loading, Row, Screen, Segmented, T } from '@/components/ui';
import { api, currentServer, errorText } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { dayLabel, instant, time12 } from '@/lib/format';
import type { OnlineBooking } from '@/lib/types';

type Status = 'pending' | 'confirmed' | 'declined';

const SOURCES: Record<string, string> = { link: 'Link', website: 'Website', whatsapp: 'WhatsApp', qr: 'QR code' };

export default function BookingsScreen() {
  const s = useSession();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('pending');
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['online-bookings', status],
    queryFn: async () => api.get<{ data: OnlineBooking[]; meta: { counts: Record<string, number> } }>('/online-bookings', { status }),
  });

  const act = useMutation({
    mutationFn: ({ b, action }: { b: OnlineBooking; action: 'confirm' | 'decline' }) => api.post<{ data: OnlineBooking }>(`/online-bookings/${b.id}/${action}`, action === 'decline' ? { note: 'Declined from mobile' } : {}),
    onSuccess: (r, { b, action }) => {
      void queryClient.invalidateQueries({ queryKey: ['online-bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      const first = b.name.split(' ')[0];
      const text = action === 'confirm'
        ? `Hello ${first}, your appointment at ${s.tenant.name} is confirmed for ${dayLabel(r.data.local_start)} at ${time12(r.data.local_start)}. Reference ${b.reference}.`
        : `Hello ${first}, thank you for your request to ${s.tenant.name}. Unfortunately ${dayLabel(b.local_start)} ${time12(b.local_start)} is not available. Please reply with another convenient time.`;
      Alert.alert(action === 'confirm' ? 'Appointment booked' : 'Request declined', 'Let the patient know on WhatsApp?', [
        { text: 'Not now', style: 'cancel' },
        { text: 'WhatsApp', onPress: () => void Linking.openURL(`https://wa.me/${b.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`) },
      ]);
    },
    onError: (e) => Alert.alert('Could not update', errorText(e)),
  });

  const counts = data?.meta.counts ?? {};
  const link = `${currentServer().replace(':8000', ':5175')}/my/book/${s.tenant.slug}?src=whatsapp`;

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refetch()}>
      <Segmented value={status} onChange={setStatus} options={[{ value: 'pending', label: 'To confirm', count: counts.pending }, { value: 'confirmed', label: 'Confirmed' }, { value: 'declined', label: 'Declined' }]} />
      {isLoading ? <Loading /> : (data?.data ?? []).length === 0 ? (
        <Card>
          <Empty icon="globe-outline" title={status === 'pending' ? 'No requests waiting' : 'Nothing here'} body="Share your booking link so patients can book online." action={
            <Button title="Share booking link" icon="share-social-outline" small onPress={() => void Share.share({ message: `Book your physiotherapy appointment at ${s.tenant.name}: ${link}` })} />
          } />
        </Card>
      ) : (data?.data ?? []).map((b) => (
        <Card key={b.id} style={{ gap: 10 }}>
          <Row style={{ alignItems: 'flex-start' }}>
            <Avatar name={b.name} size={42} />
            <View style={{ flex: 1, gap: 2 }}>
              <T kind="subheading">{b.name}</T>
              <T kind="small">{b.phone}{b.age ? ` · ${b.age} yrs` : ''}</T>
            </View>
            <Badge label={SOURCES[b.source] ?? b.source} tone="info" />
          </Row>
          <Banner tone="primary" icon="calendar" body={`${dayLabel(b.local_start)} · ${time12(b.local_start)} · ${b.service?.name ?? 'Session'} with ${b.practitioner?.name ?? 'any therapist'}`} />
          {b.message ? <T kind="muted">“{b.message}”</T> : null}
          <Row style={{ justifyContent: 'space-between' }}>
            <T kind="small">{b.reference} · {instant(b.created_at, s.tenant.timezone)}</T>
            <Row gap={6}>
              <IconButton icon="call" label="Call" tone="primary" size={36} onPress={() => void Linking.openURL(`tel:${b.phone}`)} />
              <IconButton icon="logo-whatsapp" label="WhatsApp" tone="success" size={36} onPress={() => void Linking.openURL(`https://wa.me/${b.phone.replace(/\D/g, '')}`)} />
            </Row>
          </Row>
          {b.status === 'pending' && (
            <Row>
              <Button title="Decline" variant="outline" small style={{ flex: 1 }} onPress={() => act.mutate({ b, action: 'decline' })} />
              <Button title="Confirm" icon="checkmark" small style={{ flex: 1 }} loading={act.isPending && act.variables?.b.id === b.id} onPress={() => act.mutate({ b, action: 'confirm' })} />
            </Row>
          )}
          {b.status === 'confirmed' && b.patient && <Badge label={`Booked for ${b.patient.full_name}`} tone="success" icon="checkmark-circle" />}
        </Card>
      ))}
    </Screen>
  );
}
