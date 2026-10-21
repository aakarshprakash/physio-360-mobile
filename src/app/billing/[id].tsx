import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Badge, Banner, Button, Card, Chips, Divider, Field, InfoRow, Input, Loading, Row, Screen, T } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { openRemoteFile } from '@/lib/files';
import { dateLabel, instant, label, money } from '@/lib/format';

const METHODS = [
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank' },
];

interface InvoiceDetail {
  id: number; number: string | null; status: string; payment_status: string | null; issue_date: string | null; due_date: string | null;
  subtotal_minor: number; discount_minor: number; tax_minor: number; total_minor: number; amount_paid_minor: number; balance_minor: number;
  patient: { id: number; full_name: string; mrn: string };
  items: { id: number; description: string; quantity: number; total_minor: number }[];
  payments: { id: number; amount_minor: number; method: string; received_at: string; type: string; reference: string | null }[];
}

export default function InvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const queryClient = useQueryClient();
  const cur = s.tenant.currency;
  const [method, setMethod] = useState('upi');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');

  const { data: inv, isLoading } = useQuery({ queryKey: ['invoice', id], queryFn: async () => (await api.get<{ data: InvoiceDetail }>(`/invoices/${id}`)).data });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    void queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  const post = useMutation({ mutationFn: () => api.post(`/invoices/${id}/post`), onSuccess: refresh, onError: (e) => Alert.alert('Could not post', errorText(e)) });
  const pay = useMutation({
    mutationFn: () => {
      const major = Number((amount || '').replace(/,/g, ''));
      if (!major || major <= 0) throw new Error('Enter the amount received.');
      return api.post(`/invoices/${id}/payments`, { amount_minor: Math.round(major * 10 ** cur.exponent), method, reference: reference.trim() || null });
    },
    onSuccess: () => {
      setAmount('');
      setReference('');
      refresh();
      Alert.alert('Payment recorded', 'The receipt is available in the web portal and the invoice PDF.');
    },
    onError: (e) => Alert.alert('Could not record payment', errorText(e)),
  });

  if (isLoading || !inv) return <Loading />;
  const open = inv.status === 'posted' && inv.balance_minor > 0;

  return (
    <Screen>
      <Stack.Screen options={{ title: inv.number ?? 'Draft invoice' }} />
      <Card style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <T kind="small">{inv.patient.full_name} · {inv.patient.mrn}</T>
            <T kind="title">{money(inv.total_minor, cur)}</T>
            <T kind="small">Issued {dateLabel(inv.issue_date)}{inv.due_date ? ` · Due ${dateLabel(inv.due_date)}` : ''}</T>
          </View>
          <Badge label={inv.status === 'draft' ? 'Draft' : label(inv.payment_status ?? inv.status)} tone={inv.payment_status === 'paid' ? 'success' : inv.status === 'draft' ? 'neutral' : 'warning'} />
        </Row>
        {inv.balance_minor > 0 && inv.status === 'posted' && <Banner tone="warning" body={`Balance due ${money(inv.balance_minor, cur)}`} icon="wallet-outline" />}
      </Card>

      <Card style={{ paddingVertical: 6 }}>
        {inv.items.map((it, i) => (
          <View key={it.id}>
            {i > 0 && <Divider />}
            <InfoRow label={`${it.description}${it.quantity > 1 ? ` ×${it.quantity}` : ''}`} value={money(it.total_minor, cur)} />
          </View>
        ))}
        <Divider />
        {inv.discount_minor > 0 && <InfoRow label="Discount" value={`− ${money(inv.discount_minor, cur)}`} />}
        {inv.tax_minor > 0 && <InfoRow label="Tax" value={money(inv.tax_minor, cur)} />}
        <InfoRow label="Paid" value={money(inv.amount_paid_minor, cur)} />
      </Card>

      <Button title="Share invoice PDF" icon="share-outline" variant="outline" onPress={() => void openRemoteFile(`/invoices/${id}/pdf`, `${inv.number ?? `invoice-${id}`}.pdf`).catch((e) => Alert.alert('Could not open PDF', errorText(e)))} />
      {inv.status === 'draft' && s.can('billing.manage') && <Button title="Post invoice" icon="checkmark-done" loading={post.isPending} onPress={() => post.mutate()} />}

      {open && s.can('billing.manage') && (
        <Card style={{ gap: 12 }}>
          <T kind="subheading">Record a payment</T>
          <Chips value={method} onChange={setMethod} options={METHODS} />
          <Field label={`Amount (${cur.symbol})`}>
            <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={(inv.balance_minor / 10 ** cur.exponent).toFixed(cur.exponent)} />
          </Field>
          {method !== 'cash' && <Field label="Reference / UTR"><Input value={reference} onChangeText={setReference} autoCapitalize="characters" /></Field>}
          <Row>
            <Button title="Full balance" variant="ghost" small onPress={() => setAmount((inv.balance_minor / 10 ** cur.exponent).toFixed(cur.exponent))} />
            <Button title="Record payment" icon="cash-outline" loading={pay.isPending} onPress={() => pay.mutate()} style={{ flex: 1 }} />
          </Row>
        </Card>
      )}

      {inv.payments.length > 0 && (
        <Card style={{ paddingVertical: 6 }}>
          <T kind="caption" style={{ paddingTop: 6 }}>Payments</T>
          {inv.payments.map((p) => (
            <InfoRow key={p.id} label={`${instant(p.received_at, s.tenant.timezone)} · ${p.method.toUpperCase()}${p.type === 'refund' ? ' (refund)' : ''}`} value={money(p.type === 'refund' ? -p.amount_minor : p.amount_minor, cur)} />
          ))}
        </Card>
      )}
    </Screen>
  );
}
