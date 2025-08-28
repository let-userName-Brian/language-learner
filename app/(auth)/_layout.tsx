import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="signin" options={{ title: "Sign In" }} />
      <Stack.Screen name="teacher-signup" options={{ title: "Sign Up" }} />
      <Stack.Screen name="teacher-signin" options={{ title: "Sign In" }} />
      <Stack.Screen name="parent-signin" options={{ title: "Sign In" }} />
    </Stack>
  );
}
