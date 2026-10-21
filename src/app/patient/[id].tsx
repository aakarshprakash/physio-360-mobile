import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { AppointmentCard } from '@/components/AppointmentCard';
import { Avatar, Badge, Banner, Button, Card, Chips, Divider, Empty, IconButton, InfoRow, ListItem, Loading, Row, Screen, Segmented, T } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { openRemoteFile, uploadFile } from '@/lib/files';
import { addDays, dateLabel, instant, label, money, todayIn } from '@/lib/format';
import { chooseSource, pickFile } from '@/lib/pick';
import { colors } from '@/lib/theme';
import type { Appointment, DocumentFile, Invoice, Patient } from '@/lib/types';

type Tab = 'overview' | 'visits' | 'notes' | 'files' | 'billing';

const CATEGORIES = [
  { value: 'report', label: 'Report' },
  { value: 'imaging', label: 'X-ray / MRI' },
  { value: 'referral', label: 'Referral' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other / photo' },
];

interface Note { id: number; subjective: string | null; objective: string | null; assessment: string | null; plan: string | null; pain_score: number | null; status: string; author?: { name: string }; created_at: string }

export default function PatientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [category, setCategory] = useState('report');
  const tz = s.tenant.timezone;

  const patient = useQuery({ queryKey: ['patient', id], queryFn: async () => (await api.get<{ data: Patient }>(`/patients/${id}`)).data });
  const visits = useQuery({
    queryKey: ['patient', id, 'visits'],
    queryFn: async () => (await api.get<{ data: Appointment[] }>('/appointments', { patient_id: id, from: addDays(todayIn(tz), -365), to: addDays(todayIn(tz), 120) })).data,
    enabled: tab === 'visits' || tab === 'overview',
  });
  const notes = useQuery({ queryKey: ['patient', id, 'notes'], queryFn: async () => (await api.get<{ data: Note[] }>(`/patients/${id}/notes`)).data, enabled: tab === 'notes' && s.can('clinical.view') });
  const docs = useQuery({ queryKey: ['patient', id, 'documents'], queryFn: async () => (await api.get<{ data: DocumentFile[] }>(`/patients/${id}/documents`)).data, enabled: tab === 'files' && s.can('clinical.view') });
  const invoices = useQuery({ queryKey: ['patient', id, 'invoices'], queryFn: async () => (await api.get<{ data: Invoice[] }>('/invoices', { patient_id: id, per_page: 50 })).data, enabled: tab === 'billing' && s.can('billing.view') });

  const photo = useMutation({
    mutationFn: async (source: 'camera' | 'library') => {
      const picked = await pickFile(source, { square: true });
      if (!picked) return null;
      return uploadFile(`/patients/${id}/photo`, 'photo', picked);
    },
    onSuccess: (r) => r && void queryClient.invalidateQueries({ queryKey: ['patient', id] }),
    onError: (e) => Alert.alert('Photo not saved', errorText(e)),
  });

  const attach = useMutation({
    mutationFn: async (source: 'camera' | 'library' | 'files') => {
      const picked = await pickFile(source);
      if (!picked) return null;
      return uploadFile(`/patients/${id}/documents`, 'file', picked, { category });
    },
    onSuccess: (r) => {
      if (!r) return;
      void queryClient.invalidateQueries({ queryKey: ['patient', id, 'documents'] });
      Alert.alert('Attached', 'The file was added to the patient record.');
    },
    onError: (e) => Alert.alert('Upload failed', errorText(e)),
  });

  if (patient.isLoading || !patient.data) return <Loading />;
  const p = patient.data;
  const phone = (p.phone ?? '').replace(/[^\d+]/g, '');
  const upcoming = (visits.data ?? []).filter((a) => a.local_start >= todayIn(tz) && !['cancelled', 'no_show', 'completed'].includes(a.status));

  const tabs: { value: Tab; label: string }[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'visits', label: 'Visits' },
    ...(s.can('clinical.view') ? [{ value: 'notes' as Tab, label: 'Notes' }, { value: 'files' as Tab, label: 'Files' }] : []),
    ...(s.can('billing.view') ? [{ value: 'billing' as Tab, label: 'Billing' }] : []),
  ];

  return (
    <Screen refreshing={patient.isRefetching} onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['patient', id] })}>
      <Stack.Screen options={{ title: 'Patient' }} />
      <Card style={{ gap: 14 }}>
        <Row gap={14}>
          <Pressable onPress={() => s.can('patients.manage') && chooseSource('Patient photo', false, (src) => photo.mutate(src as 'camera' | 'library'))} accessibilityLabel="Change patient photo" accessibilityRole="button">
            <Avatar name={p.full_name} uri={p.photo_url} size={72} />
            {s.can('patients.manage') && (
              <View style={{ position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={photo.isPending ? 'hourglass-outline' : 'camera'} size={13} color="#fff" />
              </View>
            )}
          </Pressable>
          <View style={{ flex: 1, gap: 4 }}>
            <T kind="heading">{p.full_name}</T>
            <T kind="small">{[p.mrn, p.age ? `${p.age} yrs` : null, label(p.gender)].filter(Boolean).join(' · ')}</T>
            <Badge label={label(p.status ?? 'active')} tone={(p.status ?? 'active') === 'active' ? 'success' : 'neutral'} />
          </View>
        </Row>
        <Row>
          {phone ? <IconButton icon="call" label="Call patient" tone="primary" onPress={() => void Linking.openURL(`tel:${phone}`)} /> : null}
          {phone ? <IconButton icon="logo-whatsapp" label="WhatsApp patient" tone="success" onPress={() => void Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)} /> : null}
          {p.email ? <IconButton icon="mail" label="Email patient" tone="info" onPress={() => void Linking.openURL(`mailto:${p.email}`)} /> : null}
          <View style={{ flex: 1 }} />
          {s.can('appointments.manage') && <Button title="Book" icon="calendar" small onPress={() => router.push({ pathname: '/appointment/new', params: { patientId: String(p.id), patientName: p.full_name } })} />}
        </Row>
      </Card>

      <Segmented value={tab} onChange={setTab} options={tabs} />

      {tab === 'overview' && (
        <>
          {p.allergies ? <Banner tone="danger" title="Allergies" body={p.allergies} icon="warning" /> : null}
          <Card style={{ paddingVertical: 6 }}>
            <InfoRow label="Phone" value={p.phone ?? '—'} />
            <Divider />
            <InfoRow label="Date of birth" value={dateLabel(p.date_of_birth)} />
            <Divider />
            <InfoRow label="Address" value={[p.address, p.city].filter(Boolean).join(', ') || '—'} />
            <Divider />
            <InfoRow label="Occupation" value={p.occupation ?? '—'} />
            <Divider />
            <InfoRow label="Physiotherapist" value={p.primary_practitioner?.name ?? '—'} />
            <Divider />
            <InfoRow label="Referred by" value={p.referred_by ?? '—'} />
            <Divider />
            <InfoRow label="Emergency contact" value={p.emergency_contact_name ? `${p.emergency_contact_name} · ${p.emergency_contact_phone ?? ''}` : '—'} />
          </Card>
          {p.medical_history ? <Card style={{ gap: 6 }}><T kind="caption">Medical history</T><T>{p.medical_history}</T></Card> : null}
          <T kind="caption">Upcoming</T>
          {upcoming.length === 0 ? <T kind="muted">No upcoming appointments.</T> : upcoming.slice(0, 3).map((a) => <AppointmentCard key={a.id} a={a} onPress={() => router.push(`/appointment/${a.id}`)} />)}
        </>
      )}

      {tab === 'visits' && (visits.isLoading ? <Loading /> : (visits.data ?? []).length === 0 ? <Card><Empty icon="calendar-outline" title="No visits yet" /></Card> : (
        [...(visits.data ?? [])].reverse().map((a) => (
          <View key={a.id} style={{ gap: 4 }}>
            <T kind="small">{dateLabel(a.local_start)}</T>
            <AppointmentCard a={a} onPress={() => router.push(`/appointment/${a.id}`)} />
          </View>
        ))
      ))}

      {tab === 'notes' && (
        <>
          {s.can('clinical.write') && <Button title="Add treatment note" icon="create-outline" onPress={() => router.push({ pathname: '/patient/note', params: { patientId: String(p.id) } })} />}
          {notes.isLoading ? <Loading /> : (notes.data ?? []).length === 0 ? <Card><Empty icon="document-text-outline" title="No notes yet" /></Card> : (notes.data ?? []).map((n) => (
            <Card key={n.id} style={{ gap: 8 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T kind="label">{instant(n.created_at, tz)} · {n.author?.name}</T>
                <Row gap={6}>
                  {n.pain_score != null && <Badge label={`Pain ${n.pain_score}/10`} tone={n.pain_score >= 7 ? 'danger' : n.pain_score >= 4 ? 'warning' : 'success'} />}
                  <Badge label={n.status === 'signed' ? 'Signed' : 'Draft'} tone={n.status === 'signed' ? 'primary' : 'neutral'} />
                </Row>
              </Row>
              {(['subjective', 'objective', 'assessment', 'plan'] as const).map((k) => n[k] ? (
                <View key={k}><T kind="caption">{k[0]!.toUpperCase()}</T><T>{n[k]}</T></View>
              ) : null)}
            </Card>
          ))}
        </>
      )}

      {tab === 'files' && (
        <>
          {s.can('patients.manage') && (
            <Card style={{ gap: 12 }}>
              <T kind="subheading">Attach to record</T>
              <Chips value={category} options={CATEGORIES} onChange={setCategory} />
              <Row>
                <Button title="Camera" icon="camera-outline" small variant="secondary" loading={attach.isPending} onPress={() => attach.mutate('camera')} style={{ flex: 1 }} />
                <Button title="Gallery" icon="images-outline" small variant="secondary" onPress={() => attach.mutate('library')} style={{ flex: 1 }} />
                <Button title="File" icon="document-attach-outline" small variant="secondary" onPress={() => attach.mutate('files')} style={{ flex: 1 }} />
              </Row>
            </Card>
          )}
          {docs.isLoading ? <Loading /> : (docs.data ?? []).length === 0 ? <Card><Empty icon="folder-open-outline" title="No files yet" body="Reports, scans and photos appear here." /></Card> : (
            <Card style={{ paddingVertical: 2 }}>
              {(docs.data ?? []).map((d, i) => (
                <View key={d.id}>
                  {i > 0 && <Divider />}
                  <ListItem
                    title={d.original_name}
                    subtitle={`${CATEGORIES.find((c) => c.value === d.category)?.label ?? d.category} · ${(d.size / 1024).toFixed(0)} KB · ${instant(d.created_at, tz)}`}
                    left={<Ionicons name={d.mime.startsWith('image/') ? 'image-outline' : 'document-outline'} size={26} color={colors.primary} />}
                    onPress={() => void openRemoteFile(`/documents/${d.id}/download`, d.original_name, d.mime).catch((e) => Alert.alert('Could not open file', errorText(e)))}
                  />
                </View>
              ))}
            </Card>
          )}
        </>
      )}

      {tab === 'billing' && (invoices.isLoading ? <Loading /> : (invoices.data ?? []).length === 0 ? <Card><Empty icon="receipt-outline" title="No invoices" /></Card> : (
        <Card style={{ paddingVertical: 2 }}>
          {(invoices.data ?? []).map((inv, i) => (
            <View key={inv.id}>
              {i > 0 && <Divider />}
              <ListItem
                title={`${inv.number ?? 'Draft'} · ${money(inv.total_minor, s.tenant.currency)}`}
                subtitle={`${dateLabel(inv.issue_date)}${inv.balance_minor > 0 ? ` · Due ${money(inv.balance_minor, s.tenant.currency)}` : ''}`}
                right={<Badge label={label(inv.payment_status ?? inv.status)} tone={inv.payment_status === 'paid' ? 'success' : inv.status === 'draft' ? 'neutral' : 'warning'} />}
                onPress={() => router.push(`/billing/${inv.id}`)}
              />
            </View>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
