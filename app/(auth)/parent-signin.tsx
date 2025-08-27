import { showErrorAlert } from "@/components/ShowAlert";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { supabase } from "../../services/supabase-init";

export default function ParentSignIn() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = /\S+@\S+\.\S+/.test(email.trim()) && pw.length >= 1 && !busy;

  const doSignIn = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pw,
      });
      if (error) throw error;
      
      const user = (await supabase.auth.getUser()).data.user;
      const role = user?.user_metadata?.role;
      
      if (role !== "parent") {
        await supabase.auth.signOut();
        throw new Error("This account is not a parent account.");
      }
    } catch (e: any) {
      showErrorAlert(e?.message ?? "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 8 }}>Parent Sign In</Text>

      <Text>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="parent@email.com"
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 }}
      />

      <Text>Password</Text>
      <TextInput
        value={pw}
        onChangeText={setPw}
        secureTextEntry
        placeholder="Your password"
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 }}
      />

      <Pressable
        onPress={doSignIn}
        disabled={!canSubmit}
        style={{ marginTop: 16, padding: 16, backgroundColor: "#0066cc", borderRadius: 12, opacity: canSubmit ? 1 : 0.5 }}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>Sign In</Text>}
      </Pressable>
      
      <View style={{ marginTop: 20, padding: 16, backgroundColor: "#e8f4fd", borderRadius: 8 }}>
        <Text style={{ fontSize: 14, color: "#0066cc", textAlign: "center" }}>
          If you received an invitation email, click the link in that email to set up your account first.
        </Text>
      </View>
      
      <Pressable onPress={() => router.replace("/signin")} style={{ marginTop: 12 }}>
        <Text style={{ textAlign: "center", color: "#0a7", fontWeight: "600" }}>Student? Sign in here</Text>
      </Pressable>
      
      <Pressable onPress={() => router.replace("/teacher-signin")} style={{ marginTop: 8 }}>
        <Text style={{ textAlign: "center", color: "#0a7", fontWeight: "600" }}>Teacher? Sign in here</Text>
      </Pressable>
    </View>
  );
}
