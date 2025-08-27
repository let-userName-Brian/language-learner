import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function ParentTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen 
        name="home" 
        options={{ 
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="lessons" 
        options={{ 
          title: "Lessons",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="settings" 
        options={{ 
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }} 
      />
    </Tabs>
  );
}

