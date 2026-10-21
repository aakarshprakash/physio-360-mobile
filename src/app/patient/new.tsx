import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Banner, Button, Chips, Field, Input, Screen } from '@/components/ui';
import { api, ApiError, errorText } from '@/lib/api';
import { useSession } from '@/lib/auth';
import type { Patient } from '@/lib/types';

export default function NewPatientScreen() {
  const s = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', email: '', gender: '', date_of_birth: '', city: '', referred_by: '', medical_history: '' });
  const [branchId, setBranchId] = useState<number>(s.branches[0]?.id ?? 0);
  const set = (k: keyof typeof form) => (v: string) => setForm({ ...form, [k]: v });

  const save = useMutation({
    mutationFn: async () => {
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || null]));
      return (await api.post<{ data: Patient }>('/patients', { ...body, primary_branch_id: branchId })).data;
    },
    onSuccess: (p) => {
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
      router.replace(`/patient/${p.id}`);
    },
  });
  const err = (f: string) => (save.error instanceof ApiError ? save.error.field(f) : undefined);

  return (
    <Screen>
      {save.error && !(save.error instanceof ApiError && Object.keys(save.error.fields).length) ? <Banner tone="danger" body={errorText(save.error)} /> : null}
      <Field label="First name" required error={err('first_name')}><Input value={form.first_name} onChangeText={set('first_name')} autoCapitalize="words" autoFocus /></Field>
      <Field label="Last name"><Input value={form.last_name} onChangeText={set('last_name')} autoCapitalize="words" /></Field>
      <Field label="Mobile number" required error={err('phone')}><Input value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="+91 98xxx xxxxx" /></Field>
      <Field label="Email" error={err('email')}><Input value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" /></Field>
      <Field label="Gender">
        <Chips value={form.gender || null} onChange={set('gender')} options={[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }, { value: 'other', label: 'Other' }]} />
      </Field>
      <Field label="Date of birth" hint="YYYY-MM-DD" error={err('date_of_birth')}><Input value={form.date_of_birth} onChangeText={set('date_of_birth')} placeholder="1990-05-21" keyboardType="numbers-and-punctuation" /></Field>
      <Field label="City"><Input value={form.city} onChangeText={set('city')} /></Field>
      <Field label="Referred by"><Input value={form.referred_by} onChangeText={set('referred_by')} placeholder="Doctor, friend, Google…" /></Field>
      <Field label="Medical history / complaint"><Input value={form.medical_history} onChangeText={set('medical_history')} multiline /></Field>
      {s.branches.length > 1 && (
        <Field label="Branch">
          <Chips value={branchId} onChange={setBranchId} options={s.branches.map((b) => ({ value: b.id, label: b.name }))} />
        </Field>
      )}
      <Button title="Register patient" icon="person-add" loading={save.isPending} onPress={() => save.mutate()} />
    </Screen>
  );
}
