import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TeacherLayout() {
  return (
    <Tabs screenOptions={{ 
      headerShown: false, 
      tabBarShowLabel: false,
      tabBarStyle: {
        height: 60, // Set consistent height
        paddingBottom: 8, // Add bottom padding for better centering
        paddingTop: 8, // Add top padding for better centering
      },
      tabBarIconStyle: {
        marginTop: 0, // Reset any default margin
      }
    }}>
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
    </Tabs>
  );
}