import { showErrorAlert } from "@/components/ShowAlert";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../services/supabase-init";

function normalizeName(n: string) {
  return n.replace(/\s+/g, " ").trim();
}

export default function SignIn() {
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) router.replace("/home");
      } catch (e) {
        console.log("signin error", e);
      }
    })();
  }, []);

  const canSubmit = useMemo(() => {
    const idOk = /^\d{3,}$/.test(studentId.trim());
    const nameOk = normalizeName(name).length >= 2;
    return idOk && nameOk && !busy;
  }, [studentId, name, busy]);

  const doSignIn = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const id = studentId.trim();
      const nmDisplay = normalizeName(name);
      const nmLower = nmDisplay.toLowerCase();

      // 1) Try to resolve the school slug from student profile
      let schoolSlug: string | null = null;
      try {
        // Look up student by ID to get their school
        const { data: studentData } = await supabase
          .from("user_profiles")
          .select(`
            school_id,
            schools:schools(slug)
          `)
          .eq("student_id", id)
          .eq("role", "student")
          .eq("display_name", nmDisplay)
          .maybeSingle();
        
        if (studentData?.schools?.[0]?.slug) {
          schoolSlug = studentData.schools[0].slug;
        }
      } catch {
        // Fallback if lookup fails
      }

      // 2) Build creds (prefer resolved slug; otherwise MVP default)
      const slug = schoolSlug ?? "mountdesales";
      const email = `${id}+${slug}@example.org`;
      const password = `${slug}:${id}:${nmLower}`;

      // 3) Sign in
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        // Show clearer guidance for common cases
        const msg =
          error.code === "invalid_credentials"
            ? "Check your Student ID and the exact spelling of your name."
            : error.message || "Sign in failed.";
        throw new Error(msg);
      }
    } catch (e: any) {
      showErrorAlert(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 8 }}>
        Student Sign In
      </Text>

      <Text>Student ID</Text>
      <TextInput
        value={studentId}
        onChangeText={(t) => setStudentId(t.replace(/[^\d]/g, ""))}
        keyboardType="number-pad"
        placeholder="e.g., 16345"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
        }}
      />

      <Text>Full Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g., Emma Smith"
        autoCapitalize="words"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
        }}
      />

      <Pressable
        onPress={doSignIn}
        disabled={!canSubmit}
        style={{
          marginTop: 16,
          padding: 16,
          backgroundColor: "#222",
          borderRadius: 12,
          opacity: canSubmit ? 1 : 0.5,
        }}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text
            style={{ color: "white", textAlign: "center", fontWeight: "600" }}
          >
            Sign In
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => router.push("/teacher-signup")}>
        <Text style={{ textAlign: "center", color: "#0a7", fontWeight: "600" }}>
          New teacher? Create an account
        </Text>
      </Pressable>
      <Pressable
        onPress={() => router.replace("/parent-signin")}
        style={{ marginTop: 12 }}
      >
        <Text style={{ textAlign: "center", color: "#0a7", fontWeight: "600" }}>
          Parent? Sign in here
        </Text>
      </Pressable>
      
      <Pressable
        onPress={() => router.replace("/teacher-signin")}
        style={{ marginTop: 8 }}
      >
        <Text style={{ textAlign: "center", color: "#0a7", fontWeight: "600" }}>
          Teacher? Sign in here
        </Text>
      </Pressable>
    </View>
  );
}
