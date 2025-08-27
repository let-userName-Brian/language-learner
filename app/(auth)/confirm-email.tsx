import { supabase } from "@/services/supabase-init";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export default function ConfirmEmail() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [checking, setChecking] = useState(false);

  // Optional: ping every few seconds to see if they confirmed, then continue
  const check = async () => {
    setChecking(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/home");
        return;
      }
      // attempt sign-in again (if they just confirmed)
      if (email) {
        // don't know their password here; teacher will go to sign-in manually
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={{ flex:1, justifyContent:"center", alignItems:"center", padding:16, gap:12 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", textAlign: "center" }}>
        Please confirm your email
      </Text>
      <Text style={{ textAlign:"center", color:"#666" }}>
        We sent a confirmation link to{ " " }
        <Text style={{ fontWeight:"700" }}>{email ?? "your email"}</Text>.
        Open it, then return to the app and tap Continue.
      </Text>

      <Pressable
        onPress={() => router.replace("/teacher-signin")}
        style={{ marginTop:16, padding:12, backgroundColor:"#0a7", borderRadius:10 }}
      >
        <Text style={{ color:"#fff", fontWeight:"700" }}>Continue to Sign In</Text>
      </Pressable>

      <Pressable
        onPress={check}
        style={{ marginTop:8, padding:10, backgroundColor:"#eee", borderRadius:10 }}
      >
        {checking ? <ActivityIndicator /> : <Text>Check again</Text>}
      </Pressable>
    </View>
  );
}
