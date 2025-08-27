import { showErrorAlert } from "@/components/ShowAlert";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { supabase } from "../../services/supabase-init";

export default function TeacherSignIn() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = /\S+@\S+\.\S+/.test(email.trim()) && pw.length >= 8 && !busy;

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
      if (role !== "teacher") {
        await supabase.auth.signOut();
        throw new Error("This account is not a teacher account.");
      }

    } catch (e: any) {
      showErrorAlert(e?.message ?? "Sign in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 8 }}>Teacher Sign In</Text>

      <Text>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="teacher@school.org"
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
        style={{ marginTop: 16, padding: 16, backgroundColor: "#222", borderRadius: 12, opacity: canSubmit ? 1 : 0.5 }}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>Sign In</Text>}
      </Pressable>
      <Pressable onPress={() => router.replace("/teacher-signup")} style={{ marginTop: 12 }}>
        <Text style={{ textAlign: "center", color: "#0a7", fontWeight: "600" }}>New teacher? Create an account</Text>
      </Pressable>
      
      <Pressable onPress={() => router.replace("/parent-signin")} style={{ marginTop: 8 }}>
        <Text style={{ textAlign: "center", color: "#0a7", fontWeight: "600" }}>Parent? Sign in here</Text>
      </Pressable>
      
      <Pressable onPress={() => router.replace("/signin")} style={{ marginTop: 8 }}>
        <Text style={{ textAlign: "center", color: "#0a7", fontWeight: "600" }}>Student? Sign in here</Text>
      </Pressable>
    </View>
  );
}
