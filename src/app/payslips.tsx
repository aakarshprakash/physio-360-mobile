import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, View } from 'react-native';
import { Card, Divider, Empty, ListItem, Loading, Screen } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { openRemoteFile } from '@/lib/files';
import { money } from '@/lib/format';
import { colors } from '@/lib/theme';

interface Payslip { id: number; period: string; net_minor: number; gross_minor: number; paid_days: number | string; run_status: string }

export default function PayslipsScreen() {
  const s = useSession();
  const { data, isLoading } = useQuery({ queryKey: ['payslips'], queryFn: async () => (await api.get<{ data: Payslip[] }>('/payroll/my-payslips')).data });

  if (isLoading) return <Loading />;
  return (
    <Screen>
      {(data ?? []).length === 0 ? <Card><Empty icon="document-text-outline" title="No payslips yet" body="Payslips appear here once payroll is finalised." /></Card> : (
        <Card style={{ paddingVertical: 2 }}>
          {(data ?? []).map((p, i) => {
            const label = new Date(`${p.period}-01T00:00:00Z`).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
            return (
              <View key={p.id}>
                {i > 0 && <Divider />}
                <ListItem
                  title={label}
                  subtitle={`Net ${money(p.net_minor, s.tenant.currency)} · ${Number(p.paid_days)} paid days · ${p.run_status === 'paid' ? 'Paid' : 'Finalised'}`}
                  left={<Ionicons name="document-text" size={26} color={colors.primary} />}
                  right={<Ionicons name="download-outline" size={20} color={colors.primary} />}
                  onPress={() => void openRemoteFile(`/payslips/${p.id}/pdf`, `payslip-${p.period}.pdf`).catch((e) => Alert.alert('Could not open payslip', errorText(e)))}
                />
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
