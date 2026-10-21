import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { DateStrip } from '@/components/DateStrip';
import { Avatar, Banner, Button, Card, Chips, Field, Input, ListItem, Row, Screen, T } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { dayLabel, time12, todayIn } from '@/lib/format';
import { colors, radius } from '@/lib/theme';
import type { Appointment, PatientSummary, StaffMember } from '@/lib/types';

interface Service { id: number; name: string; duration_minutes: number; price_minor: number; is_active: boolean }

export default function NewAppointmentScreen() {
  const params = useLocalSearchParams<{ patientId?: string; patientName?: string; date?: string }>();
  const s = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const today = todayIn(s.tenant.timezone);

  const [patient, setPatient] = useState<{ id: number; name: string } | null>(params.patientId ? { id: Number(params.patientId), name: params.patientName ?? 'Patient' } : null);
  const [q, setQ] = useState('');
  const [pickedService, setServiceId] = useState<number | null>(null);
  const [pickedPractitioner, setPractitionerId] = useState<number | null>(s.user.is_practitioner ? s.user.id : null);
  const [branchId, setBranchId] = useState<number>(s.branches[0]?.id ?? 0);
  const [date, setDate] = useState(params.date && params.date >= today ? params.date : today);
  const [slot, setSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const results = useQuery({
    queryKey: ['patients', 'pick', q],
    queryFn: async () => (await api.get<{ data: PatientSummary[] }>('/patients', { search: q, per_page: 8 })).data,
    enabled: !patient && q.trim().length >= 2,
  });
  const services = useQuery({ queryKey: ['services'], queryFn: async () => (await api.get<{ data: Service[] }>('/settings/services')).data.filter((x) => x.is_active) });
  const practitioners = useQuery({ queryKey: ['practitioners'], queryFn: async () => (await api.get<{ data: StaffMember[] }>('/staff', { practitioners_only: 1 })).data });

  // Default to the first service / physiotherapist until the user picks one.
  const serviceId = pickedService ?? services.data?.[0]?.id ?? null;
  const practitionerId = pickedPractitioner ?? practitioners.data?.[0]?.id ?? null;

  const slots = useQuery({
    queryKey: ['availability', practitionerId, branchId, date, serviceId],
    queryFn: async () => (await api.get<{ data: { local_start: string }[] }>('/availability', { practitioner_id: practitionerId!, branch_id: branchId, date, service_id: serviceId! })).data,
    enabled: !!practitionerId && !!serviceId && !!branchId,
  });

  const book = useMutation({
    mutationFn: async () =>
      (await api.post<{ data: Appointment }>('/appointments', { patient_id: patient!.id, practitioner_id: practitionerId, branch_id: branchId, service_id: serviceId, local_start: slot, notes: notes.trim() || null })).data,
    onSuccess: (a) => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert('Appointment booked', `${patient!.name} · ${dayLabel(a.local_start)} at ${time12(a.local_start)}`);
      router.replace(`/appointment/${a.id}`);
    },
    onError: (e) => {
      Alert.alert('Could not book', errorText(e));
      setSlot(null);
      void slots.refetch();
    },
  });

  const service = services.data?.find((x) => x.id === serviceId);

  return (
    <Screen>
      <Field label="Patient" required>
        {patient ? (
          <Card style={{ padding: 12 }}>
            <Row>
              <Avatar name={patient.name} size={36} />
              <T kind="subheading" style={{ flex: 1 }}>{patient.name}</T>
              {!params.patientId && <Button title="Change" small variant="ghost" onPress={() => setPatient(null)} />}
            </Row>
          </Card>
        ) : (
          <View style={{ gap: 6 }}>
            <Input value={q} onChangeText={setQ} placeholder="Search by name, phone or MRN" autoFocus autoCorrect={false} />
            {results.isFetching && <ActivityIndicator color={colors.primary} />}
            {(results.data ?? []).map((p) => (
              <Card key={p.id} style={{ paddingVertical: 0 }}>
                <ListItem title={p.full_name} subtitle={[p.mrn, p.phone].filter(Boolean).join(' · ')} left={<Avatar name={p.full_name} size={34} />} onPress={() => setPatient({ id: p.id, name: p.full_name })} />
              </Card>
            ))}
            {q.trim().length >= 2 && results.data?.length === 0 && <Button title="Register a new patient" variant="ghost" icon="person-add-outline" onPress={() => router.push('/patient/new')} />}
          </View>
        )}
      </Field>

      <Field label="Service" required>
        <Chips value={serviceId} onChange={(v) => { setServiceId(v); setSlot(null); }} options={(services.data ?? []).map((x) => ({ value: x.id, label: `${x.name} · ${x.duration_minutes}m` }))} />
      </Field>

      <Field label="Physiotherapist" required>
        <Chips value={practitionerId} onChange={(v) => { setPractitionerId(v); setSlot(null); }} options={(practitioners.data ?? []).map((x) => ({ value: x.id, label: x.id === s.user.id ? `${x.name} (me)` : x.name }))} />
      </Field>

      {s.branches.length > 1 && (
        <Field label="Branch">
          <Chips value={branchId} onChange={(v) => { setBranchId(v); setSlot(null); }} options={s.branches.map((b) => ({ value: b.id, label: b.name }))} />
        </Field>
      )}

      <Field label="Date & time" required>
        <DateStrip value={date} onChange={(d) => { setDate(d); setSlot(null); }} today={today} back={0} ahead={45} />
      </Field>
      {slots.isLoading ? <ActivityIndicator color={colors.primary} /> : (slots.data ?? []).length === 0 ? (
        <Banner tone="neutral" body="No free times on this day for this physiotherapist." icon="calendar-clear-outline" />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(slots.data ?? []).map((x) => {
            const active = x.local_start === slot;
            return (
              <Pressable key={x.local_start} onPress={() => setSlot(x.local_start)} accessibilityRole="radio" accessibilityState={{ checked: active }}
                style={{ width: '22.5%', flexGrow: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.surface }}>
                <Text style={{ fontWeight: '700', color: active ? '#fff' : colors.text, fontSize: 13 }}>{time12(x.local_start)}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Field label="Notes"><Input value={notes} onChangeText={setNotes} multiline placeholder="Anything the therapist should know" /></Field>

      <Button
        title={slot ? `Book ${dayLabel(slot)} · ${time12(slot)}` : 'Choose a time'}
        icon="calendar"
        disabled={!patient || !slot || !service}
        loading={book.isPending}
        onPress={() => book.mutate()}
      />
    </Screen>
  );
}
