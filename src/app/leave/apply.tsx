import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { DateStrip } from '@/components/DateStrip';
import { Banner, Button, Chips, Field, Input, Screen, T } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { dayLabel, todayIn } from '@/lib/format';
import type { LeaveBalance } from '@/lib/types';

export default function ApplyLeaveScreen() {
  const s = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const today = todayIn(s.tenant.timezone);
  const { data: balances } = useQuery({ queryKey: ['leave', 'balances'], queryFn: async () => (await api.get<{ data: LeaveBalance[] }>('/leave-balances')).data });
  const [typeId, setTypeId] = useState<number | null>(null);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [half, setHalf] = useState<'full' | 'am' | 'pm'>('full');
  const [reason, setReason] = useState('');

  const type = balances?.find((b) => b.leave_type_id === typeId);

  const apply = useMutation({
    mutationFn: () => api.post('/leave-requests', { leave_type_id: typeId, start_date: from, end_date: to < from ? from : to, half_day: from === to && half !== 'full' ? half : null, reason: reason.trim() || null }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leave'] });
      Alert.alert('Leave requested', 'Your manager will be notified to approve it.');
      router.back();
    },
  });

  return (
    <Screen>
      {apply.error ? <Banner tone="danger" body={errorText(apply.error)} /> : null}
      <Field label="Leave type" required>
        <Chips value={typeId} onChange={setTypeId} options={(balances ?? []).map((b) => ({ value: b.leave_type_id, label: `${b.name}${b.remaining != null ? ` (${b.remaining} left)` : ''}` }))} />
      </Field>
      <Field label={`From · ${dayLabel(from)}`} required>
        <DateStrip value={from} onChange={(d) => { setFrom(d); if (to < d) setTo(d); }} today={today} back={7} ahead={90} />
      </Field>
      <Field label={`To · ${dayLabel(to < from ? from : to)}`} required>
        <DateStrip value={to < from ? from : to} onChange={setTo} today={from} back={0} ahead={60} />
      </Field>
      {from === to && (
        <Field label="Duration">
          <Chips value={half} onChange={setHalf} options={[{ value: 'full', label: 'Full day' }, { value: 'am', label: 'Morning' }, { value: 'pm', label: 'Afternoon' }]} />
        </Field>
      )}
      <Field label="Reason"><Input value={reason} onChangeText={setReason} multiline placeholder="Optional" /></Field>
      {type && type.remaining != null && <T kind="small">You have {type.remaining} day(s) of {type.name} left this year.</T>}
      <Button title="Submit request" icon="paper-plane-outline" disabled={!typeId} loading={apply.isPending} onPress={() => apply.mutate()} />
    </Screen>
  );
}
