import { showErrorAlert } from "@/components/ShowAlert";
import { supabase } from "@/services/supabase-init";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";

export default function ParentSettings() {
  const [signing_out, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              setSigningOut(true);
              await supabase.auth.signOut();
              router.replace("/(auth)/signin");
            } catch (error: any) {
              showErrorAlert(error?.message ?? "Sign out failed");
            } finally {
              setSigningOut(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 20 }}>
        Settings
      </Text>

      <View style={{ gap: 12 }}>
        <View style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
            About Parent Access
          </Text>
          <Text style={{ fontSize: 14, color: "#666", lineHeight: 20 }}>
            As a parent, you can view your children's progress, see which lessons they've completed, 
            and track their learning journey. If you need to link additional children to your account, 
            please contact your child's teacher.
          </Text>
        </View>

        <View style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
            Support
          </Text>
          <Text style={{ fontSize: 14, color: "#666", lineHeight: 20 }}>
            If you have questions about your child's progress or need help with the app, 
            please reach out to your child's teacher or school administrator.
          </Text>
        </View>

        <Pressable
          onPress={handleSignOut}
          disabled={signing_out}
          style={{
            backgroundColor: "#dc3545",
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 20,
            opacity: signing_out ? 0.7 : 1,
          }}
        >
          {signing_out ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              Sign Out
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
