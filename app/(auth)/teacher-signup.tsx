import { AccessiblePicker } from "@/components/AccessiblePicker";
import { showErrorAlert, showSuccessAlert } from "@/components/ShowAlert";
import { supabase } from "@/services/supabase-init";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

type School = { id: string; slug: string; name: string };

export default function TeacherSignUp() {
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolSlug, setSchoolSlug] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  // Load schools for picker
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("schools")
          .select("id,slug,name")
          .order("name");
        if (error) throw error;
        const rows = (data || []) as School[];
        setSchools(rows);
        if (rows.length) setSchoolSlug(rows[0].slug);
      } catch {
        const fallback = [
          { id: "fallback", slug: "mountdesales", name: "Mount DeSales" },
        ];
        setSchools(fallback);
        setSchoolSlug(fallback[0].slug);
      }
    })();
  }, []);

  const canSubmit = useMemo(() => {
    const firstNameOk = firstName.trim().length >= 1;
    const lastNameOk = lastName.trim().length >= 1;
    const emOk = /\S+@\S+\.\S+/.test(email.trim());
    const pwOk = pw.length >= 8 && pw === pw2;
    const schoolOk = !!schoolSlug.trim();
    return firstNameOk && lastNameOk && emOk && pwOk && schoolOk && !busy;
  }, [firstName, lastName, email, pw, pw2, schoolSlug, busy]);

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const first_name = firstName.trim();
      const last_name = lastName.trim();
      const display_name = `${first_name} ${last_name}`;
      const school_slug = schoolSlug.trim();
      const emailTrim = email.trim();

      // 1) Sign up (teacher uses real email/password)
      const { error: signUpErr } = await supabase.auth.signUp({
        email: emailTrim,
        password: pw,
        options: { data: { role: "teacher", display_name, school_slug } },
      });
      if (signUpErr) throw signUpErr;

      // 2) Ensure session. If email confirmations are ON, we won't have one yet.
      let { data: sess } = await supabase.auth.getSession();

      if (!sess?.session) {
        const { error: siErr } = await supabase.auth.signInWithPassword({
          email: emailTrim,
          password: pw,
        });
        if (siErr) {
          // Likely "email not confirmed" → send to confirm screen
          if (
            (siErr.message || "").toLowerCase().includes("email not confirmed")
          ) {
            router.replace({
              pathname: "/confirm-email",
              params: { email: emailTrim },
            });
            return;
          }
          throw siErr;
        }
        ({ data: sess } = await supabase.auth.getSession());
      }

      // 3) We must have a user at this point
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Auth succeeded, but no user in session.");

      // 4) (Optional) Resolve school_id if you need it right now for UI defaults
      //     You can keep this, or skip if not needed here.
      const { data: schoolRow, error: sErr } = await supabase
        .from("schools")
        .select("id")
        .eq("slug", school_slug)
        .single();
      if (sErr) throw sErr;
      const school_id = schoolRow.id;

      // 5) IMPORTANT: Call the SECURITY DEFINER RPC instead of direct upserts
      const { error: rpcErr } = await supabase.rpc("ensure_teacher_profile", {
        p_first_name: first_name,
        p_last_name: last_name,
        p_display_name: display_name,
        p_school_id: school_id,
      });
      if (rpcErr) throw rpcErr;

      showSuccessAlert("Teacher account created. Welcome!", () =>
        router.replace("/(teacher)/home")
      );
    } catch (e: any) {
      const msg =
        e?.message ||
        e?.error_description ||
        (typeof e === "string" ? e : "Sign up failed.");
      showErrorAlert(msg);
      console.log("teacher-signup error", e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 8 }}>
        Teacher Sign Up
      </Text>

      <Text>School</Text>
      <View style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8 }}>
        <AccessiblePicker
          selectedValue={schoolSlug}
          onValueChange={setSchoolSlug}
          items={schools.map((s) => ({ label: s.name, value: s.slug }))}
          accessibilityLabel="Select your school"
          placeholder="Choose your school"
        />
      </View>

      <Text>First Name</Text>
      <TextInput
        value={firstName}
        onChangeText={setFirstName}
        placeholder="e.g., Jordan"
        autoCapitalize="words"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
        }}
      />

      <Text>Last Name</Text>
      <TextInput
        value={lastName}
        onChangeText={setLastName}
        placeholder="e.g., Smith"
        autoCapitalize="words"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
        }}
      />

      <Text>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="teacher@school.org"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
        }}
      />

      <Text>Password</Text>
      <TextInput
        value={pw}
        onChangeText={setPw}
        placeholder="At least 8 characters"
        secureTextEntry
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
        }}
      />

      <Text>Confirm Password</Text>
      <TextInput
        value={pw2}
        onChangeText={setPw2}
        secureTextEntry
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
        }}
      />

      <Pressable
        onPress={submit}
        disabled={!canSubmit}
        style={{
          marginTop: 16,
          padding: 16,
          backgroundColor: "#0a7",
          borderRadius: 12,
          opacity: canSubmit ? 1 : 0.5,
        }}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text
            style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}
          >
            Create Teacher Account
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => router.replace("/teacher-signin")}
        style={{ marginTop: 12 }}
      >
        <Text style={{ textAlign: "center", color: "#0a7", fontWeight: "600" }}>
          Already have a teacher account? Sign in
        </Text>
      </Pressable>
      <Pressable
        onPress={() => router.replace("/signin")}
        style={{ marginTop: 12 }}
      >
        <Text style={{ textAlign: "center", color: "#0a7", fontWeight: "600" }}>
          Go back to student signin
        </Text>
      </Pressable>
    </View>
  );
}