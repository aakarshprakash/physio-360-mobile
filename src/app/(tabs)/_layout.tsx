import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';
import type { IconName } from '@/components/ui';

function icon(name: IconName, focusedName: IconName) {
  function TabIcon({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <Ionicons name={focused ? focusedName : name} size={size} color={color as string} />;
  }
  return TabIcon;
}

/** Bottom tabs, shown according to the signed-in role's permissions. */
export default function TabsLayout() {
  const { can } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtle,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800', color: colors.ink, fontSize: 20 },
        headerTitleAlign: 'left',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false, tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule', tabBarIcon: icon('calendar-outline', 'calendar'), href: can('appointments.view') ? undefined : null }} />
      <Tabs.Screen name="patients" options={{ title: 'Patients', tabBarIcon: icon('people-outline', 'people'), href: can('patients.view') ? undefined : null }} />
      <Tabs.Screen name="team" options={{ title: 'My work', tabBarIcon: icon('briefcase-outline', 'briefcase') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('grid-outline', 'grid') }} />
    </Tabs>
  );
}
