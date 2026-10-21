import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { Badge, Card, Divider, IconButton, Loading, Row, Screen, Stat, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { dayLabel, hoursMinutes, time12, todayIn } from '@/lib/format';
import type { Tone } from '@/lib/theme';

interface Register {
  rows: { user: { id: number }; summary: { present: number; absent: number; leave: number; late: number; minutes: number; unmarked: number }; cells: Record<string, { status: string | null; check_in: string | null; check_out: string | null; minutes: number | null; is_late: boolean; check_in_distance_m?: number | null }> }[];
}

const TONES: Record<string, Tone> = { present: 'success', half_day: 'warning', absent: 'danger', leave: 'info', holiday: 'violet', off: 'neutral', unmarked: 'neutral' };
const LABELS: Record<string, string> = { present: 'Present', half_day: 'Half day', absent: 'Absent', leave: 'Leave', holiday: 'Holiday', off: 'Weekly off', unmarked: 'Not marked' };

function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export default function AttendanceScreen() {
  const s = useSession();
  const current = todayIn(s.tenant.timezone).slice(0, 7);
  const [month, setMonth] = useState(current);
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['attendance', 'history', month],
    queryFn: async () => (await api.get<{ data: Register }>('/attendance', { month, user_id: s.user.id })).data,
  });

  const row = data?.rows.find((r) => r.user.id === s.user.id) ?? data?.rows[0];
  const days = Object.entries(row?.cells ?? {}).filter(([, c]) => c.status).reverse();
  const label = new Date(`${month}-01T00:00:00Z`).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <Screen refreshing={isRefetching} onRefresh={() => void refetch()}>
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton icon="chevron-back" label="Previous month" onPress={() => setMonth(shiftMonth(month, -1))} />
        <T kind="heading">{label}</T>
        <IconButton icon="chevron-forward" label="Next month" onPress={() => month < current && setMonth(shiftMonth(month, 1))} />
      </Row>
      {isLoading || !row ? <Loading /> : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Stat label="Days present" value={row.summary.present} icon="checkmark-circle" tone="success" />
            <Stat label="Hours worked" value={Math.round(row.summary.minutes / 60)} icon="time" tone="info" />
            <Stat label="Late arrivals" value={row.summary.late} icon="alarm" tone="warning" />
            <Stat label="Leave / absent" value={`${row.summary.leave} / ${row.summary.absent}`} icon="airplane" tone="violet" />
          </View>
          <Card style={{ paddingVertical: 4 }}>
            {days.map(([date, c], i) => (
              <View key={date}>
                {i > 0 && <Divider />}
                <Row style={{ paddingVertical: 11 }}>
                  <View style={{ flex: 1 }}>
                    <T kind="label">{dayLabel(date)}</T>
                    <T kind="small">
                      {c.check_in ? `${time12(c.check_in)} – ${c.check_out ? time12(c.check_out) : 'now'}` : '—'}
                      {c.minutes ? ` · ${hoursMinutes(c.minutes)}` : ''}
                    </T>
                    {c.check_in_distance_m != null && (
                      <Row gap={4}><Ionicons name="location-outline" size={12} color="#8A979C" /><T kind="small" style={{ fontSize: 12 }}>{c.check_in_distance_m} m from clinic</T></Row>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Badge label={LABELS[c.status!] ?? c.status!} tone={TONES[c.status!] ?? 'neutral'} />
                    {c.is_late && <Badge label="Late" tone="danger" />}
                  </View>
                </Row>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
