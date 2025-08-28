import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TeacherLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="apps-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="roster"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="student/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
