import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Badge, Card, Divider, Empty, ListItem, Loading, Screen, Segmented, Stat } from '@/components/ui';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { dateLabel, money, moneyCompact } from '@/lib/format';
import type { Invoice } from '@/lib/types';

type Filter = 'outstanding' | 'paid' | 'all';

export default function BillingScreen() {
  const s = useSession();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('outstanding');
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['invoices', filter],
    queryFn: async () => (await api.get<{ data: Invoice[] }>('/invoices', { payment_status: filter === 'all' ? undefined : filter, status: filter === 'all' ? undefined : 'posted', per_page: 50 })).data,
  });
  const due = (data ?? []).reduce((sum, i) => sum + Math.max(0, i.balance_minor), 0);

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refetch()}>
      <Segmented value={filter} onChange={setFilter} options={[{ value: 'outstanding', label: 'Outstanding' }, { value: 'paid', label: 'Paid' }, { value: 'all', label: 'All' }]} />
      {filter === 'outstanding' && data && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Stat label="Outstanding" value={moneyCompact(due, s.tenant.currency)} icon="wallet" tone="warning" />
          <Stat label="Invoices" value={data.length} icon="receipt" tone="info" />
        </View>
      )}
      {isLoading ? <Loading /> : (data ?? []).length === 0 ? <Card><Empty icon="receipt-outline" title="No invoices" /></Card> : (
        <Card style={{ paddingVertical: 2 }}>
          {(data ?? []).map((inv, i) => (
            <View key={inv.id}>
              {i > 0 && <Divider />}
              <ListItem
                title={inv.patient?.full_name ?? 'Patient'}
                subtitle={`${inv.number ?? 'Draft'} · ${dateLabel(inv.issue_date)} · ${money(inv.total_minor, s.tenant.currency)}`}
                right={inv.balance_minor > 0 && inv.status === 'posted'
                  ? <Badge label={`Due ${moneyCompact(inv.balance_minor, s.tenant.currency)}`} tone="warning" />
                  : <Badge label={inv.status === 'draft' ? 'Draft' : inv.payment_status === 'paid' ? 'Paid' : inv.status} tone={inv.payment_status === 'paid' ? 'success' : 'neutral'} />}
                onPress={() => router.push(`/billing/${inv.id}`)}
              />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
