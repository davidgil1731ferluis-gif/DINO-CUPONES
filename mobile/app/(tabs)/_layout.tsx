import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/src/theme';

const icon = (value: string, color: string) => <Text style={{ fontSize: 19, color }}>{value}</Text>;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.purple,
        tabBarInactiveTintColor: '#9C8CA0',
        tabBarStyle: {
          height: 74,
          paddingTop: 7,
          paddingBottom: 9,
          backgroundColor: '#FFFDFE',
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
      }}
    >
      <Tabs.Screen name="coupons" options={{ title: 'Cupones', tabBarIcon: ({ color }) => icon('🎟️', color) }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat', tabBarIcon: ({ color }) => icon('💬', color) }} />
      <Tabs.Screen name="gift" options={{ title: 'Regalar', tabBarIcon: ({ color }) => icon('🎁', color) }} />
      <Tabs.Screen name="mural" options={{ title: 'Mural', tabBarIcon: ({ color }) => icon('📸', color) }} />
      <Tabs.Screen name="us" options={{ title: 'Nosotros', tabBarIcon: ({ color }) => icon('💞', color) }} />
    </Tabs>
  );
}
