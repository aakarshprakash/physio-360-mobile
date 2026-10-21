import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppointmentCard } from '@/components/AppointmentCard';
import { DateStrip } from '@/components/DateStrip';
import { Card, Empty, Loading, Row, Screen, Segmented, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { dayLabel, todayIn } from '@/lib/format';
import { colors, shadow } from '@/lib/theme';
import type { Appointment } from '@/lib/types';

export default function ScheduleScreen() {
  const s = useSession();
  const router = useRouter();
  const today = todayIn(s.tenant.timezone);
  const [date, setDate] = useState(today);
  const [scope, setScope] = useState<'mine' | 'all'>(s.user.is_practitioner && !s.can('staff.manage') ? 'mine' : 'all');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['appointments', date, scope],
    queryFn: async () =>
      (await api.get<{ data: Appointment[] }>('/appointments', { from: date, to: date, ...(scope === 'mine' ? { 'practitioner_ids[]': s.user.id } : {}) })).data,
  });

  const list = data ?? [];
  const active = list.filter((a) => a.status !== 'cancelled');
  const done = list.filter((a) => a.status === 'completed').length;

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={isRefetching} onRefresh={() => void refetch()}>
        <DateStrip value={date} onChange={setDate} today={today} />
        <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <View>
            <T kind="heading">{date === today ? 'Today' : dayLabel(date)}</T>
            <T kind="small">{active.length} appointment{active.length === 1 ? '' : 's'} · {done} completed</T>
          </View>
          {s.user.is_practitioner && (
            <Segmented value={scope} onChange={setScope} options={[{ value: 'mine', label: 'Mine' }, { value: 'all', label: 'All' }]} />
          )}
        </Row>
        {isLoading ? <Loading /> : list.length === 0 ? (
          <Card><Empty icon="calendar-clear-outline" title="Nothing booked" body="No appointments on this day." /></Card>
        ) : (
          list.map((a) => <AppointmentCard key={a.id} a={a} showPractitioner={scope === 'all'} onPress={() => router.push(`/appointment/${a.id}`)} />)
        )}
      </Screen>
      {s.can('appointments.manage') && (
        <Pressable onPress={() => router.push({ pathname: '/appointment/new', params: { date } })} accessibilityLabel="New appointment" accessibilityRole="button"
          style={({ pressed }) => ({ position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1, ...shadow, shadowOpacity: 0.25 })}>
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}
