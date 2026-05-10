import { Stack } from 'expo-router';

export default function GroupCreateLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="invite" />
      <Stack.Screen name="share" />
    </Stack>
  );
}
