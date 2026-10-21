import { View } from 'react-native';
import { STATUS_LABELS, time12 } from '@/lib/format';
import { colors, type Tone } from '@/lib/theme';
import type { Appointment } from '@/lib/types';
import { Badge, Card, Row, T } from './ui';

export const STATUS_TONES: Record<string, Tone> = {
  scheduled: 'info', confirmed: 'primary', checked_in: 'violet', in_progress: 'warning', completed: 'success', cancelled: 'neutral', no_show: 'danger',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge label={STATUS_LABELS[status] ?? status} tone={STATUS_TONES[status] ?? 'neutral'} />;
}

/** One appointment in a day list: time rail, patient, service and status. */
export function AppointmentCard({ a, onPress, showPractitioner = true }: { a: Appointment; onPress?: () => void; showPractitioner?: boolean }) {
  const dim = a.status === 'cancelled' || a.status === 'no_show';
  return (
    <Card onPress={onPress} style={{ padding: 0, overflow: 'hidden', opacity: dim ? 0.6 : 1 }}>
      <Row gap={0} style={{ alignItems: 'stretch' }}>
        <View style={{ width: 5, backgroundColor: a.practitioner?.color ?? colors.primary }} />
        <View style={{ width: 78, paddingVertical: 14, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border }}>
          <T kind="subheading">{time12(a.local_start).replace(' ', '\n')}</T>
          <T kind="small" style={{ fontSize: 11, marginTop: 2 }}>{a.duration_minutes} min</T>
        </View>
        <View style={{ flex: 1, padding: 12, gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T kind="subheading" numberOfLines={1} style={{ flex: 1 }}>{a.patient?.full_name ?? 'Patient'}</T>
            <StatusBadge status={a.status} />
          </Row>
          <T kind="small" numberOfLines={1}>
            {[a.service?.name, showPractitioner ? a.practitioner?.name : null, a.room?.name].filter(Boolean).join(' · ')}
          </T>
          {a.booked_via === 'online' && <Badge label="Booked online" tone="info" icon="globe-outline" />}
        </View>
      </Row>
    </Card>
  );
}
