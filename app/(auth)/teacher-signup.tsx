import { AccessiblePicker } from "@/components/AccessiblePicker";
import { showErrorAlert, showSuccessAlert } from "@/components/ShowAlert";
import { supabase } from "@/services/supabase-init";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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
    <ScrollView 
      style={{ flex: 1, backgroundColor: "#f8f9fa" }}
      contentContainerStyle={{ 
        padding: 24,
        paddingTop: 60,
      }}
    >
      {/* Header */}
      <View style={{ 
        alignItems: "center", 
        marginBottom: 40 
      }}>
        <View style={{
          width: 80,
          height: 80,
          backgroundColor: "#2196F3",
          borderRadius: 40,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 20,
          shadowColor: "#2196F3",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}>
          <Text style={{ fontSize: 36, color: "white" }}>🎓</Text>
        </View>
        
        <Text style={{ 
          fontSize: 28, 
          fontWeight: "700", 
          color: "#212529",
          marginBottom: 8,
          textAlign: "center"
        }}>
          Join as Teacher
        </Text>
        
        <Text style={{ 
          fontSize: 16, 
          color: "#6c757d",
          textAlign: "center",
          lineHeight: 22
        }}>
          Create your educator account
        </Text>
      </View>

      {/* Form Container */}
      <View style={{
        backgroundColor: "white",
        borderRadius: 16,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 24,
      }}>
        {/* School Selection */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: "600", 
            color: "#212529",
            marginBottom: 8 
          }}>
            School
          </Text>
          <View style={{ 
            borderWidth: 2, 
            borderColor: schoolSlug ? "#2196F3" : "#e9ecef", 
            borderRadius: 12,
            backgroundColor: "#f8f9fa",
          }}>
            <AccessiblePicker
              selectedValue={schoolSlug}
              onValueChange={setSchoolSlug}
              items={schools.map((s) => ({ label: s.name, value: s.slug }))}
              accessibilityLabel="Select your school"
              placeholder="Choose your school"
            />
          </View>
        </View>

        {/* Name Fields Row */}
        <View style={{ 
          flexDirection: "row", 
          gap: 12, 
          marginBottom: 20 
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ 
              fontSize: 16, 
              fontWeight: "600", 
              color: "#212529",
              marginBottom: 8 
            }}>
              First Name
            </Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Jordan"
              autoCapitalize="words"
              style={{
                borderWidth: 2,
                borderColor: firstName ? "#2196F3" : "#e9ecef",
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                backgroundColor: "#f8f9fa",
              }}
            />
          </View>
          
          <View style={{ flex: 1 }}>
            <Text style={{ 
              fontSize: 16, 
              fontWeight: "600", 
              color: "#212529",
              marginBottom: 8 
            }}>
              Last Name
            </Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Smith"
              autoCapitalize="words"
              style={{
                borderWidth: 2,
                borderColor: lastName ? "#2196F3" : "#e9ecef",
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                backgroundColor: "#f8f9fa",
              }}
            />
          </View>
        </View>

        {/* Email Field */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: "600", 
            color: "#212529",
            marginBottom: 8 
          }}>
            Email Address
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="teacher@school.org"
            style={{
              borderWidth: 2,
              borderColor: email ? "#2196F3" : "#e9ecef",
              borderRadius: 12,
              padding: 16,
              fontSize: 16,
              backgroundColor: "#f8f9fa",
            }}
          />
        </View>

        {/* Password Fields */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: "600", 
            color: "#212529",
            marginBottom: 8 
          }}>
            Password
          </Text>
          <TextInput
            value={pw}
            onChangeText={setPw}
            placeholder="At least 8 characters"
            secureTextEntry
            style={{
              borderWidth: 2,
              borderColor: pw ? "#2196F3" : "#e9ecef",
              borderRadius: 12,
              padding: 16,
              fontSize: 16,
              backgroundColor: "#f8f9fa",
            }}
          />
        </View>

        <View style={{ marginBottom: 24 }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: "600", 
            color: "#212529",
            marginBottom: 8 
          }}>
            Confirm Password
          </Text>
          <TextInput
            value={pw2}
            onChangeText={setPw2}
            placeholder="Re-enter your password"
            secureTextEntry
            style={{
              borderWidth: 2,
              borderColor: pw2 && pw === pw2 ? "#4CAF50" : pw2 && pw !== pw2 ? "#f44336" : "#e9ecef",
              borderRadius: 12,
              padding: 16,
              fontSize: 16,
              backgroundColor: "#f8f9fa",
            }}
          />
          {pw2 && pw !== pw2 && (
            <Text style={{ 
              color: "#f44336", 
              fontSize: 12, 
              marginTop: 4,
              marginLeft: 4
            }}>
              Passwords don't match
            </Text>
          )}
        </View>

        {/* Create Account Button */}
        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={{
            padding: 18,
            backgroundColor: canSubmit ? "#2196F3" : "#e9ecef",
            borderRadius: 12,
            shadowColor: canSubmit ? "#2196F3" : "transparent",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: canSubmit ? 4 : 0,
          }}
        >
          {busy ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text
              style={{ 
                color: canSubmit ? "white" : "#6c757d", 
                textAlign: "center", 
                fontWeight: "700",
                fontSize: 16
              }}
            >
              Create Teacher Account
            </Text>
          )}
        </Pressable>
      </View>

      {/* Portal Selector */}
      <View style={{
        backgroundColor: "white",
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}>
        <Text style={{ 
          fontSize: 16, 
          fontWeight: "600", 
          color: "#212529",
          textAlign: "center",
          marginBottom: 16
        }}>
          Already have an account?
        </Text>
        
        <View style={{ gap: 8 }}>
          <Pressable
            onPress={() => router.replace("/teacher-signin")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderRadius: 8,
              backgroundColor: "#f8f9fa",
            }}
          >
            <View style={{
              width: 40,
              height: 40,
              backgroundColor: "#2196F3",
              borderRadius: 20,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}>
              <Text style={{ fontSize: 20, color: "white" }}>🎓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#212529" }}>
                Teacher Sign In
              </Text>
              <Text style={{ fontSize: 13, color: "#6c757d" }}>
                Access existing account
              </Text>
            </View>
            <Text style={{ color: "#6c757d", fontSize: 16 }}>→</Text>
          </Pressable>
          
          <Pressable
            onPress={() => router.replace("/signin")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderRadius: 8,
              backgroundColor: "#f8f9fa",
            }}
          >
            <View style={{
              width: 40,
              height: 40,
              backgroundColor: "#4CAF50",
              borderRadius: 20,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}>
              <Text style={{ fontSize: 20, color: "white" }}>📚</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#212529" }}>
                Student Portal
              </Text>
              <Text style={{ fontSize: 13, color: "#6c757d" }}>
                Continue your learning journey
              </Text>
            </View>
            <Text style={{ color: "#6c757d", fontSize: 16 }}>→</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}