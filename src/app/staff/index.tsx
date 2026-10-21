import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Avatar, Badge, Card, Divider, Input, ListItem, Loading, Screen, Stat } from '@/components/ui';
import { api } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/format';
import { presenceLabel } from '@/lib/hr';
import type { Presence, StaffMember } from '@/lib/types';

interface Summary { total: number; practitioners: number; clocked_in: number; on_leave: number; not_in: number; late: number; pending_leave: number }

export default function StaffDirectoryScreen() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const team = useQuery({ queryKey: ['staff', 'directory'], queryFn: async () => api.get<{ data: StaffMember[]; meta?: { presence?: Record<string, Presence> } }>('/staff', { with_presence: 1 }) });
  const summary = useQuery({ queryKey: ['staff', 'summary'], queryFn: async () => (await api.get<{ data: Summary }>('/staff/summary')).data });

  const presence = team.data?.meta?.presence ?? {};
  const term = q.trim().toLowerCase();
  const members = (team.data?.data ?? []).filter((m) => !term || [m.name, m.email, m.phone, m.employee_code].some((v) => v?.toLowerCase().includes(term)));

  return (
    <Screen refreshing={team.isRefetching} onRefresh={() => { void team.refetch(); void summary.refetch(); }}>
      {summary.data && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Stat label="Clocked in" value={`${summary.data.clocked_in}/${summary.data.total}`} icon="finger-print" tone="success" hint={summary.data.late ? `${summary.data.late} late` : undefined} />
          <Stat label="On leave" value={summary.data.on_leave} icon="airplane" tone="warning" hint={summary.data.pending_leave ? `${summary.data.pending_leave} pending` : undefined} />
        </View>
      )}
      <Input value={q} onChangeText={setQ} placeholder="Search team" autoCorrect={false} />
      {team.isLoading ? <Loading /> : (
        <Card style={{ paddingVertical: 2 }}>
          {members.map((m, i) => {
            const p = presenceLabel(presence[m.id]);
            return (
              <View key={m.id}>
                {i > 0 && <Divider />}
                <ListItem
                  title={m.name}
                  subtitle={[ROLE_LABELS[m.roles?.[0] ?? ''], m.employee_code].filter(Boolean).join(' · ')}
                  left={<Avatar name={m.name} color={m.color} size={42} />}
                  right={m.is_active ? <Badge label={p.label} tone={p.tone} /> : <Badge label="Inactive" />}
                  onPress={() => router.push(`/staff/${m.id}`)}
                />
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
