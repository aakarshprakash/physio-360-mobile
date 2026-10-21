import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { api, ApiError, errorText } from '@/lib/api';
import { hoursMinutes, time12 } from '@/lib/format';
import { currentFix, distanceMeters, humanDistance, type Fix } from '@/lib/location';
import { colors } from '@/lib/theme';
import type { AttendanceToday } from '@/lib/types';
import { Badge, Button, Card, Row, T } from './ui';

/**
 * Today's attendance with geofenced punch in / out. When the clinic enforces
 * the geofence the phone's GPS fix is sent and checked by the server; the card
 * shows how far the person is from the nearest branch before they tap.
 */
export function ClockCard() {
  const queryClient = useQueryClient();
  const [fix, setFix] = useState<Fix | null>(null);
  const { data } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: async () => (await api.get<{ data: AttendanceToday }>('/attendance/today')).data,
    refetchInterval: 60_000,
  });

  const punch = useMutation({
    mutationFn: async (action: 'in' | 'out') => {
      let where: Fix | null = null;
      // Always try for a fix when geofenced; otherwise it is optional (best effort).
      try {
        where = await currentFix();
        setFix(where);
      } catch (e) {
        if (data?.geofence.required) throw e;
      }
      const body = { ...(where ?? {}), device: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web' };
      return (await api.post<{ data: AttendanceToday }>(action === 'in' ? '/attendance/check-in' : '/attendance/check-out', body)).data;
    },
    onSuccess: (today, action) => {
      queryClient.setQueryData(['attendance', 'today'], today);
      void queryClient.invalidateQueries({ queryKey: ['attendance', 'history'] });
      Alert.alert(action === 'in' ? 'Clocked in' : 'Clocked out', action === 'in' ? `Have a great day! In at ${time12(today.check_in)}.` : `Worked ${hoursMinutes(today.minutes_worked)} today.`);
    },
    onError: (e) => {
      const title = e instanceof ApiError && e.code === 'outside_geofence' ? 'Not at the clinic' : 'Could not clock in';
      Alert.alert(title, errorText(e));
    },
  });

  if (!data) return <Card style={{ height: 120 }}><T kind="muted">Loading your day…</T></Card>;

  const nearest = fix && data.geofence.sites.length
    ? data.geofence.sites.map((s) => ({ s, d: distanceMeters(fix, s) })).sort((a, b) => a.d - b.d)[0]
    : null;
  const onLeave = data.on_leave === 'full' ? 'On leave today' : data.on_leave ? 'Half-day leave today' : null;
  const working = data.check_in && !data.check_out;

  return (
    <Card style={{ gap: 14, backgroundColor: colors.ink, borderColor: colors.ink }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={working ? 'timer' : 'finger-print'} size={22} color={colors.mint} />
          </View>
          <View>
            <T kind="small" style={{ color: '#B9CCC6' }}>My day</T>
            <T kind="subheading" style={{ color: '#fff' }}>
              {data.check_in ? `In at ${time12(data.check_in)}` : onLeave ?? 'Not clocked in yet'}
              {data.check_out ? ` · Out ${time12(data.check_out)}` : ''}
            </T>
          </View>
        </Row>
        {data.is_late && <Badge label="Late" tone="warning" />}
      </Row>

      {data.minutes_worked != null && <T kind="small" style={{ color: '#B9CCC6' }}>Worked {hoursMinutes(data.minutes_worked)}</T>}

      {data.geofence.required && (
        <Row>
          <Ionicons name="location" size={14} color={colors.mint} />
          <T kind="small" style={{ color: '#B9CCC6', flex: 1 }}>
            {nearest
              ? `${humanDistance(nearest.d)} from ${nearest.s.name} · allowed within ${nearest.s.radius_m} m`
              : 'Clock-in uses your location (must be at your branch).'}
          </T>
        </Row>
      )}

      {data.can_check_in ? (
        <Button title="Clock in" icon="log-in-outline" loading={punch.isPending} onPress={() => punch.mutate('in')} style={{ backgroundColor: colors.mint, borderColor: colors.mint }} />
      ) : data.can_check_out ? (
        <Button title="Clock out" icon="log-out-outline" variant="outline" loading={punch.isPending} onPress={() => punch.mutate('out')} />
      ) : (
        <Row><Ionicons name="checkmark-circle" size={18} color={colors.mint} /><T kind="small" style={{ color: '#B9CCC6' }}>Day complete. See you tomorrow!</T></Row>
      )}
    </Card>
  );
}
