import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DinoProvider } from '@/src/providers/DinoProvider';

export default function RootLayout() {
  return (
    <DinoProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </DinoProvider>
  );
}
