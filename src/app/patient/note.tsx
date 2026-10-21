import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Banner, Button, Field, Input, Row, Screen, T } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { colors } from '@/lib/theme';

/** Quick SOAP treatment note from the treatment room (optionally signed). */
export default function NoteScreen() {
  const { patientId, appointmentId } = useLocalSearchParams<{ patientId: string; appointmentId?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [pain, setPain] = useState<number | null>(null);

  const save = useMutation({
    mutationFn: (sign: boolean) =>
      api.post(`/patients/${patientId}/notes`, {
        ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || null])),
        pain_score: pain,
        appointment_id: appointmentId ? Number(appointmentId) : null,
        sign,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patient', patientId, 'notes'] });
      router.back();
    },
  });

  const set = (k: keyof typeof form) => (v: string) => setForm({ ...form, [k]: v });

  return (
    <Screen>
      {save.error ? <Banner tone="danger" body={errorText(save.error)} /> : null}
      <Field label="Subjective" hint="What the patient reports"><Input value={form.subjective} onChangeText={set('subjective')} multiline placeholder="Pain eased after last session, stiff in the morning…" /></Field>
      <Field label="Objective" hint="Findings, ROM, strength"><Input value={form.objective} onChangeText={set('objective')} multiline /></Field>
      <Field label="Assessment"><Input value={form.assessment} onChangeText={set('assessment')} multiline /></Field>
      <Field label="Plan" hint="Treatment given and next steps"><Input value={form.plan} onChangeText={set('plan')} multiline /></Field>
      <View style={{ gap: 8 }}>
        <T kind="label">Pain score (NPRS 0–10)</T>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {Array.from({ length: 11 }, (_, n) => (
            <Pressable key={n} onPress={() => setPain(pain === n ? null : n)} accessibilityRole="radio" accessibilityState={{ checked: pain === n }}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: pain === n ? colors.ink : colors.border, backgroundColor: pain === n ? (n >= 7 ? colors.danger : n >= 4 ? colors.warning : colors.success) : colors.surface }}>
              <Text style={{ fontWeight: '700', color: pain === n ? '#fff' : colors.text }}>{n}</Text>
            </Pressable>
          ))}
        </Row>
      </View>
      <Row>
        <Button title="Save draft" variant="outline" onPress={() => save.mutate(false)} loading={save.isPending && save.variables === false} style={{ flex: 1 }} />
        <Button title="Save & sign" icon="checkmark-done" onPress={() => save.mutate(true)} loading={save.isPending && save.variables === true} style={{ flex: 1 }} />
      </Row>
      <T kind="small" style={{ textAlign: 'center' }}>Signed notes are locked; corrections are added as addenda.</T>
    </Screen>
  );
}
