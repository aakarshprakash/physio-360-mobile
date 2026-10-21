import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Avatar, Badge, Button, Card, Empty, Loading, Row, Screen, Segmented, T } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { dateLabel } from '@/lib/format';
import { LEAVE_TONES } from '@/lib/hr';
import type { LeaveRequest } from '@/lib/types';

export default function LeaveScreen() {
  const s = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const approver = s.can('leave.approve');
  const [scope, setScope] = useState<'mine' | 'team'>(approver ? 'team' : 'mine');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['leave', scope],
    queryFn: async () => (await api.get<{ data: LeaveRequest[] }>('/leave-requests', { scope })).data,
  });

  const decide = useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: 'approve' | 'reject' | 'cancel'; note?: string }) => api.post(`/leave-requests/${id}/${action}`, note ? { note } : {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['leave'] }),
    onError: (e) => Alert.alert('Could not update', errorText(e)),
  });

  const list = data ?? [];
  const pending = list.filter((l) => l.status === 'pending');

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refetch()}>
      <Row style={{ justifyContent: 'space-between' }}>
        {approver ? <Segmented value={scope} onChange={setScope} options={[{ value: 'team', label: 'Team', count: scope === 'team' ? pending.length : undefined }, { value: 'mine', label: 'Mine' }]} /> : <T kind="heading">My requests</T>}
        <Button title="Apply" icon="add" small onPress={() => router.push('/leave/apply')} />
      </Row>
      {isLoading ? <Loading /> : list.length === 0 ? <Card><Empty icon="airplane-outline" title="No leave requests" /></Card> : list.map((l) => {
        const mine = l.user?.id === s.user.id || scope === 'mine';
        return (
          <Card key={l.id} style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Row style={{ flex: 1 }}>
                {scope === 'team' && l.user && <Avatar name={l.user.name} color={l.user.color} size={38} />}
                <View style={{ flex: 1 }}>
                  <T kind="subheading">{scope === 'team' ? l.user?.name : l.leave_type?.name}</T>
                  <T kind="small">
                    {scope === 'team' ? `${l.leave_type?.name} · ` : ''}{Number(l.days)} day{Number(l.days) === 1 ? '' : 's'}{l.half_day ? ` (${l.half_day === 'am' ? 'morning' : 'afternoon'})` : ''}
                  </T>
                </View>
              </Row>
              <Badge label={l.status} tone={LEAVE_TONES[l.status]} />
            </Row>
            <T kind="label">{l.start_date === l.end_date ? dateLabel(l.start_date) : `${dateLabel(l.start_date)} → ${dateLabel(l.end_date)}`}</T>
            {l.reason ? <T kind="muted">“{l.reason}”</T> : null}
            {l.decision_note ? <T kind="small">Note: {l.decision_note}</T> : null}
            {l.status === 'pending' && scope === 'team' && !mine && (
              <Row>
                <Button title="Reject" variant="outline" small style={{ flex: 1 }} onPress={() => decide.mutate({ id: l.id, action: 'reject', note: 'Not approved' })} />
                <Button title="Approve" icon="checkmark" small style={{ flex: 1 }} loading={decide.isPending && decide.variables?.id === l.id} onPress={() => decide.mutate({ id: l.id, action: 'approve' })} />
              </Row>
            )}
            {mine && ['pending', 'approved'].includes(l.status) && l.start_date > new Date().toISOString().slice(0, 10) && (
              <Button title="Cancel request" variant="ghost" small onPress={() => decide.mutate({ id: l.id, action: 'cancel' })} />
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
