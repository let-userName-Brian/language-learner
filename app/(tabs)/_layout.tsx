import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="parent" options={{ title: "Parent Mode" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      {/* lesson/[id] is not a tab button; it will still render inside this stack */}
      <Tabs.Screen
        name="lesson/[id]"
        options={{ href: null, title: "Lesson" }}
      />
    </Tabs>
  );
}
