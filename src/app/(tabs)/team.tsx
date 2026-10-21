import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { ClockCard } from '@/components/ClockCard';
import { Avatar, Badge, Button, Card, Divider, ListItem, Row, Screen, SectionTitle, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { dateLabel, ROLE_LABELS } from '@/lib/format';
import { LEAVE_TONES, presenceLabel } from '@/lib/hr';
import { colors } from '@/lib/theme';
import type { LeaveBalance, LeaveRequest, Presence, StaffMember } from '@/lib/types';

export default function MyWorkScreen() {
  const s = useSession();
  const router = useRouter();
  const manager = s.can('staff.manage');

  const balances = useQuery({ queryKey: ['leave', 'balances'], queryFn: async () => (await api.get<{ data: LeaveBalance[] }>('/leave-balances')).data });
  const mine = useQuery({ queryKey: ['leave', 'mine'], queryFn: async () => (await api.get<{ data: LeaveRequest[] }>('/leave-requests', { scope: 'mine' })).data });
  const team = useQuery({
    queryKey: ['staff', 'presence'],
    queryFn: async () => api.get<{ data: StaffMember[]; meta?: { presence?: Record<string, Presence> } }>('/staff', { with_presence: 1 }),
    enabled: manager,
    refetchInterval: 60_000,
  });

  const refresh = () => {
    void balances.refetch();
    void mine.refetch();
    void team.refetch();
  };

  const presence = team.data?.meta?.presence ?? {};
  const members = (team.data?.data ?? []).filter((m) => m.is_active);
  const inCount = members.filter((m) => ['in', 'out'].includes(presence[m.id]?.state ?? '')).length;

  return (
    <Screen refreshing={mine.isRefetching} onRefresh={refresh}>
      <ClockCard />
      <Row>
        <Button title="Attendance history" icon="calendar-outline" variant="outline" small onPress={() => router.push('/attendance')} style={{ flex: 1 }} />
        <Button title="Payslips" icon="document-text-outline" variant="outline" small onPress={() => router.push('/payslips')} style={{ flex: 1 }} />
      </Row>

      <SectionTitle title="Leave balance" action="Apply" onAction={() => router.push('/leave/apply')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {(balances.data ?? []).map((b) => (
          <Card key={b.leave_type_id} style={{ width: '47%', flexGrow: 1, gap: 4, padding: 14 }}>
            <Row gap={6}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: b.color }} /><T kind="label" numberOfLines={1}>{b.name}</T></Row>
            <T kind="title" style={{ fontSize: 22 }}>{b.remaining ?? '∞'}</T>
            <T kind="small" style={{ fontSize: 12 }}>{b.remaining == null ? 'Unlimited' : `left of ${Number(b.quota)}`}{b.pending ? ` · ${b.pending} pending` : ''}</T>
          </Card>
        ))}
      </View>

      <SectionTitle title="My leave requests" action="All" onAction={() => router.push('/leave')} />
      <Card style={{ paddingVertical: 4 }}>
        {(mine.data ?? []).length === 0 ? <T kind="muted" style={{ paddingVertical: 12 }}>No leave requests yet.</T> : (
          (mine.data ?? []).slice(0, 4).map((l, i) => (
            <View key={l.id}>
              {i > 0 && <Divider />}
              <ListItem
                title={`${l.leave_type?.name ?? 'Leave'} · ${Number(l.days)} day${Number(l.days) === 1 ? '' : 's'}`}
                subtitle={l.start_date === l.end_date ? dateLabel(l.start_date) : `${dateLabel(l.start_date)} – ${dateLabel(l.end_date)}`}
                right={<Badge label={l.status} tone={LEAVE_TONES[l.status]} />}
              />
            </View>
          ))
        )}
      </Card>

      {manager && (
        <>
          <SectionTitle title={`Team today · ${inCount}/${members.length} in`} action="Directory" onAction={() => router.push('/staff')} />
          <Card style={{ paddingVertical: 4 }}>
            {members.map((m, i) => {
              const p = presenceLabel(presence[m.id]);
              return (
                <View key={m.id}>
                  {i > 0 && <Divider />}
                  <ListItem
                    title={m.name}
                    subtitle={ROLE_LABELS[m.roles?.[0] ?? ''] ?? m.title ?? ''}
                    left={<Avatar name={m.name} color={m.color} size={38} />}
                    right={<View style={{ alignItems: 'flex-end', gap: 4 }}><Badge label={p.label} tone={p.tone} />{presence[m.id]?.is_late && <Badge label="Late" tone="danger" />}</View>}
                    onPress={() => router.push(`/staff/${m.id}`)}
                  />
                </View>
              );
            })}
          </Card>
        </>
      )}
      <T kind="small" style={{ textAlign: 'center', color: colors.subtle }}>Attendance is recorded in clinic time ({s.tenant.timezone}).</T>
    </Screen>
  );
}
