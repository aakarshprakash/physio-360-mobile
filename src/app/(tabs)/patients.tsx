import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Avatar, Card, Divider, Empty, Input, ListItem, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { colors, shadow } from '@/lib/theme';
import type { PatientSummary } from '@/lib/types';

interface Page { data: (PatientSummary & { city?: string | null })[]; meta: { current_page: number; last_page: number; total: number } }

export default function PatientsScreen() {
  const s = useSession();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setSearch(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  const list = useInfiniteQuery({
    queryKey: ['patients', search],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => api.get<Page>('/patients', { search: search || undefined, page: pageParam, per_page: 25, sort: search ? undefined : '-created_at' }),
    getNextPageParam: (last) => (last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined),
  });
  const rows = list.data?.pages.flatMap((p) => p.data) ?? [];
  const total = list.data?.pages[0]?.meta.total;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: 16, paddingBottom: 8, gap: 6 }}>
        <View>
          <Input value={q} onChangeText={setQ} placeholder="Search name, phone or MRN" autoCorrect={false} returnKeyType="search" accessibilityLabel="Search patients" style={{ paddingLeft: 42 }} />
          <Ionicons name="search" size={18} color={colors.subtle} style={{ position: 'absolute', left: 14, top: 15 }} />
        </View>
        {total != null && <T kind="small">{total} patient{total === 1 ? '' : 's'}{search ? ` matching “${search}”` : ''}</T>}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} tintColor={colors.primary} />}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && void list.fetchNextPage()}
        onEndReachedThreshold={0.4}
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={list.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : <Card><Empty icon="people-outline" title="No patients found" body={search ? 'Try a different name or number.' : 'Register your first patient.'} /></Card>}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ margin: 16 }} /> : undefined}
        renderItem={({ item }) => (
          <ListItem
            title={item.full_name}
            subtitle={[item.mrn, item.age ? `${item.age} yrs` : null, item.gender, item.phone].filter(Boolean).join(' · ')}
            left={<Avatar name={item.full_name} size={44} color="#3E8E76" />}
            onPress={() => router.push(`/patient/${item.id}`)}
          />
        )}
      />
      {s.can('patients.manage') && (
        <Pressable onPress={() => router.push('/patient/new')} accessibilityLabel="New patient" accessibilityRole="button"
          style={({ pressed }) => ({ position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1, ...shadow, shadowOpacity: 0.25 })}>
          <Ionicons name="person-add" size={24} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}
