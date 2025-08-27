import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TeacherLayout() {
  const renderHomeIcon = ({ color, size }: { color: string; size: number }) => (
    <Ionicons name="home" size={size} color={color} />
  );
  
  const renderRosterIcon = ({ color, size }: { color: string; size: number }) => (
    <Ionicons name="people" size={size} color={color} />
  );
  
  const renderSettingsIcon = ({ color, size }: { color: string; size: number }) => (
    <Ionicons name="settings" size={size} color={color} />
  );

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen 
        name="home" 
        options={{ 
          title: "Home",
          tabBarIcon: renderHomeIcon,
        }} 
      />
      <Tabs.Screen 
        name="roster" 
        options={{ 
          title: "Roster",
          tabBarIcon: renderRosterIcon,
        }} 
      />
      <Tabs.Screen 
        name="settings" 
        options={{ 
          title: "Settings",
          tabBarIcon: renderSettingsIcon,
        }} 
      />
    </Tabs>
  );
}